const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const test = require('node:test');
const { Conversation } = require('../src/models/conversation');
const { Message } = require('../src/models/message');
const { User } = require('../src/models/user');

test('user model normalizes email and excludes password hashes by default', () => {
  const user = new User({
    email: '  USER@example.com ',
    passwordHash: 'bcrypt-hash',
  });

  assert.equal(user.email, 'user@example.com');
  assert.equal(user.toJSON().passwordHash, undefined);
});

test('models validate email, conversation ownership, and message roles', async () => {
  const invalidUser = new User({
    email: 'not-an-email',
    passwordHash: 'bcrypt-hash',
  });
  const invalidConversation = new Conversation({
    title: 'Untitled',
  });
  const invalidMessage = new Message({
    conversation: new mongoose.Types.ObjectId(),
    role: 'system',
    content: 'not a supported role',
  });

  await assert.rejects(
    invalidUser.validate(),
    (error) => Boolean(error.errors.email),
  );
  await assert.rejects(
    invalidConversation.validate(),
    (error) => Boolean(error.errors.owner),
  );
  await assert.rejects(
    invalidMessage.validate(),
    (error) => Boolean(error.errors.role),
  );
});
