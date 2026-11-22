import mongoose from 'mongoose';
import { Conversation } from '../models/Conversation.js';
import { Message } from '../models/Message.js';
import { User } from '../models/User.js';
import { Group } from '../models/Group.js';
import { GroupMember } from '../models/GroupMember.js';
import { BlockedUser } from '../models/BlockedUser.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { sendPushToUser } from '../services/notification.service.js';

export const getConversations = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const conversations = await Conversation.find({
      participants: userId
    })
      .populate('participants', 'fullName username formattedPhone avatar isOnline lastSeen privacySettings')
      .populate('group', 'name description avatar settings creator admins')
      .populate({
        path: 'lastMessage',
        populate: { path: 'sender', select: 'fullName username' }
      })
      .sort({ updatedAt: -1 })
      .lean();

    const formatted = conversations.map((conv) => {
      const cObj = { ...conv };
      cObj.isPinned = (conv.pinnedBy || []).some((id) => id.toString() === userId.toString());
      cObj.isArchived = (conv.archivedBy || []).some((id) => id.toString() === userId.toString());

      const unreadRecord = (conv.unreadCounts || []).find((u) => u.user.toString() === userId.toString());
      cObj.unreadCount = unreadRecord ? unreadRecord.count : 0;

      // Privacy checks for participants in direct conversations
      if (conv.type === 'direct') {
        const otherParticipant = cObj.participants.find((p) => p._id.toString() !== userId.toString());
        if (otherParticipant) {
          if (otherParticipant.privacySettings?.avatar === 'nobody') {
            otherParticipant.avatar = { url: '', publicId: '' };
          }
          if (otherParticipant.privacySettings?.online === 'nobody') {
            otherParticipant.isOnline = false;
          }
        }
      }

      return cObj;
    });

    return res.status(200).json(new ApiResponse(200, formatted));
  } catch (error) {
    next(error);
  }
};

export const getOrCreateConversation = async (req, res, next) => {
  try {
    const { recipientId } = req.body;
    const userId = req.user._id;

    if (!recipientId) {
      throw new ApiError(400, 'Recipient ID is required');
    }

    if (recipientId === userId.toString()) {
      throw new ApiError(400, 'Cannot create a conversation with yourself');
    }

    // Check if blocked
    const isBlocked = await BlockedUser.findOne({
      $or: [
        { blockerId: userId, blockedUserId: recipientId },
        { blockerId: recipientId, blockedUserId: userId }
      ]
    });

    if (isBlocked) {
      throw new ApiError(403, 'Communication is blocked between these users');
    }

    let conversation = await Conversation.findOne({
      type: 'direct',
      participants: { $all: [userId, recipientId], $size: 2 }
    })
      .populate('participants', 'fullName username formattedPhone avatar isOnline lastSeen privacySettings')
      .populate('lastMessage');

    if (!conversation) {
      conversation = await Conversation.create({
        type: 'direct',
        participants: [userId, recipientId],
        unreadCounts: [
          { user: userId, count: 0 },
          { user: recipientId, count: 0 }
        ]
      });

      conversation = await Conversation.findById(conversation._id)
        .populate('participants', 'fullName username formattedPhone avatar isOnline lastSeen privacySettings');
    }

    return res.status(200).json(new ApiResponse(200, conversation));
  } catch (error) {
    next(error);
  }
};

export const getMessages = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const { limit = 50, before } = req.query;
    const userId = req.user._id;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId
    });

    if (!conversation) {
      throw new ApiError(404, 'Conversation not found or access denied');
    }

    // Check if user previously cleared history
    const clearedRecord = (conversation.clearedHistory || []).find(
      (c) => c.user.toString() === userId.toString()
    );
    const clearedAt = clearedRecord ? clearedRecord.clearedAt : null;

    const query = {
      conversationId,
      deletedForUsers: { $ne: userId }
    };

    if (clearedAt) {
      query.createdAt = { $gt: clearedAt };
    }

    if (before) {
      query.createdAt = { ...(query.createdAt || {}), $lt: new Date(before) };
    }

    const messages = await Message.find(query)
      .populate('sender', 'fullName username avatar')
      .populate({
        path: 'replyTo',
        select: 'content sender messageType media',
        populate: { path: 'sender', select: 'fullName username' }
      })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit, 10))
      .lean();

    // Reset unread count for current user
    await Conversation.updateOne(
      { _id: conversationId, 'unreadCounts.user': userId },
      { $set: { 'unreadCounts.$.count': 0 } }
    );

    // Sanitize deleted for everyone messages
    const sanitizedMessages = messages.map((m) => {
      const mObj = { ...m };
      if (m.deletedForEveryone) {
        mObj.content = 'This message was deleted';
        mObj.media = { url: '', fileName: '', fileSize: 0 };
      }
      return mObj;
    });

    return res.status(200).json(
      new ApiResponse(200, {
        messages: sanitizedMessages.reverse(),
        hasMore: messages.length === parseInt(limit, 10)
      })
    );
  } catch (error) {
    next(error);
  }
};

