const validNodeEnvironments = new Set(['development', 'test', 'production']);
const defaultGeminiModel = 'gemini-3.8-flash';
const defaultGeminiFallbackModel = 'gemini-3.6-flash';

function readConfig(env = process.env) {
  const portValue = env.PORT ?? '3000';
  if (!/^\d+$/.test(portValue)) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }

  const port = Number(portValue);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }

  const nodeEnv = env.NODE_ENV ?? 'development';
  if (!validNodeEnvironments.has(nodeEnv)) {
    throw new Error('NODE_ENV must be development, test, or production');
  }

  const mongodbUri = env.MONGODB_URI;
  if (
    typeof mongodbUri !== 'string' ||
    !/^mongodb(?:\+srv)?:\/\//.test(mongodbUri)
  ) {
    throw new Error('MONGODB_URI must be a MongoDB connection URI');
  }
  try {
    if (!new URL(mongodbUri).hostname) {
      throw new Error();
    }
  } catch {
    throw new Error('MONGODB_URI must be a valid MongoDB connection URI');
  }

  const jwtSecret = env.JWT_SECRET;
  if (
    typeof jwtSecret !== 'string' ||
    Buffer.byteLength(jwtSecret, 'utf8') < 32
  ) {
    throw new Error('JWT_SECRET must be at least 32 bytes');
  }

  const jwtExpiresIn = env.JWT_EXPIRES_IN ?? '1h';
  if (!/^[1-9]\d*(s|m|h|d)$/.test(jwtExpiresIn)) {
    throw new Error('JWT_EXPIRES_IN must be a positive s, m, h, or d duration');
  }

  const bcryptRoundsValue = env.BCRYPT_ROUNDS ?? '12';
  if (!/^\d+$/.test(bcryptRoundsValue)) {
    throw new Error('BCRYPT_ROUNDS must be an integer between 10 and 14');
  }
  const bcryptRounds = Number(bcryptRoundsValue);
  if (!Number.isInteger(bcryptRounds) || bcryptRounds < 10 || bcryptRounds > 14) {
    throw new Error('BCRYPT_ROUNDS must be an integer between 10 and 14');
  }

  const geminiApiKey =
    typeof env.GEMINI_API_KEY === 'string' ? env.GEMINI_API_KEY.trim() : '';
  const geminiModel =
    typeof env.GEMINI_MODEL === 'string' && env.GEMINI_MODEL.trim()
      ? env.GEMINI_MODEL.trim()
      : defaultGeminiModel;
  if (!/^[a-zA-Z0-9._-]{1,100}$/.test(geminiModel)) {
    throw new Error('GEMINI_MODEL must be a valid model identifier');
  }
  const fallbackDefault =
    geminiModel === defaultGeminiFallbackModel
      ? defaultGeminiModel
      : defaultGeminiFallbackModel;
  const geminiFallbackModel =
    typeof env.GEMINI_FALLBACK_MODEL === 'string' &&
    env.GEMINI_FALLBACK_MODEL.trim()
      ? env.GEMINI_FALLBACK_MODEL.trim()
      : fallbackDefault;
  if (!/^[a-zA-Z0-9._-]{1,100}$/.test(geminiFallbackModel)) {
    throw new Error(
      'GEMINI_FALLBACK_MODEL must be a valid model identifier',
    );
  }
  if (geminiFallbackModel === geminiModel) {
    throw new Error('GEMINI_FALLBACK_MODEL must differ from GEMINI_MODEL');
  }

  return Object.freeze({
    port,
    nodeEnv,
    mongodbUri,
    jwtSecret,
    jwtExpiresIn,
    bcryptRounds,
    geminiApiKey,
    geminiModel,
    geminiFallbackModel,
  });
}

module.exports = { readConfig };
