import mongoose from 'mongoose';

const otpVerificationSchema = new mongoose.Schema(
  {
    formattedPhone: {
      type: String,
      required: true,
      index: true,
      trim: true
    },
    otpHash: {
      type: String,
      required: true
    },
    attempts: {
      type: Number,
      default: 0
    },
    maxAttempts: {
      type: Number,
      default: 3
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: '10m' } // auto-cleanup expired records
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    purpose: {
      type: String,
      enum: ['register', 'login', 'change_phone'],
      default: 'login'
    },
    ip: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

otpVerificationSchema.index({ formattedPhone: 1, purpose: 1 });

export const OTPVerification = mongoose.model('OTPVerification', otpVerificationSchema);