export const sendMessage = async (req, res, next) => {
  try {
    const { conversationId, recipientId, messageType = 'text', content = '', media, replyToId, forwarded } = req.body;
    const userId = req.user._id;

    let convId = conversationId;

    if (!convId && recipientId) {
      let conv = await Conversation.findOne({
        type: 'direct',
        participants: { $all: [userId, recipientId], $size: 2 }
      });
      if (!conv) {
        conv = await Conversation.create({
          type: 'direct',
          participants: [userId, recipientId],
          unreadCounts: [
            { user: userId, count: 0 },
            { user: recipientId, count: 0 }
          ]
        });
      }
      convId = conv._id;
    }

    const conversation = await Conversation.findOne({
      _id: convId,
      participants: userId
    });

    if (!conversation) {
      throw new ApiError(404, 'Conversation not found or access denied');
    }

    // Group permission checks
    if (conversation.type === 'group' && conversation.group) {
      const group = await Group.findById(conversation.group);
      if (group && group.settings?.onlyAdminsCanSend) {
        const isAdmin = group.admins.some((adminId) => adminId.toString() === userId.toString());
        if (!isAdmin) {
          throw new ApiError(403, 'Only admins are permitted to send messages in this group');
        }
      }
    }

    // Prepare delivery status for all other participants
    const otherParticipants = conversation.participants.filter(
      (p) => p.toString() !== userId.toString()
    );

    const deliveryStatus = otherParticipants.map((p) => ({
      user: p,
      status: 'sent',
      updatedAt: new Date()
    }));

    const message = await Message.create({
      conversationId: convId,
      sender: userId,
      messageType,
      content,
      media: media || {},
      replyTo: replyToId || null,
      forwarded: Boolean(forwarded),
      status: 'sent',
      deliveryStatus
    });

    // Update conversation lastMessage & unread count
    conversation.lastMessage = message._id;
    conversation.updatedAt = new Date();

    // Increment unread counts for other participants
    for (const pId of otherParticipants) {
      const idx = (conversation.unreadCounts || []).findIndex(
        (u) => u.user.toString() === pId.toString()
      );
      if (idx !== -1) {
        conversation.unreadCounts[idx].count += 1;
      } else {
        conversation.unreadCounts.push({ user: pId, count: 1 });
      }
    }

    await conversation.save();

    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'fullName username avatar')
      .populate({
        path: 'replyTo',
        select: 'content sender messageType media',
        populate: { path: 'sender', select: 'fullName username' }
      });

    // Push notification to offline recipients
    for (const recipient of otherParticipants) {
      sendPushToUser(recipient, {
        type: 'message',
        title: req.user.fullName,
        body: messageType === 'text' ? content : `Sent a ${messageType}`,
        data: { conversationId: convId, messageId: message._id }
      }).catch(() => {});
    }

    return res.status(201).json(new ApiResponse(201, populatedMessage));
  } catch (error) {
    next(error);
  }
};

export const editMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const { newContent } = req.body;
    const userId = req.user._id;

    const message = await Message.findOne({ _id: messageId, sender: userId });
    if (!message) {
      throw new ApiError(404, 'Message not found or you are not the sender');
    }

    if (message.deletedForEveryone) {
      throw new ApiError(400, 'Cannot edit a deleted message');
    }

    // 15-minute edit window limit
    const fifteenMinutes = 15 * 60 * 1000;
    if (Date.now() - new Date(message.createdAt).getTime() > fifteenMinutes) {
      throw new ApiError(400, 'Messages can only be edited within 15 minutes of sending');
    }

    message.content = newContent;
    message.isEdited = true;
    message.editedAt = new Date();
    await message.save();

    return res.status(200).json(new ApiResponse(200, message, 'Message edited successfully'));
  } catch (error) {
    next(error);
  }
};

export const deleteMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const { type } = req.query; // 'me' | 'everyone'
    const userId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) {
      throw new ApiError(404, 'Message not found');
    }

    if (type === 'everyone') {
      if (message.sender.toString() !== userId.toString()) {
        throw new ApiError(403, 'Only the sender can delete a message for everyone');
      }

      message.deletedForEveryone = true;
      message.content = 'This message was deleted';
      message.media = { url: '', fileName: '', fileSize: 0 };
      await message.save();
    } else {
      // Delete for me
      if (!message.deletedForUsers.includes(userId)) {
        message.deletedForUsers.push(userId);
        await message.save();
      }
    }

    return res.status(200).json(new ApiResponse(200, null, 'Message deleted successfully'));
  } catch (error) {
    next(error);
  }
};

