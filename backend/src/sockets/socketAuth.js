import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';
import { User } from '../models/User.js';
import { DeviceSession } from '../models/DeviceSession.js';
import { logger } from '../utils/logger.js';

export const socketAuth = async (socket, next) => {
  try {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace('Bearer ', '');

    if (!token) {
      return next(new Error('Authentication token missing'));
    }

    const decoded = jwt.verify(token, ENV.JWT_ACCESS_SECRET);
    const user = await User.findById(decoded.sub);

    if (!user || user.isDeleted) {
      return next(new Error('User account not found or deactivated'));
    }

    socket.user = {
      _id: user._id.toString(),
      fullName: user.fullName,
      username: user.username,
      formattedPhone: user.formattedPhone,
      avatar: user.avatar
    };
    socket.deviceId = decoded.deviceId || socket.handshake.auth?.deviceId;

    // Update active device session timestamp
    if (socket.deviceId) {
      DeviceSession.findOneAndUpdate(
        { userId: user._id, deviceId: socket.deviceId },
        { lastActiveAt: new Date(), isActive: true }
      ).catch((err) => logger.warn('Failed to update session on socket connect:', err.message));
    }

    next();
  } catch (error) {
    logger.warn('Socket authentication error:', error.message);
    next(new Error('Invalid or expired socket token'));
  }
};
