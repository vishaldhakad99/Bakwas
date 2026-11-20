import mongoose from 'mongoose';

const deliveryStatusSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    status: {
      type: String,
      enum: ['sent', 'delivered', 'read'],
      default: 'sent'
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

const reactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    emoji: {
      type: String,
      required: true,
      trim: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    messageType: {
      type: String,
      enum: ['text', 'image', 'video', 'audio', 'document', 'pdf', 'call_log'],
      default: 'text',
      required: true
    },
    content: {
      type: String,
      trim: true,
      default: ''
    },
    media: {
      url: { type: String, default: '' },
      publicId: { type: String, default: '' },
      mimeType: { type: String, default: '' },
      fileName: { type: String, default: '' },
      fileSize: { type: Number, default: 0 },
      duration: { type: Number, default: 0 },
      thumbnail: { type: String, default: '' }
    },
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null
    },
    forwarded: {
      type: Boolean,
      default: false
    },
    isEdited: {
      type: Boolean,
      default: false
    },
    editedAt: {
      type: Date,
      default: null
    },
    deletedForEveryone: {
      type: Boolean,
      default: false
    },
    deletedForUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    status: {
      type: String,
      enum: ['sending', 'sent', 'delivered', 'read'],
      default: 'sent'
    },
    deliveryStatus: [deliveryStatusSchema],
    reactions: [reactionSchema],
    starredBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    isPinned: {
      type: Boolean,
      default: false
    },
    pinnedAt: {
      type: Date,
      default: null
    },
    pinnedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    callLog: {
      callId: { type: mongoose.Schema.Types.ObjectId, ref: 'Call', default: null },
      callType: { type: String, enum: ['voice', 'video', null], default: null },
      status: { type: String, default: null },
      duration: { type: Number, default: 0 }
    }
  },
  {
    timestamps: true
  }
);

messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ conversationId: 1, isPinned: 1 });
messageSchema.index({ content: 'text' });

export const Message = mongoose.model('Message', messageSchema);
