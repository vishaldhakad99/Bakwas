import mongoose from 'mongoose';

const groupSettingsSchema = new mongoose.Schema(
  {
    onlyAdminsCanSend: {
      type: Boolean,
      default: false
    },
    onlyAdminsCanEditInfo: {
      type: Boolean,
      default: false
    }
  },
  { _id: false }
);

const groupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Group name is required'],
      trim: true,
      maxlength: [100, 'Group name cannot exceed 100 characters']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Group description cannot exceed 500 characters'],
      default: ''
    },
    avatar: {
      url: { type: String, default: '' },
      publicId: { type: String, default: '' }
    },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    admins: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    settings: {
      type: groupSettingsSchema,
      default: () => ({})
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

export const Group = mongoose.model('Group', groupSchema);
