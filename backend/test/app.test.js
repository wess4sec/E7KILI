const assert = require('node:assert/strict');
const { once } = require('node:events');
const test = require('node:test');
const express = require('express');
const { createApp } = require('../src/app');
const { readConfig } = require('../src/config');
const { createErrorHandler } = require('../src/middleware/error-handler');

const configValues = {
  MONGODB_URI: 'mongodb://127.0.0.1:27017/hkili_test_config',
  JWT_SECRET: 't'.repeat(32),
};
const testConfig = readConfig(configValues);

const silentLogger = {
  info() {},
  error() {},
};

async function withServer(
  callback,
  app = createApp({ logger: silentLogger, config: testConfig }),
) {
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');

  try {
    await callback(`http://127.0.0.1:${server.address().port}`);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
}

test('reads defaults and valid environment configuration', () => {
  assert.deepEqual(readConfig(configValues), {
    port: 3000,
    nodeEnv: 'development',
    mongodbUri: configValues.MONGODB_URI,
    jwtSecret: configValues.JWT_SECRET,
    jwtExpiresIn: '1h',
    bcryptRounds: 12,
    geminiApiKey: '',
    geminiModel: 'gemini-3.8-flash',
    geminiFallbackModel: 'gemini-3.6-flash',
  });
  assert.deepEqual(readConfig({
    ...configValues,
    PORT: '8080',
    NODE_ENV: 'test',
    JWT_EXPIRES_IN: '2h',
    BCRYPT_ROUNDS: '10',
    GEMINI_API_KEY: 'test-key',
    GEMINI_MODEL: 'gemini-3.6-flash',
    GEMINI_FALLBACK_MODEL: 'gemini-3.8-flash',
  }), {
    port: 8080,
    nodeEnv: 'test',
    mongodbUri: configValues.MONGODB_URI,
    jwtSecret: configValues.JWT_SECRET,
    jwtExpiresIn: '2h',
    bcryptRounds: 10,
    geminiApiKey: 'test-key',
    geminiModel: 'gemini-3.6-flash',
    geminiFallbackModel: 'gemini-3.8-flash',
  });
  assert.equal(
    readConfig({ ...configValues, GEMINI_MODEL: '   ' }).geminiModel,
    'gemini-3.8-flash',
  );
  assert.equal(
    readConfig({ ...configValues, GEMINI_API_KEY: '  test-key  ' }).geminiApiKey,
    'test-key',
  );
  assert.equal(
    readConfig({
      ...configValues,
      GEMINI_MODEL: 'gemini-3.6-flash',
    }).geminiFallbackModel,
    'gemini-3.8-flash',
  );
});

test('rejects invalid environment configuration', () => {
  assert.throws(
    () => readConfig({ ...configValues, PORT: '0' }),
    /PORT must be an integer/,
  );
  assert.throws(
    () => readConfig({ ...configValues, PORT: '70000' }),
    /PORT must be an integer/,
  );
  assert.throws(
    () => readConfig({ ...configValues, NODE_ENV: 'staging' }),
    /NODE_ENV must be/,
  );
  assert.throws(
    () => readConfig({ ...configValues, MONGODB_URI: 'http://localhost' }),
    /MONGODB_URI must be a MongoDB/,
  );
  assert.throws(
    () => readConfig({ ...configValues, JWT_SECRET: 'short' }),
    /JWT_SECRET must be at least 32 bytes/,
  );
  assert.throws(
    () => readConfig({ ...configValues, GEMINI_MODEL: 'models/a?key=secret' }),
    /GEMINI_MODEL must be a valid model identifier/,
  );
  assert.throws(
    () =>
      readConfig({
        ...configValues,
        GEMINI_FALLBACK_MODEL: 'models/a?key=secret',
      }),
    /GEMINI_FALLBACK_MODEL must be a valid model identifier/,
  );
  assert.throws(
    () =>
      readConfig({
        ...configValues,
        GEMINI_MODEL: 'gemini-3.6-flash',
        GEMINI_FALLBACK_MODEL: 'gemini-3.6-flash',
      }),
    /GEMINI_FALLBACK_MODEL must differ from GEMINI_MODEL/,
  );
});

test('serves the versioned health endpoint', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/v1/health`);

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: 'ok' });
  });
});

test('returns a consistent error for unknown routes', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/missing`);

    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), {
      error: { code: 'NOT_FOUND', message: 'Route not found' },
    });
  });
});

test('rejects malformed JSON with a client error', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/v1/health`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{',
    });

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), {
      error: {
        code: 'INVALID_JSON',
        message: 'Request body must contain valid JSON',
      },
    });
  });
});

test('rejects request bodies larger than 16 KiB', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/v1/health`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content: 'a'.repeat(16 * 1024) }),
    });

    assert.equal(response.status, 413);
    assert.deepEqual(await response.json(), {
      error: {
        code: 'PAYLOAD_TOO_LARGE',
        message: 'Request body is too large',
      },
    });
  });
});

test('hides unexpected error details from clients', async () => {
  const app = express();
  app.get('/failure', () => {
    throw new Error('sensitive diagnostic');
  });
  app.use(createErrorHandler(silentLogger));

  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/failure`);

    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), {
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  }, app);
});
