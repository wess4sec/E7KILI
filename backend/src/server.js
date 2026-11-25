const { loadEnvironment } = require('./load-environment');
loadEnvironment();

const { createApp } = require('./app');
const { readConfig } = require('./config');
const { connectDatabase, disconnectDatabase } = require('./db/connection');
const { logger } = require('./logger');

const config = readConfig();
const app = createApp({ logger, config });
let server;

async function start() {
  try {
    await connectDatabase(config.mongodbUri);
    logger.info({ nodeEnv: config.nodeEnv }, 'database connected');

    server = app.listen(config.port, () => {
      logger.info({ port: config.port, nodeEnv: config.nodeEnv }, 'server listening');
    });

    server.on('error', (error) => {
      logger.error({ errorType: error.name }, 'server failed');
      process.exitCode = 1;
    });
  } catch (error) {
    logger.error({ errorType: error.name }, 'server failed to start');
    process.exitCode = 1;
  }
}

async function shutdown(signal) {
  logger.info({ signal }, 'server shutting down');
  if (server) {
    server.close(async (error) => {
      if (error) {
        logger.error({ errorType: error.name }, 'server shutdown failed');
        process.exitCode = 1;
      }
      try {
        await disconnectDatabase();
      } catch (dbError) {
        logger.error({ errorType: dbError.name }, 'database disconnect failed');
      }
    });
  } else {
    try {
      await disconnectDatabase();
    } catch (dbError) {
      logger.error({ errorType: dbError.name }, 'database disconnect failed');
    }
  }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

start();
