const { ApiError } = require('../middleware/error-handler');
const { logger: defaultLogger } = require('../logger');

const MAX_HISTORY_MESSAGES = 10;
const DEFAULT_TIMEOUT_MS = 45000;
const DEFAULT_MODEL = 'gemini-3.8-flash';
const MAX_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 250;
const RETRY_MAX_DELAY_MS = 2000;

function getHeader(response, name) {
  const headers = response.headers;
  if (typeof headers?.get === 'function') {
    return headers.get(name);
  }

  const entry = Object.entries(headers ?? {}).find(
    ([headerName]) => headerName.toLowerCase() === name.toLowerCase(),
  );
  return entry?.[1] ?? null;
}

function getRetryAfterMs(response) {
  const value = getHeader(response, 'retry-after');
  if (typeof value !== 'string' || value.trim() === '') {
    return null;
  }

  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.round(seconds * 1000);
  }

  const retryAt = Date.parse(value);
  return Number.isFinite(retryAt) ? Math.max(0, retryAt - Date.now()) : null;
}

function getBackoffDelayMs(attempt, random) {
  const exponentialDelay = Math.min(
    RETRY_MAX_DELAY_MS,
    RETRY_BASE_DELAY_MS * 2 ** (attempt - 1),
  );
  const jitter = Math.min(1, Math.max(0, random()));
  return Math.round(exponentialDelay * (0.5 + jitter * 0.5));
}

function safeProviderMessage(message, apiKey, sensitiveContent) {
  if (typeof message !== 'string') {
    return undefined;
  }

  let safeMessage = message.replace(/[\r\n\t]+/g, ' ').trim();
  if (apiKey) {
    safeMessage = safeMessage.split(apiKey).join('[REDACTED]');
  }
  safeMessage = safeMessage
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, '[REDACTED]')
    .replace(/Bearer\s+\S+/gi, 'Bearer [REDACTED]')
    .replace(/https?:\/\/\S+/gi, '[URL]');

  const lowerMessage = safeMessage.toLowerCase();
  const providerTokens = new Set(
    lowerMessage.match(/[\p{L}_-]{4,}|[\p{N}]{3,}/gu) ?? [],
  );
  const echoesRequestToken = sensitiveContent.some((content) => {
    if (typeof content !== 'string') {
      return false;
    }

    const requestTokens =
      content.toLowerCase().match(/[\p{L}_-]{4,}|[\p{N}]{3,}/gu) ?? [];
    return requestTokens.some((token) => providerTokens.has(token));
  });
  if (
    echoesRequestToken ||
    sensitiveContent.some(
      (content) =>
        typeof content === 'string' &&
        content.trim().length > 0 &&
        lowerMessage.includes(content.trim().toLowerCase()),
    )
  ) {
    return '[provider message omitted because it echoed request content]';
  }

  return safeMessage.slice(0, 300) || undefined;
}

async function readProviderError(response, apiKey, sensitiveContent) {
  let providerError;
  try {
    providerError = (await response.json())?.error;
  } catch {
    providerError = undefined;
  }

  const providerCode =
    typeof providerError?.status === 'string' &&
    /^[A-Z0-9_]{1,60}$/.test(providerError.status)
      ? providerError.status
      : typeof providerError?.code === 'string' &&
          /^[A-Z0-9_]{1,60}$/.test(providerError.code)
        ? providerError.code
        : undefined;
  const rawMessage =
    typeof providerError?.message === 'string' ? providerError.message : '';

  return {
    providerStatus: Number.isInteger(providerError?.code)
      ? providerError.code
      : response.status,
    providerCode,
    providerMessage: safeProviderMessage(
        rawMessage,
      apiKey,
      sensitiveContent,
    ),
    unsupportedModel:
        response.status === 404 ||
        (response.status === 400 &&
          (['MODEL_NOT_FOUND', 'MODEL_UNAVAILABLE'].includes(providerCode) ||
            /\bmodel\b.{0,80}\b(?:not found|unavailable|not available|unsupported|not supported)\b|\b(?:not found|unavailable|not available|unsupported|not supported)\b.{0,80}\bmodel\b/i.test(
              rawMessage,
            ))),
  };
}

function defaultSleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function attachProviderDetails(error, details) {
  error.providerStatus = details.providerStatus ?? null;
  error.providerCode = details.providerCode ?? null;
  return error;
}

