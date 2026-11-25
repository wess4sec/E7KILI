const assert = require('node:assert/strict');
const { randomBytes, randomUUID } = require('node:crypto');
const { once } = require('node:events');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { after, before, test } = require('node:test');
const { createApp } = require('../src/app');
const { readConfig } = require('../src/config');
const {
  connectDatabase,
  disconnectDatabase,
} = require('../src/db/connection');
const { Conversation } = require('../src/models/conversation');
const { Message } = require('../src/models/message');
const { User } = require('../src/models/user');

const testDatabaseName =
  `hkili_test_${process.pid}_${randomUUID().replaceAll('-', '')}`;
const testMongoUri = `mongodb://127.0.0.1:27017/${testDatabaseName}`;
const testConfig = readConfig({
  NODE_ENV: 'test',
  MONGODB_URI: testMongoUri,
  JWT_SECRET: randomBytes(48).toString('base64url'),
  BCRYPT_ROUNDS: '10',
});

let server;
let baseUrl;
let registeredUser;

const testLogger = {
  info() {},
  error() {},
};

before(async () => {
  const parsedUri = new URL(testMongoUri);
  if (
    parsedUri.hostname !== '127.0.0.1' ||
    parsedUri.pathname.slice(1) !== testDatabaseName ||
    !testDatabaseName.startsWith('hkili_test_')
  ) {
    throw new Error('Refusing to run API tests outside an isolated local database');
  }

  await connectDatabase(testMongoUri);
  await Promise.all([User.init(), Conversation.init(), Message.init()]);
  server = createApp({ logger: testLogger, config: testConfig }).listen(
    0,
    '127.0.0.1',
  );
  await once(server, 'listening');
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) {
    server.closeAllConnections();
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }

  if (mongoose.connection.readyState === 1) {
    if (
      mongoose.connection.name !== testDatabaseName ||
      !testDatabaseName.startsWith('hkili_test_')
    ) {
      throw new Error('Refusing to drop a database outside the isolated test database');
    }
    await mongoose.connection.dropDatabase();
  }
  await disconnectDatabase();
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

test('registers a user, hashes their password, and never returns its hash', async () => {
  const invalid = await sendJson('/api/v1/auth/register', {
    email: 'not-an-email',
    password: 'password123',
  });
  assert.equal(invalid.status, 400);

  const weakPassword = await sendJson('/api/v1/auth/register', {
    email: 'person@example.com',
    password: 'short',
  });
  assert.equal(weakPassword.status, 400);

  const response = await sendJson('/api/v1/auth/register', {
    email: '  Person@example.com ',
    password: 'correct horse battery',
    name: 'Person',
  });
  const result = await response.json();

  assert.equal(response.status, 201);
  assert.equal(result.user.email, 'person@example.com');
  assert.equal(result.user.name, 'Person');
  assert.equal('passwordHash' in result.user, false);
  assert.equal('password' in result.user, false);
  assert.equal(typeof result.token, 'string');
  assert.ok(result.user.createdAt);
  registeredUser = result.user;

  const storedUser = await User.findById(registeredUser.id).select('+passwordHash');
  assert.match(storedUser.passwordHash, /^\$2[aby]\$/);
  assert.notEqual(storedUser.passwordHash, 'correct horse battery');
});

test('rejects duplicate registrations and unknown registration fields', async () => {
  const duplicate = await sendJson('/api/v1/auth/register', {
    email: 'person@example.com',
    password: 'correct horse battery',
  });
  assert.equal(duplicate.status, 409);
  assert.equal((await duplicate.json()).error.code, 'EMAIL_ALREADY_REGISTERED');

  const extraField = await sendJson('/api/v1/auth/register', {
    email: 'other@example.com',
    password: 'correct horse battery',
    passwordHash: 'attacker-controlled',
  });
  assert.equal(extraField.status, 400);
});

test('logs in, returns the authenticated user, and handles bad credentials', async () => {
  const response = await sendJson('/api/v1/auth/login', {
    email: 'PERSON@example.com',
    password: 'correct horse battery',
  });
  const result = await response.json();
  assert.equal(response.status, 200);
  assert.equal(result.user.id, registeredUser.id);
  assert.equal('passwordHash' in result.user, false);

  const me = await request('/api/v1/auth/me', { token: result.token });
  assert.equal(me.status, 200);
  assert.deepEqual((await me.json()).user, result.user);

  const wrongPassword = await sendJson('/api/v1/auth/login', {
    email: 'person@example.com',
    password: 'incorrect password',
  });
  assert.equal(wrongPassword.status, 401);
  const wrongPasswordError = (await wrongPassword.json()).error;
  assert.equal(wrongPasswordError.code, 'INVALID_CREDENTIALS');

  const unknownEmail = await sendJson('/api/v1/auth/login', {
    email: 'missing@example.com',
    password: 'incorrect password',
  });
  assert.equal(unknownEmail.status, 401);
  assert.deepEqual((await unknownEmail.json()).error, wrongPasswordError);
});

test('rejects missing, invalid, and expired bearer tokens', async () => {
  const missing = await request('/api/v1/auth/me');
  assert.equal(missing.status, 401);
  assert.equal((await missing.json()).error.code, 'AUTHENTICATION_REQUIRED');

  const invalid = await request('/api/v1/auth/me', { token: 'not-a-token' });
  assert.equal(invalid.status, 401);
  assert.equal((await invalid.json()).error.code, 'INVALID_TOKEN');

  const expiredToken = jwt.sign(
    {
      sub: registeredUser.id,
      exp: Math.floor(Date.now() / 1000) - 30,
    },
    testConfig.jwtSecret,
    { algorithm: 'HS256' },
  );
  const expired = await request('/api/v1/auth/me', { token: expiredToken });
  assert.equal(expired.status, 401);
  assert.equal((await expired.json()).error.code, 'TOKEN_EXPIRED');
});
