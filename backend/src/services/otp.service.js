import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { ENV } from '../config/env.js';
import { OTPVerification } from '../models/OTPVerification.js';
import { ApiError } from '../utils/apiError.js';
import { logger } from '../utils/logger.js';

export const generateSecureOTP = () => {
  // Generate secure 6-digit numeric OTP
  return crypto.randomInt(100000, 999999).toString();
};

export const sendSMS = async (formattedPhone, otp) => {
  const message = `Your BAKWAS verification code is ${otp}. Valid for 5 minutes. Do not share this OTP with anyone.`;

  // Twilio integration
  if (ENV.SMS_PROVIDER === 'twilio' && ENV.TWILIO_ACCOUNT_SID && ENV.TWILIO_AUTH_TOKEN && ENV.TWILIO_PHONE_NUMBER) {
    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${ENV.TWILIO_ACCOUNT_SID}/Messages.json`;
      const auth = Buffer.from(`${ENV.TWILIO_ACCOUNT_SID}:${ENV.TWILIO_AUTH_TOKEN}`).toString('base64');
      const params = new URLSearchParams();
      params.append('To', formattedPhone);
      params.append('From', ENV.TWILIO_PHONE_NUMBER);
      params.append('Body', message);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Twilio SMS failed');
      }
      logger.info(`Twilio SMS dispatched to ${formattedPhone}, SID: ${data.sid}`);
      return { success: true, provider: 'twilio', messageId: data.sid };
    } catch (err) {
      logger.error('Twilio SMS error:', err.message);
      throw new ApiError(500, `SMS Delivery Failed via Twilio: ${err.message}`);
    }
  }

  // MSG91 integration
  if (ENV.SMS_PROVIDER === 'msg91' && ENV.MSG91_AUTH_KEY) {
    try {
      const url = `https://control.msg91.com/api/v5/otp?template_id=${ENV.MSG91_TEMPLATE_ID}&mobile=${formattedPhone.replace('+', '')}&authkey=${ENV.MSG91_AUTH_KEY}&otp=${otp}`;
      const response = await fetch(url, { method: 'POST' });
      const data = await response.json();
      if (data.type === 'error') {
        throw new Error(data.message || 'MSG91 OTP failed');
      }
      logger.info(`MSG91 SMS dispatched to ${formattedPhone}`);
      return { success: true, provider: 'msg91' };
    } catch (err) {
      logger.error('MSG91 SMS error:', err.message);
      throw new ApiError(500, `SMS Delivery Failed via MSG91: ${err.message}`);
    }
  }

  // Development / Test mode logging
  logger.info(`[SMS DISPATCH - DEV/TEST MODE] To: ${formattedPhone} | Code: ${otp} | Notice: Set SMS_PROVIDER=twilio or msg91 in production`);
  return { success: true, provider: 'dev-mode', devOtp: ENV.NODE_ENV !== 'production' ? otp : undefined };
};

export const createAndSendOTP = async (formattedPhone, purpose = 'login', ip = '') => {
  // Check rate limit: max 1 OTP request every 45 seconds per phone
  const recentOtp = await OTPVerification.findOne({
    formattedPhone,
    purpose,
    createdAt: { $gte: new Date(Date.now() - 45 * 1000) }
  });

  if (recentOtp) {
    throw new ApiError(429, 'Please wait 45 seconds before requesting another OTP');
  }

  const otp = generateSecureOTP();
  const salt = await bcrypt.genSalt(10);
  const otpHash = await bcrypt.hash(otp, salt);

  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes validity

  // Invalidate any previous unverified OTPs for this phone and purpose
  await OTPVerification.deleteMany({ formattedPhone, purpose, isVerified: false });

  await OTPVerification.create({
    formattedPhone,
    otpHash,
    attempts: 0,
    maxAttempts: 3,
    expiresAt,
    isVerified: false,
    purpose,
    ip
  });

  const sendResult = await sendSMS(formattedPhone, otp);
  return {
    success: true,
    expiresAt,
    provider: sendResult.provider,
    devOtp: sendResult.devOtp
  };
};

export const verifyOTP = async (formattedPhone, candidateOtp, purpose = 'login') => {
  const otpRecord = await OTPVerification.findOne({
    formattedPhone,
    purpose,
    isVerified: false
  }).sort({ createdAt: -1 });

  if (!otpRecord) {
    throw new ApiError(400, 'No active OTP verification session found. Please request a new OTP.');
  }

  if (new Date() > otpRecord.expiresAt) {
    await OTPVerification.deleteOne({ _id: otpRecord._id });
    throw new ApiError(400, 'OTP has expired. Please request a new one.');
  }

  if (otpRecord.attempts >= otpRecord.maxAttempts) {
    await OTPVerification.deleteOne({ _id: otpRecord._id });
    throw new ApiError(429, 'Maximum verification attempts exceeded. Please request a new OTP.');
  }

  const isMatch = await bcrypt.compare(candidateOtp.trim(), otpRecord.otpHash);

  if (!isMatch) {
    otpRecord.attempts += 1;
    await otpRecord.save();
    const remaining = otpRecord.maxAttempts - otpRecord.attempts;
    throw new ApiError(400, `Invalid OTP code. ${remaining} attempt(s) remaining.`);
  }

  // Mark verified
  otpRecord.isVerified = true;
  await otpRecord.save();

  return true;
};
