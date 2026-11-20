import mongoose from 'mongoose';

const pushSubscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    deviceId: {
      type: String,
      default: ''
    },
    endpoint: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    keys: {
      p256dh: {
        type: String,
        required: true,
        trim: true
      },
      auth: {
        type: String,
        required: true,
        trim: true
      }
    },
    userAgent: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

pushSubscriptionSchema.index({ userId: 1, deviceId: 1 });

export const PushSubscription = mongoose.model('PushSubscription', pushSubscriptionSchema);
