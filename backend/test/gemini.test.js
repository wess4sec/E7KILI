const assert = require('node:assert/strict');
const { randomBytes, randomUUID } = require('node:crypto');
const { once } = require('node:events');
const mongoose = require('mongoose');
const { after, before, beforeEach, test } = require('node:test');
const { createApp } = require('../src/app');
const { readConfig } = require('../src/config');
const {
  connectDatabase,
  disconnectDatabase,
} = require('../src/db/connection');
const { Conversation } = require('../src/models/conversation');
const { Message } = require('../src/models/message');
const { User } = require('../src/models/user');
const { GeminiService } = require('../src/services/gemini-service');

const testDatabaseName =
  `hkili_test_gemini_${process.pid}_${randomUUID().replaceAll('-', '')}`;
const testMongoUri = `mongodb://127.0.0.1:27017/${testDatabaseName}`;
const testConfig = readConfig({
  NODE_ENV: 'test',
  MONGODB_URI: testMongoUri,
  JWT_SECRET: randomBytes(48).toString('base64url'),
  BCRYPT_ROUNDS: '10',
  GEMINI_API_KEY: 'test-gemini-key',
  GEMINI_MODEL: 'gemini-3.8-flash',
  GEMINI_FALLBACK_MODEL: 'gemini-3.6-flash',
});

let server;
let baseUrl;
let userAToken;
let userBToken;
let userA;
let userB;
let mockFetchHandler;
let capturedRequests = [];

const testLogger = {
  info() {},
  error() {},
};

async function customFetcher(url, options) {
  capturedRequests.push({ url, options, body: JSON.parse(options.body) });
  return mockFetchHandler(url, options);
}

const mockGeminiService = new GeminiService({
  apiKey: testConfig.geminiApiKey,
  model: testConfig.geminiModel,
  fallbackModel: testConfig.geminiFallbackModel,
  fetcher: customFetcher,
  logger: testLogger,
  sleep: async () => {},
  random: () => 0.5,
});

before(async () => {
  const parsedUri = new URL(testMongoUri);
  if (
    parsedUri.hostname !== '127.0.0.1' ||
    parsedUri.pathname.slice(1) !== testDatabaseName ||
    !testDatabaseName.startsWith('hkili_test_')
  ) {
    throw new Error('Refusing to run tests outside an isolated local database');
  }

  await connectDatabase(testMongoUri);
  await Promise.all([User.init(), Conversation.init(), Message.init()]);

  server = createApp({
    logger: testLogger,
    config: testConfig,
    geminiService: mockGeminiService,
  }).listen(0, '127.0.0.1');

  await once(server, 'listening');
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  // Register User A
  const regARes = await sendJson('/api/v1/auth/register', {
    email: 'gemini_usera@example.com',
    password: 'password1234',
    name: 'Gemini User A',
  });
  const regA = await regARes.json();
  userA = regA.user;
  userAToken = regA.token;

  // Register User B
  const regBRes = await sendJson('/api/v1/auth/register', {
    email: 'gemini_userb@example.com',
    password: 'password1234',
    name: 'Gemini User B',
  });
  const regB = await regBRes.json();
  userB = regB.user;
  userBToken = regB.token;
});

after(async () => {
  if (server) {
    server.closeAllConnections();
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }

  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.dropDatabase();
  }
  await disconnectDatabase();
});

beforeEach(() => {
  capturedRequests = [];
  mockFetchHandler = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      candidates: [
        {
          content: {
            parts: [{ text: 'Mock Gemini response: Aaslema !' }],
            role: 'model',
          },
        },
      ],
    }),
  });
});

async function request(path, { token, ...options } = {}) {
  const headers = new Headers(options.headers);
  if (options.body !== undefined && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }
  if (token) {
    headers.set('authorization', `Bearer ${token}`);
  }
  return fetch(`${baseUrl}${path}`, { ...options, headers });
}

async function sendJson(path, body, options = {}) {
  return request(path, {
    ...options,
    method: options.method ?? 'POST',
    body: JSON.stringify(body),
  });
}

