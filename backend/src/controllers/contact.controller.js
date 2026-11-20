import { Contact } from '../models/Contact.js';
import { User } from '../models/User.js';
import { BlockedUser } from '../models/BlockedUser.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { logger } from '../utils/logger.js';

export const getContacts = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const contacts = await Contact.find({ userId })
      .populate('contactUserId', 'fullName username formattedPhone avatar about isOnline lastSeen')
      .sort({ customName: 1 });

    const blockedList = await BlockedUser.find({ blockerId: userId });
    const blockedIds = new Set(blockedList.map((b) => b.blockedUserId.toString()));

    // For any unlinked contacts, check if the user has recently registered
    const unlinked = contacts.filter((c) => !c.contactUserId);
    if (unlinked.length > 0) {
      const phones = unlinked.map((c) => c.phoneNumber);
      const registeredUsers = await User.find({ formattedPhone: { $in: phones }, isDeleted: false });
      const phoneToUser = new Map(registeredUsers.map((u) => [u.formattedPhone, u]));

      for (const c of unlinked) {
        if (phoneToUser.has(c.phoneNumber)) {
          const registered = phoneToUser.get(c.phoneNumber);
          c.contactUserId = registered;
          await Contact.updateOne({ _id: c._id }, { contactUserId: registered._id });
        }
      }
    }

    const formatted = contacts.map((c) => {
      const isRegistered = !!(c.contactUserId && !c.contactUserId.isDeleted);
      const contactUserObj = isRegistered ? c.contactUserId : null;
      return {
        _id: c._id,
        phoneNumber: c.phoneNumber,
        customName: c.customName,
        notes: c.notes || '',
        isRegistered,
        contactUser: contactUserObj,
        isBlocked: contactUserObj ? blockedIds.has(contactUserObj._id.toString()) : false,
        createdAt: c.createdAt
      };
    });

    return res.status(200).json(new ApiResponse(200, formatted, 'Contacts retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

export const addContact = async (req, res, next) => {
  try {
    const { contactPhone, phoneNumber, countryCode = '+91', customName, notes } = req.body;
    const userId = req.user._id;

    // Clean and normalize phone number
    const rawNumber = phoneNumber || contactPhone;
    if (!rawNumber || typeof rawNumber !== 'string') {
      throw new ApiError(400, 'Mobile phone number is required');
    }

    if (!customName || !customName.trim()) {
      throw new ApiError(400, 'Contact name is required');
    }

    let cleanDigits = rawNumber.trim().replace(/\D/g, '').replace(/^0+/, '');
    let formattedPhone = '';

    if (rawNumber.trim().startsWith('+')) {
      formattedPhone = `+${cleanDigits}`;
    } else {
      const code = countryCode.trim().startsWith('+') ? countryCode.trim() : `+${countryCode.trim()}`;
      formattedPhone = `${code}${cleanDigits}`;
    }

    // Check if the target phone belongs to the user themselves
    const currentUser = await User.findById(userId);
    if (currentUser && currentUser.formattedPhone === formattedPhone) {
      throw new ApiError(400, 'You cannot save yourself as a contact');
    }

    // Check if registered user exists for this phone
    const targetUser = await User.findOne({ formattedPhone, isDeleted: false });

    // Upsert contact record
    const contact = await Contact.findOneAndUpdate(
      { userId, phoneNumber: formattedPhone },
      {
        customName: customName.trim(),
        phoneNumber: formattedPhone,
        contactUserId: targetUser ? targetUser._id : null,
        notes: notes ? notes.trim() : '',
        isSaved: true
      },
      { new: true, upsert: true, runValidators: true }
    ).populate('contactUserId', 'fullName username formattedPhone avatar about isOnline lastSeen');

    logger.info(`Contact saved by user ${userId}: ${formattedPhone} (${customName.trim()})`);

    const result = {
      _id: contact._id,
      phoneNumber: contact.phoneNumber,
      customName: contact.customName,
      notes: contact.notes,
      isRegistered: !!targetUser,
      contactUser: targetUser || null,
      createdAt: contact.createdAt
    };

    return res.status(201).json(new ApiResponse(201, result, 'Contact saved successfully'));
  } catch (error) {
    next(error);
  }
};

export const deleteContact = async (req, res, next) => {
  try {
    const { contactId } = req.params;
    const userId = req.user._id;

    const deleted = await Contact.findOneAndDelete({ _id: contactId, userId });
    if (!deleted) {
      throw new ApiError(404, 'Contact not found');
    }

    return res.status(200).json(new ApiResponse(200, null, 'Contact deleted successfully'));
  } catch (error) {
    next(error);
  }
};

export const blockContact = async (req, res, next) => {
  try {
    const { targetUserId, reason } = req.body;
    const userId = req.user._id;

    if (targetUserId === userId.toString()) {
      throw new ApiError(400, 'Cannot block yourself');
    }

    const existing = await BlockedUser.findOne({ blockerId: userId, blockedUserId: targetUserId });
    if (!existing) {
      await BlockedUser.create({
        blockerId: userId,
        blockedUserId: targetUserId,
        reason: reason || ''
      });
    }

    return res.status(200).json(new ApiResponse(200, null, 'User blocked successfully'));
  } catch (error) {
    next(error);
  }
};

export const unblockContact = async (req, res, next) => {
  try {
    const { targetUserId } = req.body;
    const userId = req.user._id;

    await BlockedUser.deleteOne({ blockerId: userId, blockedUserId: targetUserId });

    return res.status(200).json(new ApiResponse(200, null, 'User unblocked successfully'));
  } catch (error) {
    next(error);
  }
};

export const getBlockedContacts = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const blocked = await BlockedUser.find({ blockerId: userId })
      .populate('blockedUserId', 'fullName username formattedPhone avatar')
      .sort({ createdAt: -1 });

    return res.status(200).json(new ApiResponse(200, blocked));
  } catch (error) {
    next(error);
  }
};

export const reportUser = async (req, res, next) => {
  try {
    const { reportedUserId, reason } = req.body;
    const userId = req.user._id;

    logger.warn(`[AUDIT REPORT] User ${userId} reported user ${reportedUserId} for reason: ${reason}`);

    return res.status(200).json(
      new ApiResponse(200, null, 'Thank you for your report. Our security team will review it.')
    );
  } catch (error) {
    next(error);
  }
};
