import { User } from '../models/User.js';
import { DeviceSession } from '../models/DeviceSession.js';
import { BlockedUser } from '../models/BlockedUser.js';
import { RefreshToken } from '../models/RefreshToken.js';
import { cloudinary, isCloudinaryConfigured } from '../config/storage.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';

export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-__v');
    const activeSessionsCount = await DeviceSession.countDocuments({ userId: user._id, isActive: true });

    return res.status(200).json(
      new ApiResponse(200, {
        user,
        activeSessionsCount
      })
    );
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const { fullName, username, about } = req.body;
    const user = req.user;

    if (username && username !== user.username) {
      const existing = await User.findOne({ username: username.toLowerCase(), _id: { $ne: user._id } });
      if (existing) {
        throw new ApiError(400, 'Username is already taken');
      }
      user.username = username.toLowerCase();
    }

    if (fullName) user.fullName = fullName.trim();
    if (about !== undefined) user.about = about.trim();

    await user.save();

    return res.status(200).json(
      new ApiResponse(200, user, 'Profile updated successfully')
    );
  } catch (error) {
    next(error);
  }
};

export const updateAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      throw new ApiError(400, 'Please select an image file to upload');
    }

    const user = req.user;
    const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https' || req.protocol === 'https';
    const protocol = isHttps ? 'https' : 'http';
    const baseUrl = `${protocol}://${req.get('host')}`;
    let avatarUrl = `${baseUrl}/uploads/${req.file.filename}`;
    let publicId = req.file.filename;

    if (isCloudinaryConfigured) {
      try {
        const uploadResult = await cloudinary.uploader.upload(req.file.path, {
          folder: 'bakwas/avatars',
          transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }]
        });
        avatarUrl = uploadResult.secure_url;
        publicId = uploadResult.public_id;
        if (fs.existsSync(req.file.path)) {
          fs.unlink(req.file.path, () => {});
        }
      } catch (cloudErr) {
        avatarUrl = `${baseUrl}/uploads/${req.file.filename}`;
        publicId = req.file.filename;
      }
    }

    user.avatar = {
      url: avatarUrl,
      publicId
    };
    await user.save();

    const io = req.app.get('io');
    if (io) {
      io.emit('user:avatar_updated', {
        userId: user._id.toString(),
        avatar: user.avatar
      });
    }

    return res.status(200).json(
      new ApiResponse(200, user.avatar, 'Profile picture updated successfully')
    );
  } catch (error) {
    next(error);
  }
};

export const removeAvatar = async (req, res, next) => {
  try {
    const user = req.user;
    user.avatar = { url: '', publicId: '' };
    await user.save();

    const io = req.app.get('io');
    if (io) {
      io.emit('user:avatar_updated', {
        userId: user._id.toString(),
        avatar: user.avatar
      });
    }

    return res.status(200).json(
      new ApiResponse(200, null, 'Profile picture removed successfully')
    );
  } catch (error) {
    next(error);
  }
};

export const updatePrivacySettings = async (req, res, next) => {
  try {
    const updates = req.body;
    const user = req.user;

    user.privacySettings = {
      ...user.privacySettings.toObject(),
      ...updates
    };

    await user.save();

    return res.status(200).json(
      new ApiResponse(200, user.privacySettings, 'Privacy settings updated successfully')
    );
  } catch (error) {
    next(error);
  }
};

export const getSessions = async (req, res, next) => {
  try {
    const sessions = await DeviceSession.find({
      userId: req.user._id,
      isActive: true
    }).sort({ lastActiveAt: -1 });

    const formattedSessions = sessions.map((s) => ({
      ...s.toObject(),
      isCurrent: s.deviceId === req.deviceId
    }));

    return res.status(200).json(
      new ApiResponse(200, formattedSessions)
    );
  } catch (error) {
    next(error);
  }
};

export const revokeSessionById = async (req, res, next) => {
  try {
    const { deviceId } = req.params;
    const userId = req.user._id;

    if (deviceId === req.deviceId) {
      throw new ApiError(400, 'Cannot revoke current session via this endpoint. Use logout instead.');
    }

    await RefreshToken.updateMany(
      { userId, deviceId },
      { revoked: true, revokedAt: new Date() }
    );

    await DeviceSession.findOneAndUpdate(
      { userId, deviceId },
      { isActive: false, revokedAt: new Date() }
    );

    return res.status(200).json(
      new ApiResponse(200, null, 'Device session revoked successfully')
    );
  } catch (error) {
    next(error);
  }
};

export const searchUsers = async (req, res, next) => {
  try {
    const { query } = req.query;
    const cleanQuery = query ? query.trim() : '';

    // Find users blocked by or who blocked the current user
    const blockedRecords = await BlockedUser.find({
      $or: [{ blockerId: req.user._id }, { blockedUserId: req.user._id }]
    });

    const excludedUserIds = blockedRecords.map((b) =>
      b.blockerId.toString() === req.user._id.toString() ? b.blockedUserId : b.blockerId
    );
    excludedUserIds.push(req.user._id);

    // Filter criteria: match query or return recent registered users if empty
    const filter = {
      _id: { $nin: excludedUserIds },
      isDeleted: false
    };

    if (cleanQuery.length > 0) {
      filter.$or = [
        { formattedPhone: { $regex: cleanQuery, $options: 'i' } },
        { username: { $regex: cleanQuery, $options: 'i' } },
        { fullName: { $regex: cleanQuery, $options: 'i' } }
      ];
    }

    const users = await User.find(filter)
      .select('fullName username formattedPhone avatar about isOnline lastSeen privacySettings')
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(20);

    // Filter privacy restrictions
    const sanitizedUsers = users.map((u) => {
      const uObj = u.toObject();
      if (u.privacySettings?.avatar === 'nobody') {
        uObj.avatar = { url: '', publicId: '' };
      }
      if (u.privacySettings?.about === 'nobody') {
        uObj.about = '';
      }
      return uObj;
    });

    return res.status(200).json(
      new ApiResponse(200, sanitizedUsers)
    );
  } catch (error) {
    next(error);
  }
};
