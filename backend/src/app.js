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
  app.use((req, res, next) => {
    const origin = req.get('origin');
    const allowedOrigin =
      origin &&
      /^http:\/\/(?:localhost|127\.0\.0\.1|192\.168\.100\.116)(?::\d+)?$/.test(
        origin,
      );

    if (!allowedOrigin) {
      if (req.method === 'OPTIONS') {
        return res.sendStatus(403);
      }
      return next();
    }

    res.setHeader('Access-Control-Allow-Origin', origin);
    res.vary('Origin');

    if (req.method === 'OPTIONS') {
      res.setHeader(
        'Access-Control-Allow-Methods',
        'GET, POST, PATCH, DELETE, OPTIONS',
      );
      res.setHeader(
        'Access-Control-Allow-Headers',
        'Accept, Authorization, Content-Type',
      );
      res.setHeader('Access-Control-Max-Age', '3600');
      return res.sendStatus(204);
    }

    return next();
  });
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
