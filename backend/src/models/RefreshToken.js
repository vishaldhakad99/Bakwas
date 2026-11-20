import mongoose from 'mongoose';

const refreshTokenSchema = new mongoose.Schema(
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
      trim: true,
      index: true
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: '30d' }
    },
    revoked: {
      type: Boolean,
      default: false
    },
    revokedAt: {
      type: Date,
      default: null
    },
    replacedByTokenHash: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true
  }
);

refreshTokenSchema.index({ userId: 1, deviceId: 1 });

export const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);
