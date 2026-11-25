const assert = require('node:assert/strict');
const { randomBytes, randomUUID } = require('node:crypto');
const { once } = require('node:events');
const mongoose = require('mongoose');
const { after, before, describe, test } = require('node:test');
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
let userAToken;
let userBToken;
let userA;
let userB;

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
    throw new Error('Refusing to run tests outside an isolated local database');
  }

  await connectDatabase(testMongoUri);
  await Promise.all([User.init(), Conversation.init(), Message.init()]);
  server = createApp({ logger: testLogger, config: testConfig }).listen(
    0,
    '127.0.0.1',
  );
  await once(server, 'listening');
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  // Register User A
  const regARes = await sendJson('/api/v1/auth/register', {
    email: 'usera@example.com',
    password: 'password1234',
    name: 'User A',
  });
  const regA = await regARes.json();
  userA = regA.user;
  userAToken = regA.token;

  // Register User B
  const regBRes = await sendJson('/api/v1/auth/register', {
    email: 'userb@example.com',
    password: 'password1234',
    name: 'User B',
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

test('creates conversations with default and custom titles and enforces validation', async () => {
  // Default title
  const res1 = await sendJson('/api/v1/conversations', {}, { token: userAToken });
  assert.equal(res1.status, 201);
  const data1 = await res1.json();
  assert.equal(data1.conversation.title, 'New conversation');
  assert.equal(data1.conversation.ownerId, userA.id);
  assert.equal(data1.conversation.lastMessageAt, null);
  assert.ok(data1.conversation.id);

  // Custom title
  const res2 = await sendJson(
    '/api/v1/conversations',
    { title: 'Travel planning' },
    { token: userAToken },
  );
  assert.equal(res2.status, 201);
  const data2 = await res2.json();
  assert.equal(data2.conversation.title, 'Travel planning');

  // Rejects invalid title (too long > 120 chars)
  const res3 = await sendJson(
    '/api/v1/conversations',
    { title: 'x'.repeat(121) },
    { token: userAToken },
  );
  assert.equal(res3.status, 400);

  // Rejects empty trimmed title
  const res4 = await sendJson(
    '/api/v1/conversations',
    { title: '   ' },
    { token: userAToken },
  );
  assert.equal(res4.status, 400);

  // Rejects unknown fields
  const res5 = await sendJson(
    '/api/v1/conversations',
    { title: 'Valid', unknownField: true },
    { token: userAToken },
  );
  assert.equal(res5.status, 400);
});

test('lists conversations with pagination and isolates conversations per user', async () => {
  // Create conversation for User B
  const resB = await sendJson(
    '/api/v1/conversations',
    { title: "User B's secret chat" },
    { token: userBToken },
  );
  assert.equal(resB.status, 201);
  const bConv = (await resB.json()).conversation;

  // List conversations for User A
  const listARes = await request('/api/v1/conversations?page=1&limit=10', {
    token: userAToken,
  });
  assert.equal(listARes.status, 200);
  const listA = await listARes.json();
  assert.ok(Array.isArray(listA.conversations));
  assert.ok(listA.conversations.length >= 2);
  assert.equal(listA.pagination.page, 1);
  assert.equal(listA.pagination.limit, 10);
  // Ensure none of User B's conversations appear in User A's list
  assert.equal(
    listA.conversations.some((c) => c.id === bConv.id),
    false,
  );
  for (const c of listA.conversations) {
    assert.equal(c.ownerId, userA.id);
  }

  // List conversations for User B
  const listBRes = await request('/api/v1/conversations', { token: userBToken });
  assert.equal(listBRes.status, 200);
  const listB = await listBRes.json();
  assert.equal(listB.conversations.length, 1);
  assert.equal(listB.conversations[0].id, bConv.id);
});

test('saves user and assistant messages in chronological order and updates lastMessageAt', async () => {
  // Create conversation
  const convRes = await sendJson(
    '/api/v1/conversations',
    { title: 'Chat with assistant' },
    { token: userAToken },
  );
  const conv = (await convRes.json()).conversation;

  // Save user message (explicit role)
  const msg1Res = await sendJson(
    `/api/v1/conversations/${conv.id}/messages`,
    { content: 'Aaslema Hkili', role: 'user' },
    { token: userAToken },
  );
  assert.equal(msg1Res.status, 201);
  const msg1 = (await msg1Res.json()).message;
  assert.equal(msg1.content, 'Aaslema Hkili');
  assert.equal(msg1.role, 'user');
  assert.equal(msg1.conversationId, conv.id);

  // Save assistant message
  const msg2Res = await sendJson(
    `/api/v1/conversations/${conv.id}/messages`,
    { content: 'Aaslema ! Comment puis-je vous aider ?', role: 'assistant' },
    { token: userAToken },
  );
  assert.equal(msg2Res.status, 201);
  const msg2 = (await msg2Res.json()).message;
  assert.equal(msg2.content, 'Aaslema ! Comment puis-je vous aider ?');
  assert.equal(msg2.role, 'assistant');

  // Save another user message (default role)
  const msg3Res = await sendJson(
    `/api/v1/conversations/${conv.id}/messages`,
    { content: 'Parle-moi de Carthage' },
    { token: userAToken },
  );
  assert.equal(msg3Res.status, 201);
  const msg3 = (await msg3Res.json()).message;
  assert.equal(msg3.role, 'user');

  // Verify conversation updated with lastMessageAt
  const updatedConvRes = await request(`/api/v1/conversations/${conv.id}`, {
    token: userAToken,
  });
  assert.equal(updatedConvRes.status, 200);
  const convData = await updatedConvRes.json();
  assert.ok(convData.conversation.lastMessageAt);
  assert.equal(convData.messages.length, 3);
  assert.equal(convData.messages[0].id, msg1.id);
  assert.equal(convData.messages[1].id, msg2.id);
  assert.equal(convData.messages[2].id, msg3.id);

  // Retrieve messages via message list endpoint with pagination
  const msgListRes = await request(
    `/api/v1/conversations/${conv.id}/messages?page=1&limit=2`,
    { token: userAToken },
  );
  assert.equal(msgListRes.status, 200);
  const msgList = await msgListRes.json();
  assert.equal(msgList.messages.length, 2);
  assert.equal(msgList.pagination.total, 3);
  assert.equal(msgList.pagination.totalPages, 2);
  assert.equal(msgList.messages[0].content, 'Aaslema Hkili');
  assert.equal(msgList.messages[1].content, 'Aaslema ! Comment puis-je vous aider ?');

  // Page 2
  const page2Res = await request(
    `/api/v1/conversations/${conv.id}/messages?page=2&limit=2`,
    { token: userAToken },
  );
  assert.equal(page2Res.status, 200);
  const page2 = await page2Res.json();
  assert.equal(page2.messages.length, 1);
  assert.equal(page2.messages[0].content, 'Parle-moi de Carthage');
});

test('renames conversation and validates title requirements', async () => {
  const convRes = await sendJson(
    '/api/v1/conversations',
    { title: 'Old Title' },
    { token: userAToken },
  );
  const conv = (await convRes.json()).conversation;

  // Rename
  const patchRes = await sendJson(
    `/api/v1/conversations/${conv.id}`,
    { title: 'New Renamed Title' },
    { token: userAToken, method: 'PATCH' },
  );
  assert.equal(patchRes.status, 200);
  const patchData = await patchRes.json();
  assert.equal(patchData.conversation.title, 'New Renamed Title');

  // Invalid patch (empty body)
  const badPatch1 = await sendJson(
    `/api/v1/conversations/${conv.id}`,
    {},
    { token: userAToken, method: 'PATCH' },
  );
  assert.equal(badPatch1.status, 400);

  // Invalid patch (empty string)
  const badPatch2 = await sendJson(
    `/api/v1/conversations/${conv.id}`,
    { title: '   ' },
    { token: userAToken, method: 'PATCH' },
  );
  assert.equal(badPatch2.status, 400);
});

test('deletes conversation along with all its persisted messages', async () => {
  const convRes = await sendJson(
    '/api/v1/conversations',
    { title: 'To Delete' },
    { token: userAToken },
  );
  const conv = (await convRes.json()).conversation;

  // Add 2 messages
  await sendJson(
    `/api/v1/conversations/${conv.id}/messages`,
    { content: 'Message 1' },
    { token: userAToken },
  );
  await sendJson(
    `/api/v1/conversations/${conv.id}/messages`,
    { content: 'Message 2' },
    { token: userAToken },
  );

  // Verify messages exist in DB
  const beforeCount = await Message.countDocuments({ conversation: conv.id });
  assert.equal(beforeCount, 2);

  // Delete conversation
  const deleteRes = await request(`/api/v1/conversations/${conv.id}`, {
    token: userAToken,
    method: 'DELETE',
  });
  assert.equal(deleteRes.status, 200);
  assert.deepEqual(await deleteRes.json(), { success: true });

  // Verify conversation is gone
  const getRes = await request(`/api/v1/conversations/${conv.id}`, {
    token: userAToken,
  });
  assert.equal(getRes.status, 404);

  // Verify cascaded messages are deleted in MongoDB
  const afterCount = await Message.countDocuments({ conversation: conv.id });
  assert.equal(afterCount, 0);
});

test('enforces authentication and ownership: blocks cross-user and unauthenticated access', async () => {
  // Create a conversation belonging to User A
  const convRes = await sendJson(
    '/api/v1/conversations',
    { title: 'User A Private' },
    { token: userAToken },
  );
  const conv = (await convRes.json()).conversation;

  // 1. Unauthenticated requests are blocked (401)
  const unauthGet = await request(`/api/v1/conversations/${conv.id}`);
  assert.equal(unauthGet.status, 401);

  const unauthPostMsg = await sendJson(
    `/api/v1/conversations/${conv.id}/messages`,
    { content: 'Hack' },
  );
  assert.equal(unauthPostMsg.status, 401);

  const unauthPatch = await sendJson(
    `/api/v1/conversations/${conv.id}`,
    { title: 'Hack' },
    { method: 'PATCH' },
  );
  assert.equal(unauthPatch.status, 401);

  const unauthDelete = await request(`/api/v1/conversations/${conv.id}`, {
    method: 'DELETE',
  });
  assert.equal(unauthDelete.status, 401);

  // 2. User B tries to access User A's conversation -> 403 FORBIDDEN
  const crossGet = await request(`/api/v1/conversations/${conv.id}`, {
    token: userBToken,
  });
  assert.equal(crossGet.status, 403);
  assert.equal((await crossGet.json()).error.code, 'FORBIDDEN');

  const crossPostMsg = await sendJson(
    `/api/v1/conversations/${conv.id}/messages`,
    { content: 'Cross user message' },
    { token: userBToken },
  );
  assert.equal(crossPostMsg.status, 403);
  assert.equal((await crossPostMsg.json()).error.code, 'FORBIDDEN');

  const crossGetMsg = await request(`/api/v1/conversations/${conv.id}/messages`, {
    token: userBToken,
  });
  assert.equal(crossGetMsg.status, 403);
  assert.equal((await crossGetMsg.json()).error.code, 'FORBIDDEN');

  const crossPatch = await sendJson(
    `/api/v1/conversations/${conv.id}`,
    { title: 'Stolen Title' },
    { token: userBToken, method: 'PATCH' },
  );
  assert.equal(crossPatch.status, 403);
  assert.equal((await crossPatch.json()).error.code, 'FORBIDDEN');

  const crossDelete = await request(`/api/v1/conversations/${conv.id}`, {
    token: userBToken,
    method: 'DELETE',
  });
  assert.equal(crossDelete.status, 403);
  assert.equal((await crossDelete.json()).error.code, 'FORBIDDEN');

  // Verify conversation is still safe and intact
  const safeGet = await request(`/api/v1/conversations/${conv.id}`, {
    token: userAToken,
  });
  assert.equal(safeGet.status, 200);
  assert.equal((await safeGet.json()).conversation.title, 'User A Private');
});

test('handles invalid object IDs and non-existent conversations gracefully', async () => {
  // Invalid object ID
  const invalidIdRes = await request('/api/v1/conversations/not-an-id', {
    token: userAToken,
  });
  assert.equal(invalidIdRes.status, 400);
  assert.equal((await invalidIdRes.json()).error.code, 'INVALID_ID');

  // Non-existent valid object ID
  const fakeId = new mongoose.Types.ObjectId().toString();
  const notFoundRes = await request(`/api/v1/conversations/${fakeId}`, {
    token: userAToken,
  });
  assert.equal(notFoundRes.status, 404);
  assert.equal((await notFoundRes.json()).error.code, 'NOT_FOUND');
});

test('rejects invalid message inputs', async () => {
  const convRes = await sendJson(
    '/api/v1/conversations',
    { title: 'Validation test' },
    { token: userAToken },
  );
  const conv = (await convRes.json()).conversation;

  // Empty content
  const emptyContent = await sendJson(
    `/api/v1/conversations/${conv.id}/messages`,
    { content: '   ' },
    { token: userAToken },
  );
  assert.equal(emptyContent.status, 400);
  assert.equal((await emptyContent.json()).error.code, 'INVALID_MESSAGE');

  // Invalid role
  const badRole = await sendJson(
    `/api/v1/conversations/${conv.id}/messages`,
    { content: 'Hello', role: 'admin' },
    { token: userAToken },
  );
  assert.equal(badRole.status, 400);
  assert.equal((await badRole.json()).error.code, 'INVALID_ROLE');

  // Unknown field in message
  const unknownField = await sendJson(
    `/api/v1/conversations/${conv.id}/messages`,
    { content: 'Hello', fake: 123 },
    { token: userAToken },
  );
  assert.equal(unknownField.status, 400);
  assert.equal((await unknownField.json()).error.code, 'INVALID_INPUT');
});
