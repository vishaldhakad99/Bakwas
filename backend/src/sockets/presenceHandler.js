import { User } from '../models/User.js';
import { logger } from '../utils/logger.js';

// Global map: userId -> Set of socketIds
export const onlineUsers = new Map();

export const registerPresenceHandlers = (io, socket) => {
  const userId = socket.user._id;

  // Add socket to user's set of active sockets
  if (!onlineUsers.has(userId)) {
    onlineUsers.set(userId, new Set());
  }
  onlineUsers.get(userId).add(socket.id);

  // Join user's personal room for direct events
  socket.join(`user_${userId}`);

  // Mark user online in DB if this is their first active socket
  if (onlineUsers.get(userId).size === 1) {
    User.findByIdAndUpdate(userId, { isOnline: true }).catch((err) =>
      logger.error('Failed to update user isOnline true:', err.message)
    );

    // Broadcast presence update
    io.emit('user:presence', {
      userId,
      isOnline: true,
      lastSeen: new Date()
    });
  }

  // Handle client query for online status of users
  socket.on('presence:check', (userIds, callback) => {
    if (typeof callback === 'function' && Array.isArray(userIds)) {
      const result = {};
      userIds.forEach((id) => {
        result[id] = onlineUsers.has(id) && onlineUsers.get(id).size > 0;
      });
      callback(result);
    }
  });

  // Disconnect handler
  socket.on('disconnect', () => {
    if (onlineUsers.has(userId)) {
      onlineUsers.get(userId).delete(socket.id);

      if (onlineUsers.get(userId).size === 0) {
        onlineUsers.delete(userId);
        const lastSeen = new Date();

        User.findByIdAndUpdate(userId, { isOnline: false, lastSeen }).catch((err) =>
          logger.error('Failed to update user isOnline false:', err.message)
        );

        io.emit('user:presence', {
          userId,
          isOnline: false,
          lastSeen
        });
      }
    }
  });
};
