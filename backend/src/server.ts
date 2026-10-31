import { createApp } from './app';
import { env } from './config/env';
import { logger } from './utils/logger';
import { disconnectDatabase } from './config/database';

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(`=======================================================`);
  logger.info(` Brightloop Subscription Management System — API Server`);
  logger.info(` Environment: ${env.NODE_ENV}`);
  logger.info(` Port:        ${env.PORT}`);
  logger.info(` Health check: http://localhost:${env.PORT}${env.API_PREFIX}/health`);
  logger.info(`=======================================================`);
});

// Graceful shutdown handling
const handleGracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Shutting down server gracefully...`);
  server.close(async () => {
    logger.info('HTTP server closed.');
    await disconnectDatabase();
    process.exit(0);
  });

  // Force exit after 10 seconds if graceful shutdown hangs
  setTimeout(() => {
    logger.error('Forced shutdown due to timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));
process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));

export default server;
