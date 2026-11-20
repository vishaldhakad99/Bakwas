import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { ENV } from '../config/env.js';
import { RefreshToken } from '../models/RefreshToken.js';
import { DeviceSession } from '../models/DeviceSession.js';
import { ApiError } from '../utils/apiError.js';
import { logger } from '../utils/logger.js';

export const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

export const generateAccessToken = (user, deviceId) => {
  return jwt.sign(
    {
      sub: user._id.toString(),
      phone: user.formattedPhone,
      username: user.username,
      deviceId
    },
    ENV.JWT_ACCESS_SECRET,
    { expiresIn: ENV.JWT_ACCESS_EXPIRY }
  );
};

export const generateRefreshToken = () => {
  return crypto.randomBytes(40).toString('hex');
};

export const createSessionAndTokens = async (user, deviceId, deviceInfo = {}) => {
  const accessToken = generateAccessToken(user, deviceId);
  const rawRefreshToken = generateRefreshToken();
  const tokenHash = hashToken(rawRefreshToken);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

  // Save refresh token record
  await RefreshToken.create({
    userId: user._id,
    deviceId,
    tokenHash,
    expiresAt,
    revoked: false
  });

  // Upsert DeviceSession
  await DeviceSession.findOneAndUpdate(
    { userId: user._id, deviceId },
    {
      userId: user._id,
      deviceId,
      deviceName: deviceInfo.deviceName || 'Web Browser',
      browser: deviceInfo.browser || 'Browser',
      os: deviceInfo.os || 'OS',
      ip: deviceInfo.ip || '',
      userAgent: deviceInfo.userAgent || '',
      lastActiveAt: new Date(),
      isActive: true,
      revokedAt: null
    },
    { upsert: true, new: true }
  );

  return { accessToken, refreshToken: rawRefreshToken };
};

export const rotateRefreshToken = async (rawRefreshToken, deviceId, deviceInfo = {}) => {
  const tokenHash = hashToken(rawRefreshToken);
  const existingToken = await RefreshToken.findOne({ tokenHash });

  if (!existingToken) {
    throw new ApiError(401, 'Invalid or expired refresh token');
  }

  // Token reuse detection: if token is already revoked, someone may have stolen it!
  if (existingToken.revoked) {
    logger.warn(`Potential token theft detected for user ${existingToken.userId}. Revoking all sessions.`);
    await RefreshToken.updateMany(
      { userId: existingToken.userId },
      { revoked: true, revokedAt: new Date() }
    );
    await DeviceSession.updateMany(
      { userId: existingToken.userId },
      { isActive: false, revokedAt: new Date() }
    );
    throw new ApiError(401, 'Session compromised. Please log in again.');
  }

  if (new Date() > existingToken.expiresAt) {
    existingToken.revoked = true;
    existingToken.revokedAt = new Date();
    await existingToken.save();
    throw new ApiError(401, 'Refresh token expired');
  }

  // Generate new tokens
  const newRawRefreshToken = generateRefreshToken();
  const newTokenHash = hashToken(newRawRefreshToken);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  // Revoke old token and link to new one
  existingToken.revoked = true;
  existingToken.revokedAt = new Date();
  existingToken.replacedByTokenHash = newTokenHash;
  await existingToken.save();

  // Create new refresh token
  await RefreshToken.create({
    userId: existingToken.userId,
    deviceId,
    tokenHash: newTokenHash,
    expiresAt,
    revoked: false
  });

  // Update session
  await DeviceSession.findOneAndUpdate(
    { userId: existingToken.userId, deviceId },
    {
      lastActiveAt: new Date(),
      isActive: true,
      ...(deviceInfo.ip ? { ip: deviceInfo.ip } : {}),
      ...(deviceInfo.userAgent ? { userAgent: deviceInfo.userAgent } : {})
    }
  );

  return {
    userId: existingToken.userId,
    newRefreshToken: newRawRefreshToken
  };
};

export const revokeSession = async (userId, deviceId) => {
  await RefreshToken.updateMany(
    { userId, deviceId },
    { revoked: true, revokedAt: new Date() }
  );
  await DeviceSession.findOneAndUpdate(
    { userId, deviceId },
    { isActive: false, revokedAt: new Date() }
  );
};

export const revokeAllSessions = async (userId) => {
  await RefreshToken.updateMany(
    { userId },
    { revoked: true, revokedAt: new Date() }
  );
  await DeviceSession.updateMany(
    { userId },
    { isActive: false, revokedAt: new Date() }
  );
};