class GeminiService {
  constructor({
    apiKey = '',
    model = DEFAULT_MODEL,
    fallbackModel = '',
    fetcher = globalThis.fetch,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    logger = defaultLogger,
    sleep = defaultSleep,
    random = Math.random,
  } = {}) {
    this.apiKey = typeof apiKey === 'string' ? apiKey.trim() : '';
    this.model =
      typeof model === 'string' && model.trim()
        ? model.trim()
        : DEFAULT_MODEL;
    this.fallbackModel =
      typeof fallbackModel === 'string' ? fallbackModel.trim() : '';
    this.fetcher = fetcher;
    this.timeoutMs = timeoutMs;
    this.logger = logger;
    this.sleep = sleep;
    this.random = random;
    this.logger.info(
      {
        configured: this.isConfigured(),
        model: this.model,
        fallbackModel: this.fallbackModel || null,
      },
      this.isConfigured()
        ? 'Gemini service initialized'
        : 'Gemini replies disabled: add a valid GEMINI_API_KEY from Google AI Studio',
    );
  }

  isConfigured() {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  formatHistory(messages = []) {
    // Apply context limit to history
    const recent = messages.slice(-MAX_HISTORY_MESSAGES);
    return recent.map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));
  }

  async listAvailableModels() {
    if (!this.isConfigured()) {
      throw new ApiError(
        503,
        'SERVICE_UNAVAILABLE',
        'Gemini model availability cannot be checked without an API key.',
      );
    }

    const models = [];
    let pageToken;
    for (let page = 0; page < 20; page++) {
      const url = new URL(
        'https://generativelanguage.googleapis.com/v1beta/models',
      );
      url.searchParams.set('pageSize', '100');
      if (pageToken) {
        url.searchParams.set('pageToken', pageToken);
      }

      let response;
      try {
        response = await this.fetcher(url, {
          method: 'GET',
          headers: { 'x-goog-api-key': this.apiKey },
          signal: AbortSignal.timeout(this.timeoutMs),
        });
      } catch (error) {
        this.logger.error(
          { errorType: error.name, operation: 'list_models' },
          'Gemini model listing failed',
        );
        throw new ApiError(
          502,
          'GEMINI_MODEL_LIST_FAILED',
          'Unable to verify Gemini model availability.',
        );
      }

      if (!response.ok) {
        const details = await readProviderError(response, this.apiKey, []);
        this.logger.error(
          { ...details, httpStatus: response.status, operation: 'list_models' },
          'Gemini model listing failed',
        );
        let error;
        if (response.status === 429) {
          error = new ApiError(
            429,
            'RATE_LIMIT_EXCEEDED',
            'Gemini quota or rate limit exceeded while checking models.',
          );
        } else if (response.status === 401 || response.status === 400) {
          error = new ApiError(
            503,
            'GEMINI_API_KEY_INVALID',
            'Gemini rejected the configured API key. Verify the key and its Gemini API access.',
          );
        } else if (response.status === 403) {
          error = new ApiError(
            503,
            'GEMINI_ACCESS_DENIED',
            'Gemini denied access to the configured API key.',
          );
        } else {
          error = new ApiError(
            502,
            'GEMINI_MODEL_LIST_FAILED',
            'Unable to verify Gemini model availability.',
          );
        }
        throw attachProviderDetails(error, details);
      }

      let data;
      try {
        data = await response.json();
      } catch {
        throw new ApiError(
          502,
          'GEMINI_MODEL_LIST_FAILED',
          'Gemini returned an unreadable model list.',
        );
      }
      if (!Array.isArray(data?.models)) {
        throw new ApiError(
          502,
          'GEMINI_MODEL_LIST_FAILED',
          'Gemini returned an invalid model list.',
        );
      }

      for (const model of data.models) {
        const name =
          typeof model?.name === 'string'
            ? model.name.replace(/^models\//, '')
            : '';
        if (!/^[a-zA-Z0-9._-]{1,100}$/.test(name)) {
          continue;
        }
        const supportedGenerationMethods = Array.isArray(
          model.supportedGenerationMethods,
        )
          ? model.supportedGenerationMethods.filter(
              (method) => typeof method === 'string',
            )
          : [];
        models.push({ name, supportedGenerationMethods });
      }

      pageToken = data.nextPageToken;
      if (!pageToken) {
        return models;
      }
    }

    throw new ApiError(
      502,
      'GEMINI_MODEL_LIST_FAILED',
      'Gemini model listing exceeded the supported page limit.',
    );
  }

  async generateReply({ history = [], userMessage }) {
    const result = await this.generateReplyWithMetadata({ history, userMessage });
    return result.text;
  }

  async generateReplyWithMetadata({
    history = [],
    userMessage,
    onAttempt,
  }) {
    if (!this.isConfigured()) {
      throw new ApiError(
        503,
        'SERVICE_UNAVAILABLE',
        'The AI service is temporarily unavailable. Please try again later.',
      );
    }

    if (!userMessage || typeof userMessage !== 'string' || userMessage.trim().length === 0) {
      throw new ApiError(400, 'INVALID_MESSAGE', 'User message content is required');
    }

    const contents = [
      ...this.formatHistory(history),
      {
        role: 'user',
        parts: [{ text: userMessage.trim() }],
      },
    ];

    const body = {
      systemInstruction: {
        parts: [
          {
            text: 'You are Hkili, a helpful, polite, and friendly Tunisian conversational AI assistant. You can speak Tunisian Derja, French, and English.',
          },
        ],
      },
      contents,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      },
    };

    const attempts = [];
    const reportAttempt = (attempt) => {
      const safeAttempt = Object.freeze({
        model: attempt.model,
        httpStatus: attempt.httpStatus ?? null,
        providerCode: attempt.providerCode ?? null,
        success: attempt.success === true,
        attempt: attempt.attempt,
      });
      attempts.push(safeAttempt);
      if (typeof onAttempt === 'function') {
        onAttempt(safeAttempt);
      }
    };

    try {
      const text = await this.generateForModel({
        model: this.model,
        body,
        history,
        userMessage,
        reportAttempt,
      });
      return {
        text,
        model: this.model,
        fallbackUsed: false,
        attempts,
      };
    } catch (error) {
      const canUseFallback =
        this.fallbackModel &&
        this.fallbackModel !== this.model &&
        ['SERVICE_UNAVAILABLE', 'GEMINI_MODEL_UNAVAILABLE'].includes(
          error.code,
        );
      if (!canUseFallback) {
        error.attempts = attempts;
        throw error;
      }

      this.logger.info(
        {
          primaryModel: this.model,
          fallbackModel: this.fallbackModel,
          primaryErrorCode: error.code,
        },
        'Gemini primary model unavailable; selecting configured fallback model',
      );
      try {
        const text = await this.generateForModel({
          model: this.fallbackModel,
          body,
          history,
          userMessage,
          reportAttempt,
        });
        return {
          text,
          model: this.fallbackModel,
          fallbackUsed: true,
          attempts,
        };
      } catch (fallbackError) {
        fallbackError.attempts = attempts;
        fallbackError.fallbackUsed = true;
        throw fallbackError;
      }
    }
  }

  async generateForModel({ model, body, history, userMessage, reportAttempt }) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      let response;
      try {
        response = await this.fetcher(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': this.apiKey,
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(this.timeoutMs),
        });
      } catch (error) {
        reportAttempt({
          model,
          httpStatus: null,
          providerCode: null,
          success: false,
          attempt,
        });
        if (error.name === 'TimeoutError' || error.name === 'AbortError') {
          this.logger.error(
            { errorType: error.name, model },
            'Gemini request timed out',
          );
          throw new ApiError(504, 'GATEWAY_TIMEOUT', 'AI response timed out');
        }
        this.logger.error(
          { errorType: error.name, model },
          'Gemini request failed to reach provider',
        );
        throw new ApiError(502, 'BAD_GATEWAY', 'Failed to generate AI response');
      }

      if (response.ok) {
        let data;
        try {
          data = await response.json();
        } catch {
          reportAttempt({
            model,
            httpStatus: response.status,
            providerCode: 'MALFORMED_RESPONSE',
            success: false,
            attempt,
          });
          this.logger.error(
            { status: response.status, model },
            'Gemini returned an unreadable response',
          );
          throw new ApiError(502, 'BAD_GATEWAY', 'Failed to parse AI response');
        }

        const candidate = data?.candidates?.[0];
        const replyText = candidate?.content?.parts?.[0]?.text;
        if (
          !replyText ||
          typeof replyText !== 'string' ||
          replyText.trim().length === 0
        ) {
          const blockReason = data?.promptFeedback?.blockReason;
          if (
            typeof blockReason === 'string' &&
            blockReason !== 'BLOCK_REASON_UNSPECIFIED'
          ) {
            reportAttempt({
              model,
              httpStatus: response.status,
              providerCode: 'AI_RESPONSE_BLOCKED',
              success: false,
              attempt,
            });
            this.logger.info(
              { blockReason, model },
              'Gemini declined the prompt',
            );
            throw new ApiError(
              422,
              'AI_RESPONSE_BLOCKED',
              'Gemini could not process this message. Please rephrase it.',
            );
          }
          reportAttempt({
            model,
            httpStatus: response.status,
            providerCode: 'MALFORMED_RESPONSE',
            success: false,
            attempt,
          });
          this.logger.error(
            { finishReason: candidate?.finishReason, model },
            'Gemini returned no response text',
          );
          throw new ApiError(502, 'BAD_GATEWAY', 'AI model returned an empty response');
        }

        reportAttempt({
          model,
          httpStatus: response.status,
          success: true,
          attempt,
        });
        return replyText.trim();
      }

      const errorDetails = await readProviderError(
        response,
        this.apiKey,
        [...history.map((message) => message.content), userMessage],
      );
      const retryAfterMs = getRetryAfterMs(response);
      const isTransient = response.status === 500 || response.status === 503;
      reportAttempt({
        model,
        httpStatus: response.status,
        providerCode: errorDetails.providerCode,
        success: false,
        attempt,
      });

      if (isTransient && attempt < MAX_ATTEMPTS) {
        const retryDelayMs =
          retryAfterMs ?? getBackoffDelayMs(attempt, this.random);
        this.logger.error(
          {
            ...errorDetails,
            httpStatus: response.status,
            model,
            attempt,
            maxAttempts: MAX_ATTEMPTS,
            retriesRemaining: MAX_ATTEMPTS - attempt,
            retryAfterMs,
            retryDelayMs,
          },
          'Gemini transient provider failure; retrying',
        );
        await this.sleep(retryDelayMs);
        continue;
      }

      this.logger.error(
        {
          ...errorDetails,
          httpStatus: response.status,
          model,
          attempt,
          maxAttempts: MAX_ATTEMPTS,
          retriesRemaining: 0,
          retryAfterMs,
          retryDelayMs: null,
        },
        'Gemini provider request failed',
      );

      if (response.status === 429) {
        throw attachProviderDetails(
          new ApiError(
            429,
            'RATE_LIMIT_EXCEEDED',
            'Gemini quota or rate limit exceeded. Check provider usage and try again shortly.',
          ),
          errorDetails,
        );
      }

      const invalidApiKey =
        response.status === 400 &&
        (errorDetails.providerCode === 'API_KEY_INVALID' ||
          /api.?key.{0,30}(not valid|invalid)/i.test(
            errorDetails.providerMessage ?? '',
          ));
      if (invalidApiKey || response.status === 401) {
        throw attachProviderDetails(
          new ApiError(
            503,
            'GEMINI_API_KEY_INVALID',
            'Gemini rejected the configured API key. Verify the key and its Gemini API access.',
          ),
          errorDetails,
        );
      }
      if (response.status === 403) {
        throw attachProviderDetails(
          new ApiError(
            503,
            'GEMINI_ACCESS_DENIED',
            'Gemini denied access. Check the API key restrictions and Gemini API permissions.',
          ),
          errorDetails,
        );
      }
      if (errorDetails.unsupportedModel) {
        throw attachProviderDetails(
          new ApiError(
            503,
            'GEMINI_MODEL_UNAVAILABLE',
            'The configured Gemini model is unavailable. Check GEMINI_MODEL and model access.',
          ),
          errorDetails,
        );
      }
      if (isTransient) {
        throw attachProviderDetails(
          new ApiError(
            503,
            'SERVICE_UNAVAILABLE',
            'The AI service is temporarily unavailable. Please try again later.',
          ),
          errorDetails,
        );
      }
      if (response.status === 400) {
        throw attachProviderDetails(
          new ApiError(
            502,
            'GEMINI_REQUEST_REJECTED',
            'Gemini rejected the request. Check the model and API configuration.',
          ),
          errorDetails,
        );
      }
      throw attachProviderDetails(
        new ApiError(502, 'BAD_GATEWAY', 'Failed to generate AI response'),
        errorDetails,
      );
    }
  }
}

module.exports = {
  GeminiService,
  MAX_HISTORY_MESSAGES,
};
