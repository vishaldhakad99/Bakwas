import mongoose from 'mongoose';

const blockedUserSchema = new mongoose.Schema(
  {
    blockerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    blockedUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    reason: {
      type: String,
      trim: true,
      maxlength: [200, 'Reason cannot exceed 200 characters'],
      default: ''
    }
  },
  {
    timestamps: true
  }
);

blockedUserSchema.index({ blockerId: 1, blockedUserId: 1 }, { unique: true });

export const BlockedUser = mongoose.model('BlockedUser', blockedUserSchema);