test('returns 503 when GEMINI_API_KEY is not configured and AI reply is requested', async () => {
  const unconfiguredService = new GeminiService({
    apiKey: '',
    logger: testLogger,
  });

  const unconfiguredApp = createApp({
    logger: testLogger,
    config: readConfig({
      NODE_ENV: 'test',
      MONGODB_URI: testMongoUri,
      JWT_SECRET: testConfig.jwtSecret,
      BCRYPT_ROUNDS: '10',
      GEMINI_API_KEY: '',
    }),
    geminiService: unconfiguredService,
  });

  const unconfiguredServer = unconfiguredApp.listen(0, '127.0.0.1');
  await once(unconfiguredServer, 'listening');
  const tempBaseUrl = `http://127.0.0.1:${unconfiguredServer.address().port}`;

  try {
    // Create conversation using User A token
    const convRes = await sendJson(
      '/api/v1/conversations',
      { title: 'Test Unconfigured' },
      { token: userAToken },
    );
    const conv = (await convRes.json()).conversation;

    // Send message to unconfigured server with generateReply: true
    const response = await fetch(
      `${tempBaseUrl}/api/v1/conversations/${conv.id}/messages`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${userAToken}`,
        },
        body: JSON.stringify({ content: 'Hello', generateReply: true }),
      },
    );

    assert.equal(response.status, 503);
    const body = await response.json();
    assert.equal(body.error.code, 'SERVICE_UNAVAILABLE');
    assert.match(body.error.message, /temporarily unavailable/);
    assert.doesNotMatch(body.error.message, /GEMINI_API_KEY|backend\/\.env/);

    // Verify NO messages were saved
    const messagesCount = await Message.countDocuments({
      conversation: conv.id,
    });
    assert.equal(messagesCount, 0);
  } finally {
    unconfiguredServer.closeAllConnections();
    await new Promise((resolve) => unconfiguredServer.close(resolve));
  }
});

test('reports missing Gemini configuration at startup without logging a key', () => {
  const entries = [];
  const service = new GeminiService({
    apiKey: '',
    model: 'gemini-3.8-flash',
    logger: {
      info(fields, message) {
        entries.push({ fields, message });
      },
      error() {},
    },
  });

  assert.equal(service.isConfigured(), false);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].fields.configured, false);
  assert.equal(entries[0].fields.model, 'gemini-3.8-flash');
  assert.match(entries[0].message, /Google AI Studio/);
  assert.doesNotMatch(JSON.stringify(entries), /test-secret-api-key/);
});

test('generates AI response and persists both user message and assistant reply', async () => {
  // Create conversation
  const convRes = await sendJson(
    '/api/v1/conversations',
    { title: 'Chat with Gemini' },
    { token: userAToken },
  );
  const conv = (await convRes.json()).conversation;

  // Send message
  const res = await sendJson(
    `/api/v1/conversations/${conv.id}/messages`,
    { content: 'Parle-moi de Sidi Bou Said' },
    { token: userAToken },
  );

  assert.equal(res.status, 201);
  const data = await res.json();

  // Assistant response returned in message field
  assert.equal(data.message.role, 'assistant');
  assert.equal(data.message.content, 'Mock Gemini response: Aaslema !');
  assert.equal(data.message.conversationId, conv.id);

  // User message returned in userMessage field
  assert.equal(data.userMessage.role, 'user');
  assert.equal(data.userMessage.content, 'Parle-moi de Sidi Bou Said');

  // Verify both persisted in DB
  const storedMessages = await Message.find({ conversation: conv.id }).sort({
    createdAt: 1,
  });
  assert.equal(storedMessages.length, 2);
  assert.equal(storedMessages[0].content, 'Parle-moi de Sidi Bou Said');
  assert.equal(storedMessages[0].role, 'user');
  assert.equal(storedMessages[1].content, 'Mock Gemini response: Aaslema !');
  assert.equal(storedMessages[1].role, 'assistant');

  // Verify conversation lastMessageAt was updated
  const updatedConv = await Conversation.findById(conv.id);
  assert.ok(updatedConv.lastMessageAt);
  assert.equal(
    updatedConv.lastMessageAt.getTime(),
    new Date(data.message.createdAt).getTime(),
  );

  // Verify Gemini was called with proper system instructions and user content
  assert.equal(capturedRequests.length, 1);
  assert.match(
    capturedRequests[0].url,
    /models\/gemini-3\.8-flash:generateContent$/,
  );
  assert.equal(capturedRequests[0].url.includes(testConfig.geminiApiKey), false);
  assert.equal(
    capturedRequests[0].options.headers['x-goog-api-key'],
    testConfig.geminiApiKey,
  );
  const sentBody = capturedRequests[0].body;
  assert.ok(sentBody.systemInstruction);
  assert.equal(
    sentBody.contents[0].parts[0].text,
    'Parle-moi de Sidi Bou Said',
  );
  assert.equal(sentBody.contents[0].role, 'user');
});

test('retries a transient 503 and persists the successful response', async () => {
  const convRes = await sendJson(
    '/api/v1/conversations',
    { title: 'Retry temporary provider failure' },
    { token: userAToken },
  );
  const conv = (await convRes.json()).conversation;
  let attempts = 0;
  mockFetchHandler = async () => {
    attempts++;
    if (attempts === 1) {
      return {
        ok: false,
        status: 503,
        headers: new Headers({ 'retry-after': '1' }),
        json: async () => ({
          error: {
            code: 503,
            status: 'UNAVAILABLE',
            message: 'The service is temporarily unavailable.',
          },
        }),
      };
    }

    return {
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [
          { content: { parts: [{ text: 'Recovered response' }] } },
        ],
      }),
    };
  };

  const response = await sendJson(
    `/api/v1/conversations/${conv.id}/messages`,
    { content: 'Please retry this message' },
    { token: userAToken },
  );
  const result = await response.json();

  assert.equal(response.status, 201);
  assert.equal(attempts, 2);
  assert.equal(capturedRequests.length, 2);
  assert.equal(result.userMessage.content, 'Please retry this message');
  assert.equal(result.message.content, 'Recovered response');
  assert.equal(
    await Message.countDocuments({ conversation: conv.id }),
    2,
  );
});

test('uses the verified fallback after primary retries and persists one response pair', async () => {
  const convRes = await sendJson(
    '/api/v1/conversations',
    { title: 'Gemini fallback integration' },
    { token: userAToken },
  );
  const conv = (await convRes.json()).conversation;
  mockFetchHandler = async (url) => {
    if (url.includes('/models/gemini-3.8-flash:generateContent')) {
      return {
        ok: false,
        status: 503,
        json: async () => ({
          error: {
            code: 503,
            status: 'UNAVAILABLE',
            message: 'Temporary provider capacity issue.',
          },
        }),
      };
    }

    return {
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'Fallback response' }] } }],
      }),
    };
  };

  const response = await sendJson(
    `/api/v1/conversations/${conv.id}/messages`,
    { content: 'Keep this message after a provider outage.' },
    { token: userAToken },
  );
  const result = await response.json();

  assert.equal(response.status, 201);
  assert.equal(capturedRequests.length, 4);
  assert.equal(
    capturedRequests.filter((request) =>
      request.url.includes('/models/gemini-3.8-flash:'),
    ).length,
    3,
  );
  assert.equal(
    capturedRequests[3].url.includes('/models/gemini-3.6-flash:'),
    true,
  );
  assert.equal(result.userMessage.content, 'Keep this message after a provider outage.');
  assert.equal(result.message.content, 'Fallback response');
  assert.equal(
    await Message.countDocuments({ conversation: conv.id }),
    2,
  );
});

test('lists only safe Gemini model metadata with generateContent support', async () => {
  const apiKey = 'test-secret-api-key';
  let capturedUrl;
  let capturedOptions;
  const service = new GeminiService({
    apiKey,
    logger: testLogger,
    fetcher: async (url, options) => {
      capturedUrl = url.toString();
      capturedOptions = options;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          models: [
            {
              name: 'models/gemini-3.8-flash',
              supportedGenerationMethods: ['generateContent', 'countTokens'],
            },
            {
              name: 'models/text-embedding-example',
              supportedGenerationMethods: ['embedContent'],
            },
          ],
        }),
      };
    },
  });

  assert.deepEqual(await service.listAvailableModels(), [
    {
      name: 'gemini-3.8-flash',
      supportedGenerationMethods: ['generateContent', 'countTokens'],
    },
    {
      name: 'text-embedding-example',
      supportedGenerationMethods: ['embedContent'],
    },
  ]);
  assert.match(capturedUrl, /\/v1beta\/models\?/);
  assert.equal(capturedUrl.includes(apiKey), false);
  assert.equal(capturedOptions.headers['x-goog-api-key'], apiKey);
});

test('uses fallback for an unsupported primary without retrying the bad model', async () => {
  const requestedModels = [];
  const delays = [];
  const service = new GeminiService({
    apiKey: 'test-gemini-key',
    model: 'gemini-unsupported-test',
    fallbackModel: 'gemini-3.6-flash',
    logger: testLogger,
    sleep: async (delay) => delays.push(delay),
    fetcher: async (url) => {
      requestedModels.push(url);
      if (url.includes('gemini-unsupported-test')) {
        return {
          ok: false,
          status: 400,
          json: async () => ({
            error: {
              code: 400,
              status: 'INVALID_ARGUMENT',
              message: 'Model gemini-unsupported-test is not supported for generateContent.',
            },
          }),
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: 'Fallback worked' }] } }],
        }),
      };
    },
  });

  const attempts = [];
  const result = await service.generateReplyWithMetadata({
    userMessage: 'Hello',
    onAttempt: (attempt) => attempts.push(attempt),
  });

  assert.equal(result.text, 'Fallback worked');
  assert.equal(result.model, 'gemini-3.6-flash');
  assert.equal(result.fallbackUsed, true);
  assert.equal(requestedModels.length, 2);
  assert.deepEqual(delays, []);
  assert.deepEqual(
    attempts.map(({ model, httpStatus, success }) => ({
      model,
      httpStatus,
      success,
    })),
    [
      { model: 'gemini-unsupported-test', httpStatus: 400, success: false },
      { model: 'gemini-3.6-flash', httpStatus: 200, success: true },
    ],
  );
});

test('maps invalid API key responses without logging credentials or private content', async () => {
  const key = 'test-secret-api-key';
  const privateContent = 'private test prompt content';
  const logEntries = [];
  let attempts = 0;
  let capturedUrl;
  const service = new GeminiService({
    apiKey: key,
    model: 'gemini-3.8-flash',
    fallbackModel: 'gemini-3.6-flash',
    logger: {
      info(fields, message) {
        logEntries.push({ fields, message });
      },
      error(fields, message) {
        logEntries.push({ fields, message });
      },
    },
    fetcher: async (url) => {
      attempts++;
      capturedUrl = url;
      return {
        ok: false,
        status: 400,
        json: async () => ({
          error: {
            status: 'API_KEY_INVALID',
            message: `Invalid API key: ${key}; request included ${privateContent}`,
          },
        }),
      };
    },
  });

  await assert.rejects(
    service.generateReply({ userMessage: privateContent }),
    (error) => {
      assert.equal(error.statusCode, 503);
      assert.equal(error.code, 'GEMINI_API_KEY_INVALID');
      assert.doesNotMatch(error.message, /test-secret-api-key|private test prompt content/);
      return true;
    },
  );

  assert.equal(capturedUrl.includes(key), false);
  assert.equal(attempts, 1);
  assert.equal(JSON.stringify(logEntries).includes(key), false);
  assert.equal(JSON.stringify(logEntries).includes(privateContent), false);
});

test('respects Retry-After and retries non-transient authorization errors zero times', async () => {
  const delays = [];
  let attempts = 0;
  const service = new GeminiService({
    apiKey: 'test-gemini-key',
    model: 'gemini-3.8-flash',
    logger: testLogger,
    sleep: async (delay) => delays.push(delay),
    fetcher: async () => {
      attempts++;
      if (attempts === 1) {
        return {
          ok: false,
          status: 503,
          headers: new Headers({ 'retry-after': '2' }),
          json: async () => ({
            error: { code: 503, status: 'UNAVAILABLE', message: 'Try later.' },
          }),
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: 'OK' }] } }],
        }),
      };
    },
  });

  assert.equal(
    await service.generateReply({ userMessage: 'Reply briefly' }),
    'OK',
  );
  assert.equal(attempts, 2);
  assert.deepEqual(delays, [2000]);

  for (const [status, code] of [
    [401, 'GEMINI_API_KEY_INVALID'],
    [403, 'GEMINI_ACCESS_DENIED'],
  ]) {
    let nonTransientAttempts = 0;
    const nonTransientService = new GeminiService({
      apiKey: 'test-gemini-key',
      logger: testLogger,
      sleep: async () => assert.fail('Non-transient provider errors must not retry'),
      fetcher: async () => {
        nonTransientAttempts++;
        return {
          ok: false,
          status,
          json: async () => ({
            error: { code: status, status: 'PERMISSION_DENIED', message: 'Denied.' },
          }),
        };
      },
    });

    await assert.rejects(
      nonTransientService.generateReply({ userMessage: 'Hello' }),
      (error) => error.code === code,
    );
    assert.equal(nonTransientAttempts, 1);
  }
});

test('returns service unavailable after bounded retries and logs safe provider details', async () => {
  const key = 'test-secret-api-key';
  const privateContent = 'private test prompt content';
  const attempts = [];
  const delays = [];
  const logs = [];
  const service = new GeminiService({
    apiKey: key,
    model: 'gemini-3.8-flash',
    random: () => 0.5,
    sleep: async (delay) => delays.push(delay),
    logger: {
      info() {},
      error(fields, message) {
        logs.push({ fields, message });
      },
    },
    fetcher: async () => {
      attempts.push(true);
      return {
        ok: false,
        status: 503,
        json: async () => ({
          error: {
            code: 503,
            status: 'UNAVAILABLE',
            message: `Service unavailable for private test; key ${key}`,
          },
        }),
      };
    },
  });

  await assert.rejects(
    service.generateReply({ userMessage: privateContent }),
    (error) => {
      assert.equal(error.statusCode, 503);
      assert.equal(error.code, 'SERVICE_UNAVAILABLE');
      assert.match(error.message, /temporarily unavailable/);
      assert.doesNotMatch(error.message, /UNAVAILABLE|private test prompt content/);
      return true;
    },
  );

  assert.equal(attempts.length, 3);
  assert.deepEqual(delays, [188, 375]);
  assert.equal(logs.length, 3);
  assert.equal(logs[0].fields.providerStatus, 503);
  assert.equal(logs[0].fields.providerCode, 'UNAVAILABLE');
  assert.equal(
    logs[0].fields.providerMessage,
    '[provider message omitted because it echoed request content]',
  );
  assert.equal(logs[0].fields.model, 'gemini-3.8-flash');
  assert.equal(logs[0].fields.retryAfterMs, null);
  assert.equal(logs[0].fields.retryDelayMs, 188);
  assert.equal(logs[0].fields.retriesRemaining, 2);
  assert.equal(logs[2].fields.attempt, 3);
  assert.equal(logs[2].fields.retriesRemaining, 0);
  assert.equal(JSON.stringify(logs).includes(key), false);
  assert.equal(JSON.stringify(logs).includes(privateContent), false);
});

test('reports unavailable models without exposing provider response details', async () => {
  const service = new GeminiService({
    apiKey: 'test-gemini-key',
    logger: testLogger,
    fetcher: async () => ({
      ok: false,
      status: 404,
      json: async () => ({
        error: {
          status: 'NOT_FOUND',
          message: 'internal provider details',
        },
      }),
    }),
  });

  await assert.rejects(
    service.generateReply({ userMessage: 'Aaslema' }),
    (error) => {
      assert.equal(error.statusCode, 503);
      assert.equal(error.code, 'GEMINI_MODEL_UNAVAILABLE');
      assert.doesNotMatch(error.message, /internal provider details/);
      return true;
    },
  );
});

test('enforces context limit: passes only the last 10 messages to Gemini', async () => {
  // Create conversation
  const convRes = await sendJson(
    '/api/v1/conversations',
    { title: 'Long conversation' },
    { token: userAToken },
  );
  const conv = (await convRes.json()).conversation;

  // Seed 14 messages into MongoDB directly (older messages)
  const seedMessages = [];
  for (let i = 1; i <= 14; i++) {
    seedMessages.push({
      conversation: conv.id,
      role: i % 2 === 1 ? 'user' : 'assistant',
      content: `Seeded message ${i}`,
      createdAt: new Date(Date.now() - (15 - i) * 60000),
    });
  }
  await Message.insertMany(seedMessages);

  // Send a new message that triggers Gemini
  const res = await sendJson(
    `/api/v1/conversations/${conv.id}/messages`,
    { content: 'Newest question' },
    { token: userAToken },
  );
  assert.equal(res.status, 201);

  // Verify Gemini call received only last 10 history items + 1 current message = 11 items
  assert.equal(capturedRequests.length, 1);
  const sentContents = capturedRequests[0].body.contents;
  assert.equal(sentContents.length, 11);

  // The first content in context should be Seeded message 5 (messages 1-4 were omitted)
  assert.equal(sentContents[0].parts[0].text, 'Seeded message 5');
  assert.equal(sentContents[9].parts[0].text, 'Seeded message 14');
  assert.equal(sentContents[10].parts[0].text, 'Newest question');
});

test('handles rate limit (429) without persisting duplicate messages', async () => {
  const convRes = await sendJson(
    '/api/v1/conversations',
    { title: 'Rate limit test' },
    { token: userAToken },
  );
  const conv = (await convRes.json()).conversation;

  mockFetchHandler = async () => ({
    ok: false,
    status: 429,
    json: async () => ({ error: 'quota exceeded' }),
  });

  const res = await sendJson(
    `/api/v1/conversations/${conv.id}/messages`,
    { content: 'Will be rate limited' },
    { token: userAToken },
  );

  assert.equal(res.status, 429);
  const body = await res.json();
  assert.equal(body.error.code, 'RATE_LIMIT_EXCEEDED');
  assert.equal(capturedRequests.length, 1);

  // Verify NO message is persisted in MongoDB
  const count = await Message.countDocuments({ conversation: conv.id });
  assert.equal(count, 0);
});

test('handles provider timeouts (504) without persisting duplicate messages', async () => {
  const convRes = await sendJson(
    '/api/v1/conversations',
    { title: 'Timeout test' },
    { token: userAToken },
  );
  const conv = (await convRes.json()).conversation;

  mockFetchHandler = async () => {
    const error = new Error('The operation was aborted');
    error.name = 'TimeoutError';
    throw error;
  };

  const res = await sendJson(
    `/api/v1/conversations/${conv.id}/messages`,
    { content: 'Will time out' },
    { token: userAToken },
  );

  assert.equal(res.status, 504);
  const body = await res.json();
  assert.equal(body.error.code, 'GATEWAY_TIMEOUT');

  // Verify NO message is persisted
  const count = await Message.countDocuments({ conversation: conv.id });
  assert.equal(count, 0);
});

test('falls back after exhausted 500 retries and reports unavailable if both models fail', async () => {
  const convRes = await sendJson(
    '/api/v1/conversations',
    { title: 'Provider error test' },
    { token: userAToken },
  );
  const conv = (await convRes.json()).conversation;

  mockFetchHandler = async () => ({
    ok: false,
    status: 500,
    json: async () => ({ secretInternalProviderDetails: 'backend failure' }),
  });

  const res = await sendJson(
    `/api/v1/conversations/${conv.id}/messages`,
    { content: 'Will fail upstream' },
    { token: userAToken },
  );

  assert.equal(res.status, 503);
  const body = await res.json();
  assert.equal(body.error.code, 'SERVICE_UNAVAILABLE');
  assert.match(body.error.message, /temporarily unavailable/);
  assert.equal(JSON.stringify(body).includes('secretInternalProviderDetails'), false);
  assert.equal(capturedRequests.length, 6);
  assert.equal(
    capturedRequests.filter((request) =>
      request.url.includes('/models/gemini-3.8-flash:'),
    ).length,
    3,
  );
  assert.equal(
    capturedRequests.filter((request) =>
      request.url.includes('/models/gemini-3.6-flash:'),
    ).length,
    3,
  );

  // Verify NO message is persisted
  const count = await Message.countDocuments({ conversation: conv.id });
  assert.equal(count, 0);
});

test('handles empty candidates or missing text from Gemini (502 BAD_GATEWAY)', async () => {
  const convRes = await sendJson(
    '/api/v1/conversations',
    { title: 'Empty response test' },
    { token: userAToken },
  );
  const conv = (await convRes.json()).conversation;

  mockFetchHandler = async () => ({
    ok: true,
    status: 200,
    json: async () => ({ candidates: [] }),
  });

  const res = await sendJson(
    `/api/v1/conversations/${conv.id}/messages`,
    { content: 'Will produce empty candidate' },
    { token: userAToken },
  );

  assert.equal(res.status, 502);
  const body = await res.json();
  assert.equal(body.error.code, 'BAD_GATEWAY');

  // Verify NO message is persisted
  const count = await Message.countDocuments({ conversation: conv.id });
  assert.equal(count, 0);
});

test('handles an unreadable provider JSON response without persisting messages', async () => {
  const convRes = await sendJson(
    '/api/v1/conversations',
    { title: 'Malformed provider response test' },
    { token: userAToken },
  );
  const conv = (await convRes.json()).conversation;

  mockFetchHandler = async () => ({
    ok: true,
    status: 200,
    json: async () => {
      throw new SyntaxError('Malformed provider JSON');
    },
  });

  const response = await sendJson(
    `/api/v1/conversations/${conv.id}/messages`,
    { content: 'Handle malformed upstream data' },
    { token: userAToken },
  );

  assert.equal(response.status, 502);
  assert.equal((await response.json()).error.code, 'BAD_GATEWAY');
  assert.equal(
    await Message.countDocuments({ conversation: conv.id }),
    0,
  );
});

test('enforces authorization and ownership on AI message generation', async () => {
  const convRes = await sendJson(
    '/api/v1/conversations',
    { title: 'User A Private' },
    { token: userAToken },
  );
  const conv = (await convRes.json()).conversation;

  // Unauthenticated
  const unauthRes = await sendJson(
    `/api/v1/conversations/${conv.id}/messages`,
    { content: 'Unauthorized message' },
  );
  assert.equal(unauthRes.status, 401);

  // Cross-user access (User B accessing User A)
  const crossRes = await sendJson(
    `/api/v1/conversations/${conv.id}/messages`,
    { content: 'Cross-user hack message' },
    { token: userBToken },
  );
  assert.equal(crossRes.status, 403);
  assert.equal((await crossRes.json()).error.code, 'FORBIDDEN');

  // Non-existent conversation
  const fakeId = new mongoose.Types.ObjectId().toString();
  const notFoundRes = await sendJson(
    `/api/v1/conversations/${fakeId}/messages`,
    { content: 'Message for ghost conversation' },
    { token: userAToken },
  );
  assert.equal(notFoundRes.status, 404);

  // Invalid ObjectId
  const invalidIdRes = await sendJson(
    '/api/v1/conversations/invalid-id/messages',
    { content: 'Message for invalid id' },
    { token: userAToken },
  );
  assert.equal(invalidIdRes.status, 400);
});
