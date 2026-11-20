import { User } from '../models/User.js';
import { Contact } from '../models/Contact.js';
import { OTPVerification } from '../models/OTPVerification.js';
import { createAndSendOTP, verifyOTP } from '../services/otp.service.js';
import { createSessionAndTokens, rotateRefreshToken, revokeSession, revokeAllSessions } from '../services/token.service.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { logger } from '../utils/logger.js';

export const requestOTP = async (req, res, next) => {
  try {
    const { countryCode, mobileNumber, purpose } = req.body;
    const cleanMobile = mobileNumber.trim().replace(/\D/g, '').replace(/^0+/, '');
    const cleanCountry = countryCode.trim().startsWith('+') ? countryCode.trim() : `+${countryCode.trim()}`;
    const formattedPhone = `${cleanCountry}${cleanMobile}`;
    const clientIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    // Check if purpose is register and user already exists
    const existingUser = await User.findOne({ formattedPhone, isDeleted: false });
    if (purpose === 'register' && existingUser) {
      throw new ApiError(400, 'An account with this phone number already exists. Please log in.');
    }

    const otpResult = await createAndSendOTP(formattedPhone, purpose, clientIp);

    const message = otpResult.isRealSms
      ? `Real cellular verification code dispatched to ${formattedPhone}`
      : 'Verification code generated successfully';

    return res.status(200).json(
      new ApiResponse(200, {
        formattedPhone,
        expiresAt: otpResult.expiresAt,
        provider: otpResult.provider,
        isRealSms: otpResult.isRealSms,
        devOtp: otpResult.devOtp
      }, message)
    );
  } catch (error) {
    next(error);
  }
};

export const verifyAndAuthenticate = async (req, res, next) => {
  try {
    const { countryCode, mobileNumber, otp, deviceId, deviceInfo, fullName, username, purpose } = req.body;
    const cleanMobile = mobileNumber.trim().replace(/\D/g, '').replace(/^0+/, '');
    const cleanCountry = countryCode.trim().startsWith('+') ? countryCode.trim() : `+${countryCode.trim()}`;
    const formattedPhone = `${cleanCountry}${cleanMobile}`;

    // Verify OTP code
    await verifyOTP(formattedPhone, otp, purpose);

    let user = await User.findOne({ formattedPhone });

    if (!user) {
      // New user registration
      user = await User.create({
        countryCode: cleanCountry,
        mobileNumber: cleanMobile,
        formattedPhone,
        fullName: (fullName && fullName.trim()) || `User ${cleanMobile.slice(-4)}`,
        username: username ? username.trim().toLowerCase() : undefined,
        isVerified: true
      });
      logger.info(`New user registered on BAKWAS: ${formattedPhone} (_id: ${user._id})`);

      // Auto-link any contacts who previously saved this phone number
      await Contact.updateMany(
        { phoneNumber: formattedPhone, contactUserId: null },
        { contactUserId: user._id }
      );
    } else {
      if (user.isDeleted) {
        // Reactivate account
        user.isDeleted = false;
        user.deletedAt = null;
      }
      user.isVerified = true;
      if (fullName) user.fullName = fullName.trim();
      if (username) user.username = username.trim().toLowerCase();
      await user.save();

      // Ensure all contacts pointing to this phone have the user._id set
      await Contact.updateMany(
        { phoneNumber: formattedPhone, contactUserId: null },
        { contactUserId: user._id }
      );
    }

    // Issue tokens & track device session
    const tokens = await createSessionAndTokens(user, deviceId, {
      ...deviceInfo,
      ip: req.ip || req.headers['x-forwarded-for'],
      userAgent: req.headers['user-agent']
    });

    // Set secure HTTP-only cookies
    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000 // 15 mins
    });

    return res.status(200).json(
      new ApiResponse(200, {
        user: {
          _id: user._id,
          countryCode: user.countryCode,
          mobileNumber: user.mobileNumber,
          formattedPhone: user.formattedPhone,
          fullName: user.fullName,
          username: user.username,
          about: user.about,
          avatar: user.avatar,
          privacySettings: user.privacySettings
        },
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken
      }, 'Authentication successful')
    );
  } catch (error) {
    next(error);
  }
};

export const refreshAccessToken = async (req, res, next) => {
  try {
    const { refreshToken, deviceId } = req.body;
    const result = await rotateRefreshToken(refreshToken, deviceId, {
      ip: req.ip || req.headers['x-forwarded-for'],
      userAgent: req.headers['user-agent']
    });

    const user = await User.findById(result.userId);
    if (!user || user.isDeleted) {
      throw new ApiError(401, 'User account no longer valid');
    }

    const { generateAccessToken } = await import('../services/token.service.js');
    const newAccessToken = generateAccessToken(user, deviceId);

    res.cookie('accessToken', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000
    });

    return res.status(200).json(
      new ApiResponse(200, {
        accessToken: newAccessToken,
        refreshToken: result.newRefreshToken
      }, 'Access token refreshed successfully')
    );
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const deviceId = req.deviceId;

    if (deviceId) {
      await revokeSession(userId, deviceId);
    }

    res.clearCookie('accessToken');

    return res.status(200).json(
      new ApiResponse(200, null, 'Logged out successfully')
    );
  } catch (error) {
    next(error);
  }
};

export const logoutAllDevices = async (req, res, next) => {
  try {
    const userId = req.user._id;
    await revokeAllSessions(userId);
    res.clearCookie('accessToken');

    return res.status(200).json(
      new ApiResponse(200, null, 'Logged out from all devices successfully')
    );
  } catch (error) {
    next(error);
  }
};

export const changePhoneNumber = async (req, res, next) => {
  try {
    const { newCountryCode, newMobileNumber, otp } = req.body;
    const newFormattedPhone = `${newCountryCode.trim()}${newMobileNumber.trim()}`;

    // Verify OTP sent to new phone number
    await verifyOTP(newFormattedPhone, otp, 'change_phone');

    // Ensure phone is not taken
    const existing = await User.findOne({ formattedPhone: newFormattedPhone, _id: { $ne: req.user._id } });
    if (existing) {
      throw new ApiError(400, 'This phone number is already registered to another account');
    }

    req.user.countryCode = newCountryCode.trim();
    req.user.mobileNumber = newMobileNumber.trim();
    req.user.formattedPhone = newFormattedPhone;
    await req.user.save();

    return res.status(200).json(
      new ApiResponse(200, {
        formattedPhone: req.user.formattedPhone
      }, 'Phone number updated successfully')
    );
  } catch (error) {
    next(error);
  }
};

export const deleteAccount = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Soft delete user
    req.user.isDeleted = true;
    req.user.deletedAt = new Date();
    req.user.fullName = 'Deleted User';
    req.user.about = '';
    req.user.avatar = { url: '', publicId: '' };
    await req.user.save();

    // Revoke all sessions
    await revokeAllSessions(userId);
    res.clearCookie('accessToken');

    return res.status(200).json(
      new ApiResponse(200, null, 'Account deleted successfully')
    );
  } catch (error) {
    next(error);
  }
};
