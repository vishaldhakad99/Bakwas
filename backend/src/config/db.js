import mongoose from 'mongoose';
import { ENV } from './env.js';
import { logger } from '../utils/logger.js';

let isConnected = false;

export const connectDB = async (customUri = null) => {
  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  let uri = customUri || ENV.MONGODB_URI;

  // Auto-detect template placeholders and fallback to local MongoDB
  if (uri && (uri.includes('<username>') || uri.includes('<password>') || uri.includes('cluster0.xxxxx'))) {
    logger.warn('MONGODB_URI contains unconfigured template placeholders. Falling back to local MongoDB (mongodb://127.0.0.1:27017/bakwas).');
    uri = 'mongodb://127.0.0.1:27017/bakwas';
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxPoolSize: 50,
      minPoolSize: 5,
    });

    isConnected = true;
    logger.info(`MongoDB Connected successfully: ${conn.connection.host} / Database: ${conn.connection.name}`);

    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB runtime connection error:', err);
      isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected. Attempting reconnection...');
      isConnected = false;
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected successfully.');
      isConnected = true;
    });

    return conn;
  } catch (error) {
    logger.error(`MongoDB Connection Failure: ${error.message}`);
    // In production, exit or retry. Do not exit in test mode.
    if (ENV.NODE_ENV === 'production') {
      logger.error('Critical database connection failure in production. Exiting process.');
      process.exit(1);
    }
    throw error;
  }
};

export const disconnectDB = async () => {
  if (isConnected) {
    await mongoose.disconnect();
    isConnected = false;
    logger.info('MongoDB disconnected cleanly.');
  }
};