export const reactToMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) {
      throw new ApiError(404, 'Message not found');
    }

    const existingReactionIndex = message.reactions.findIndex(
      (r) => r.user.toString() === userId.toString()
    );

    if (!emoji) {
      // Remove reaction
      if (existingReactionIndex !== -1) {
        message.reactions.splice(existingReactionIndex, 1);
      }
    } else {
      if (existingReactionIndex !== -1) {
        message.reactions[existingReactionIndex].emoji = emoji;
        message.reactions[existingReactionIndex].createdAt = new Date();
      } else {
        message.reactions.push({ user: userId, emoji, createdAt: new Date() });
      }
    }

    await message.save();

    return res.status(200).json(new ApiResponse(200, message.reactions));
  } catch (error) {
    next(error);
  }
};

export const toggleStarMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) {
      throw new ApiError(404, 'Message not found');
    }

    const isStarred = message.starredBy.includes(userId);
    if (isStarred) {
      message.starredBy = message.starredBy.filter((id) => id.toString() !== userId.toString());
    } else {
      message.starredBy.push(userId);
    }

    await message.save();

    return res.status(200).json(
      new ApiResponse(200, { isStarred: !isStarred }, !isStarred ? 'Message starred' : 'Message unstarred')
    );
  } catch (error) {
    next(error);
  }
};

export const togglePinConversation = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;

    const conversation = await Conversation.findOne({ _id: conversationId, participants: userId });
    if (!conversation) {
      throw new ApiError(404, 'Conversation not found');
    }

    const isPinned = (conversation.pinnedBy || []).some((id) => id.toString() === userId.toString());
    if (isPinned) {
      conversation.pinnedBy = conversation.pinnedBy.filter((id) => id.toString() !== userId.toString());
    } else {
      conversation.pinnedBy.push(userId);
    }

    await conversation.save();

    return res.status(200).json(
      new ApiResponse(200, { isPinned: !isPinned }, !isPinned ? 'Conversation pinned' : 'Conversation unpinned')
    );
  } catch (error) {
    next(error);
  }
};

export const toggleArchiveConversation = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;

    const conversation = await Conversation.findOne({ _id: conversationId, participants: userId });
    if (!conversation) {
      throw new ApiError(404, 'Conversation not found');
    }

    const isArchived = (conversation.archivedBy || []).some((id) => id.toString() === userId.toString());
    if (isArchived) {
      conversation.archivedBy = conversation.archivedBy.filter((id) => id.toString() !== userId.toString());
    } else {
      conversation.archivedBy.push(userId);
    }

    await conversation.save();

    return res.status(200).json(
      new ApiResponse(200, { isArchived: !isArchived }, !isArchived ? 'Conversation archived' : 'Conversation unarchived')
    );
  } catch (error) {
    next(error);
  }
};

export const clearChatHistory = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;

    const conversation = await Conversation.findOne({ _id: conversationId, participants: userId });
    if (!conversation) {
      throw new ApiError(404, 'Conversation not found');
    }

    const clearedIdx = (conversation.clearedHistory || []).findIndex(
      (c) => c.user.toString() === userId.toString()
    );

    if (clearedIdx !== -1) {
      conversation.clearedHistory[clearedIdx].clearedAt = new Date();
    } else {
      conversation.clearedHistory.push({ user: userId, clearedAt: new Date() });
    }

    await conversation.save();

    return res.status(200).json(new ApiResponse(200, null, 'Chat cleared successfully'));
  } catch (error) {
    next(error);
  }
};

export const searchMessages = async (req, res, next) => {
  try {
    const { query, conversationId } = req.query;
    const userId = req.user._id;

    if (!query || query.trim().length === 0) {
      return res.status(200).json(new ApiResponse(200, []));
    }

    const filter = {
      content: { $regex: query.trim(), $options: 'i' },
      deletedForEveryone: false,
      deletedForUsers: { $ne: userId }
    };

    if (conversationId) {
      filter.conversationId = conversationId;
    } else {
      const userConvs = await Conversation.find({ participants: userId }).select('_id');
      filter.conversationId = { $in: userConvs.map((c) => c._id) };
    }

    const messages = await Message.find(filter)
      .populate('sender', 'fullName username avatar')
      .populate('conversationId', 'type group participants')
      .sort({ createdAt: -1 })
      .limit(30);

    return res.status(200).json(new ApiResponse(200, messages));
  } catch (error) {
    next(error);
  }
};
