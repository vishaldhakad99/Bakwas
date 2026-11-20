import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000', 10),
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bakwas',

  // JWT configuration
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'bakwas_super_secret_access_jwt_key_2026_xyz!',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'bakwas_super_secret_refresh_jwt_key_2026_abc!',
  JWT_ACCESS_EXPIRY: process.env.JWT_ACCESS_EXPIRY || '15m',
  JWT_REFRESH_EXPIRY: process.env.JWT_REFRESH_EXPIRY || '30d',

  // SMS / OTP Provider configuration
  SMS_PROVIDER: process.env.SMS_PROVIDER || 'auto', // 'fast2sms' | 'twilio' | 'msg91' | 'twofactor' | 'mock' | 'auto'
  FAST2SMS_API_KEY: process.env.FAST2SMS_API_KEY || '',
  TWO_FACTOR_API_KEY: process.env.TWO_FACTOR_API_KEY || '',
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID || '',
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN || '',
  TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER || '',
  MSG91_AUTH_KEY: process.env.MSG91_AUTH_KEY || '',
  MSG91_TEMPLATE_ID: process.env.MSG91_TEMPLATE_ID || '',

  // Cloudinary / Media storage configuration
  STORAGE_PROVIDER: process.env.STORAGE_PROVIDER || 'local', // 'cloudinary' | 'local'
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || '',
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || '',

  // WebPush VAPID configuration
  VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY || '',
  VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY || '',
  VAPID_SUBJECT: process.env.VAPID_SUBJECT || 'mailto:support@bakwas.chat',

  // TURN/STUN configuration
  TURN_URL: process.env.TURN_URL || '',
  TURN_USERNAME: process.env.TURN_USERNAME || '',
  TURN_CREDENTIAL: process.env.TURN_CREDENTIAL || ''
};
