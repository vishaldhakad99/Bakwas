import mongoose from 'mongoose';

const callSchema = new mongoose.Schema(
  {
    caller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation'
    },
    callType: {
      type: String,
      enum: ['voice', 'video'],
      required: true
    },
    status: {
      type: String,
      enum: ['initiated', 'ringing', 'accepted', 'rejected', 'missed', 'ended', 'busy'],
      default: 'initiated',
      index: true
    },
    startedAt: {
      type: Date,
      default: Date.now
    },
    acceptedAt: {
      type: Date,
      default: null
    },
    endedAt: {
      type: Date,
      default: null
    },
    durationSeconds: {
      type: Number,
      default: 0
    },
    endReason: {
      type: String,
      enum: ['completed', 'declined', 'timeout', 'network_error', 'busy', 'cancelled', 'caller_ended'],
      default: 'completed'
    }
  },
  {
    timestamps: true
  }
);

callSchema.index({ caller: 1, createdAt: -1 });
callSchema.index({ receiver: 1, createdAt: -1 });

export const Call = mongoose.model('Call', callSchema);
