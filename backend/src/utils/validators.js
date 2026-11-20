import { z } from 'zod';

export const requestOtpSchema = z.object({
  body: z.object({
    countryCode: z.string().min(1, 'Country code is required').regex(/^\+[1-9]\d{0,3}$/, 'Invalid country code format, e.g. +91, +1'),
    mobileNumber: z.string().min(6, 'Mobile number must be at least 6 digits').max(15, 'Mobile number too long').regex(/^\d+$/, 'Mobile number must contain digits only'),
    purpose: z.enum(['register', 'login', 'change_phone']).default('login')
  })
});

export const verifyOtpSchema = z.object({
  body: z.object({
    countryCode: z.string().min(1),
    mobileNumber: z.string().min(6),
    otp: z.string().length(6, 'OTP must be exactly 6 digits'),
    deviceId: z.string().min(1, 'Device ID is required'),
    deviceInfo: z.object({
      deviceName: z.string().optional(),
      browser: z.string().optional(),
      os: z.string().optional()
    }).optional(),
    fullName: z.string().max(50).optional(),
    username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain alphanumeric and underscores').optional(),
    purpose: z.enum(['register', 'login', 'change_phone']).default('login')
  })
});

export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, 'Refresh token required'),
    deviceId: z.string().min(1, 'Device ID is required')
  })
});

export const updateProfileSchema = z.object({
  body: z.object({
    fullName: z.string().min(1).max(50).optional(),
    username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/).optional(),
    about: z.string().max(140).optional()
  })
});

export const updatePrivacySchema = z.object({
  body: z.object({
    lastSeen: z.enum(['everyone', 'contacts', 'nobody']).optional(),
    online: z.enum(['everyone', 'same_as_last_seen']).optional(),
    avatar: z.enum(['everyone', 'contacts', 'nobody']).optional(),
    about: z.enum(['everyone', 'contacts', 'nobody']).optional(),
    readReceipts: z.boolean().optional()
  })
});

export const changePhoneSchema = z.object({
  body: z.object({
    newCountryCode: z.string().min(1),
    newMobileNumber: z.string().min(6),
    otp: z.string().length(6)
  })
});

export const createGroupSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Group name required').max(100),
    description: z.string().max(500).optional(),
    participantIds: z.array(z.string()).min(1, 'Must select at least one participant')
  })
});

export const addGroupMemberSchema = z.object({
  body: z.object({
    userId: z.string().min(1, 'User ID is required'),
    role: z.enum(['admin', 'member']).default('member')
  })
});

export const sendMessageSchema = z.object({
  body: z.object({
    conversationId: z.string().optional(),
    recipientId: z.string().optional(), // for direct chat if conversation not created yet
    messageType: z.enum(['text', 'image', 'video', 'audio', 'document', 'pdf']).default('text'),
    content: z.string().max(10000).optional().default(''),
    media: z.object({
      url: z.string().optional(),
      publicId: z.string().optional(),
      mimeType: z.string().optional(),
      fileName: z.string().optional(),
      fileSize: z.number().optional(),
      duration: z.number().optional(),
      thumbnail: z.string().optional()
    }).optional(),
    replyToId: z.string().optional(),
    forwarded: z.boolean().optional()
  })
});

export const messageActionSchema = z.object({
  body: z.object({
    emoji: z.string().optional(),
    newContent: z.string().max(10000).optional()
  })
});
