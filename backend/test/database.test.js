const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const mongoose = require('mongoose');
const test = require('node:test');
const {
  connectDatabase,
  disconnectDatabase,
} = require('../src/db/connection');

test('rejects an unavailable MongoDB server and can reconnect afterward', async () => {
  await assert.rejects(
    connectDatabase('mongodb://127.0.0.1:1/hkili_test_unavailable', {
      serverSelectionTimeoutMS: 250,
    }),
  );
  assert.equal(mongoose.connection.readyState, 0);

  const databaseName =
    `hkili_test_${process.pid}_${randomUUID().replaceAll('-', '')}`;
  const uri = `mongodb://127.0.0.1:27017/${databaseName}`;
  assert.match(databaseName, /^hkili_test_/);

  try {
    const first = await connectDatabase(uri);
    const second = await connectDatabase(uri);

    assert.equal(first, second);
    assert.equal(first.name, databaseName);
    await first.dropDatabase();
  } finally {
    await disconnectDatabase();
  }
});
