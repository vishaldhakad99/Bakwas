import mongoose from 'mongoose';

const deviceSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    deviceId: {
      type: String,
      required: true,
      trim: true
    },
    deviceName: {
      type: String,
      default: 'Unknown Device',
      trim: true
    },
    browser: {
      type: String,
      default: 'Unknown'
    },
    os: {
      type: String,
      default: 'Unknown'
    },
    ip: {
      type: String,
      default: ''
    },
    userAgent: {
      type: String,
      default: ''
    },
    lastActiveAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    revokedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

deviceSessionSchema.index({ userId: 1, deviceId: 1 }, { unique: true });

export const DeviceSession = mongoose.model('DeviceSession', deviceSessionSchema);
