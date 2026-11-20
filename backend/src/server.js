import http from 'http';
import app from './app.js';
import { ENV } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';
import { initSocketServer } from './sockets/socketServer.js';
import { logger } from './utils/logger.js';

const httpServer = http.createServer(app);
const io = initSocketServer(httpServer);

const startServer = async () => {
  try {
    await connectDB();

    httpServer.listen(ENV.PORT, () => {
      logger.info(`=======================================================`);
      logger.info(`  BAKWAS REAL-TIME PLATFORM BACKEND STARTED `);
      logger.info(`  Server running on port: ${ENV.PORT}`);
      logger.info(`  Environment: ${ENV.NODE_ENV}`);
      logger.info(`  Client URL: ${ENV.CLIENT_URL}`);
      logger.info(`=======================================================`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

// Graceful Shutdown handling
const handleGracefulShutdown = async (signal) => {
  logger.info(`${signal} received. Initiating graceful shutdown...`);

  httpServer.close(async () => {
    logger.info('HTTP & Socket.IO servers closed.');
    await disconnectDB();
    logger.info('Clean shutdown complete.');
    process.exit(0);
  });

  // Force close after 10s if dangling connections
  setTimeout(() => {
    logger.error('Forced shutdown due to timeout.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));
process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));

// Only auto-start if not required as a module in tests
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export { httpServer, io, app };
