const { loadEnvironment } = require('../src/load-environment');
const { readConfig } = require('../src/config');
const { GeminiService } = require('../src/services/gemini-service');

loadEnvironment();

async function runDiagnostic() {
  const config = readConfig();
  const geminiService = new GeminiService({
    apiKey: config.geminiApiKey,
    model: config.geminiModel,
    fallbackModel: config.geminiFallbackModel,
  });

  if (!geminiService.isConfigured()) {
    console.error(
      JSON.stringify({
        success: false,
        configured: false,
        message:
          'GEMINI_API_KEY is empty. Add a valid key from Google AI Studio to backend/.env.',
      }),
    );
    process.exitCode = 1;
    return;
  }

  let availableModels;
  try {
    availableModels = await geminiService.listAvailableModels();
  } catch (error) {
    console.error(
      JSON.stringify({
        success: false,
        configured: true,
        modelsApi: {
          httpStatus: error.providerStatus ?? error.statusCode ?? null,
          providerCode: error.providerCode ?? error.code ?? null,
        },
      }),
    );
    process.exitCode = 1;
    return;
  }

  const supportedModels = availableModels
    .filter((model) =>
      model.supportedGenerationMethods.includes('generateContent'),
    )
    .map((model) => model.name);
  const isAvailable = (model) => supportedModels.includes(model);
  const modelSelection = {
    primary: {
      model: config.geminiModel,
      supportsGenerateContent: isAvailable(config.geminiModel),
    },
    fallback: {
      model: config.geminiFallbackModel,
      supportsGenerateContent: isAvailable(config.geminiFallbackModel),
    },
  };
  const attempts = [];

  try {
    const result = await geminiService.generateReplyWithMetadata({
      userMessage: 'Reply with the single word OK.',
      onAttempt: (attempt) => attempts.push(attempt),
    });
    console.log(
      JSON.stringify({
        success: true,
        modelsApi: { httpStatus: 200, supportedModelCount: supportedModels.length },
        modelSelection,
        attempts: result.attempts,
        selectedModel: result.model,
        fallbackUsed: result.fallbackUsed,
        generatedResponse: result.text.slice(0, 120),
      }),
    );
  } catch (error) {
    console.error(
      JSON.stringify({
        success: false,
        modelsApi: { httpStatus: 200, supportedModelCount: supportedModels.length },
        modelSelection,
        attempts: error.attempts ?? attempts,
        statusCode: error.statusCode ?? null,
        code: error.code ?? 'GENERATION_FAILED',
        fallbackUsed: error.fallbackUsed ?? attempts.some(
          (attempt) => attempt.model === config.geminiFallbackModel,
        ),
      }),
    );
    process.exitCode = 1;
  }
}

runDiagnostic().catch((error) => {
  console.error(
    JSON.stringify({
      success: false,
      errorType: error.name,
      code: 'DIAGNOSTIC_FAILED',
    }),
  );
  process.exitCode = 1;
});
