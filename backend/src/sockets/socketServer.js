import { Server } from 'socket.io';
import { socketAuth } from './socketAuth.js';
import { registerPresenceHandlers } from './presenceHandler.js';
import { registerChatHandlers } from './chatHandler.js';
import { registerCallHandlers } from './callHandler.js';
import { ENV } from '../config/env.js';
import { logger } from '../utils/logger.js';

export const initSocketServer = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        callback(null, true);
      },
      credentials: true,
      methods: ['GET', 'POST']
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket', 'polling']
  });

  // Socket Authentication Middleware
  io.use(socketAuth);

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id} (User: ${socket.user.fullName} / ID: ${socket.user._id})`);

    registerPresenceHandlers(io, socket);
    registerChatHandlers(io, socket);
    registerCallHandlers(io, socket);

    socket.on('error', (err) => {
      logger.error(`Socket Error on ${socket.id}:`, err.message);
    });
  });

  return io;
};
