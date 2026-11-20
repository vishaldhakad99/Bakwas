import mongoose from 'mongoose';

const contactSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    phoneNumber: {
      type: String,
      required: [true, 'Phone number is required to save contact'],
      trim: true,
      index: true
    },
    customName: {
      type: String,
      required: [true, 'Contact name is required'],
      trim: true,
      maxlength: [50, 'Custom name cannot exceed 50 characters']
    },
    contactUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [200, 'Notes cannot exceed 200 characters'],
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

// One contact entry per phone number for a user
contactSchema.index({ userId: 1, phoneNumber: 1 }, { unique: true });

export const Contact = mongoose.model('Contact', contactSchema);
