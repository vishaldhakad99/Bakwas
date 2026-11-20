import mongoose from 'mongoose';

const contactSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    contactUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    customName: {
      type: String,
      trim: true,
      maxlength: [50, 'Custom name cannot exceed 50 characters'],
      default: ''
    },
    isSaved: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

contactSchema.index({ userId: 1, contactUserId: 1 }, { unique: true });

export const Contact = mongoose.model('Contact', contactSchema);
