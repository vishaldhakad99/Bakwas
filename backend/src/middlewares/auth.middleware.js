import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';
import { User } from '../models/User.js';
import { DeviceSession } from '../models/DeviceSession.js';
import { ApiError } from '../utils/apiError.js';

export const verifyJWT = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      throw new ApiError(401, 'Authentication token missing or invalid');
    }

    let decoded;
    try {
      decoded = jwt.verify(token, ENV.JWT_ACCESS_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw new ApiError(401, 'Access token has expired. Please refresh token.');
      }
      throw new ApiError(401, 'Invalid authentication token');
    }

    const user = await User.findById(decoded.sub);
    if (!user || user.isDeleted) {
      throw new ApiError(401, 'User account not found or has been deactivated');
    }

    // Verify device session is active if deviceId is provided
    if (decoded.deviceId) {
      const session = await DeviceSession.findOne({
        userId: user._id,
        deviceId: decoded.deviceId,
        isActive: true
      });

      if (!session) {
        throw new ApiError(401, 'Session has been revoked or expired');
      }

      // Update last active
      session.lastActiveAt = new Date();
      await session.save();
    }

    req.user = user;
    req.deviceId = decoded.deviceId;
    next();
  } catch (error) {
    next(error);
  }
};
