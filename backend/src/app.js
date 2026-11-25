const express = require('express');
const { readConfig } = require('./config');
const { logger: defaultLogger } = require('./logger');
const { createErrorHandler, notFoundHandler } = require('./middleware/error-handler');
const { createRequestLogger } = require('./middleware/request-logger');
const { createAuthRouter } = require('./routes/auth');
const { createConversationRouter } = require('./routes/conversations');

function createApp({
  logger = defaultLogger,
  config = readConfig(),
  geminiService,
} = {}) {
  const app = express();

  app.disable('x-powered-by');
  app.use(createRequestLogger(logger));
  app.use(express.json({ limit: '16kb' }));

  app.get('/api/v1/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  app.use('/api/v1/auth', createAuthRouter(config));
  app.use(
    '/api/v1/conversations',
    createConversationRouter(config, { geminiService, logger }),
  );
  app.use(notFoundHandler);
  app.use(createErrorHandler(logger));

  return app;
}

module.exports = { createApp };
