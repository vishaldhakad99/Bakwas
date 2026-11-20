import mongoose from 'mongoose';

const privacySettingsSchema = new mongoose.Schema(
  {
    lastSeen: {
      type: String,
      enum: ['everyone', 'contacts', 'nobody'],
      default: 'everyone'
    },
    online: {
      type: String,
      enum: ['everyone', 'same_as_last_seen'],
      default: 'everyone'
    },
    avatar: {
      type: String,
      enum: ['everyone', 'contacts', 'nobody'],
      default: 'everyone'
    },
    about: {
      type: String,
      enum: ['everyone', 'contacts', 'nobody'],
      default: 'everyone'
    },
    readReceipts: {
      type: Boolean,
      default: true
    }
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    countryCode: {
      type: String,
      required: [true, 'Country code is required'],
      trim: true,
      default: '+91'
    },
    mobileNumber: {
      type: String,
      required: [true, 'Mobile number is required'],
      trim: true
    },
    formattedPhone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    username: {
      type: String,
      trim: true,
      lowercase: true,
      sparse: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [30, 'Username cannot exceed 30 characters']
    },
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      maxlength: [50, 'Full name cannot exceed 50 characters']
    },
    about: {
      type: String,
      trim: true,
      maxlength: [140, 'About cannot exceed 140 characters'],
      default: 'Hey there! I am using BAKWAS.'
    },
    avatar: {
      url: {
        type: String,
        default: ''
      },
      publicId: {
        type: String,
        default: ''
      }
    },
    isOnline: {
      type: Boolean,
      default: false,
      index: true
    },
    lastSeen: {
      type: Date,
      default: Date.now,
      index: true
    },
    privacySettings: {
      type: privacySettingsSchema,
      default: () => ({})
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    isDeleted: {
      type: Boolean,
      default: false
    },
    deletedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Indexes
userSchema.index({ countryCode: 1, mobileNumber: 1 }, { unique: true });
userSchema.index({ fullName: 'text', username: 'text' });

export const User = mongoose.model('User', userSchema);
