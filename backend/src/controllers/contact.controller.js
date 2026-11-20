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

    const formatted = contacts
      .filter((c) => c.contactUserId && !c.contactUserId.isDeleted)
      .map((c) => ({
        _id: c._id,
        contactUser: c.contactUserId,
        customName: c.customName || c.contactUserId.fullName,
        isBlocked: blockedIds.has(c.contactUserId._id.toString()),
        createdAt: c.createdAt
      }));

    return res.status(200).json(new ApiResponse(200, formatted));
  } catch (error) {
    next(error);
  }
};

export const addContact = async (req, res, next) => {
  try {
    const { contactPhone, contactUserId, customName } = req.body;
    const userId = req.user._id;

    let targetUser = null;

    if (contactUserId) {
      targetUser = await User.findById(contactUserId);
    } else if (contactPhone) {
      targetUser = await User.findOne({ formattedPhone: contactPhone.trim(), isDeleted: false });
    }

    if (!targetUser) {
      throw new ApiError(404, 'User not found with provided phone or ID');
    }

    if (targetUser._id.toString() === userId.toString()) {
      throw new ApiError(400, 'Cannot add yourself as a contact');
    }

    let contact = await Contact.findOne({ userId, contactUserId: targetUser._id });
    if (contact) {
      if (customName) contact.customName = customName.trim();
      await contact.save();
    } else {
      contact = await Contact.create({
        userId,
        contactUserId: targetUser._id,
        customName: customName ? customName.trim() : targetUser.fullName
      });
    }

    const populated = await Contact.findById(contact._id).populate('contactUserId', 'fullName username formattedPhone avatar about isOnline lastSeen');

    return res.status(201).json(new ApiResponse(201, populated, 'Contact saved successfully'));
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
