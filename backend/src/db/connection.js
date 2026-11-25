const mongoose = require('mongoose');

let connectionPromise;
let connectedUri;

function connectDatabase(uri, options = {}) {
  if (mongoose.connection.readyState === 1) {
    if (connectedUri !== uri) {
      return Promise.reject(
        new Error('A different MongoDB URI is already connected'),
      );
    }
    return Promise.resolve(mongoose.connection);
  }

  if (connectionPromise) {
    if (connectedUri !== uri) {
      return Promise.reject(
        new Error('A different MongoDB connection is already in progress'),
      );
    }
    return connectionPromise;
  }

  connectedUri = uri;
  connectionPromise = mongoose
    .connect(uri, { serverSelectionTimeoutMS: 5000, ...options })
    .then(() => mongoose.connection)
    .catch((error) => {
      connectionPromise = undefined;
      connectedUri = undefined;
      throw error;
    });

  return connectionPromise;
}

async function disconnectDatabase() {
  try {
    await mongoose.disconnect();
  } finally {
    connectionPromise = undefined;
    connectedUri = undefined;
  }
}

module.exports = { connectDatabase, disconnectDatabase };
