import { Message } from '../models/Message.js';
import { Conversation } from '../models/Conversation.js';
import { onlineUsers } from './presenceHandler.js';
import { sendPushToUser } from '../services/notification.service.js';
import { logger } from '../utils/logger.js';

export const registerChatHandlers = (io, socket) => {
  const userId = socket.user._id;

  // Join a conversation room
  socket.on('conversation:join', (conversationId) => {
    socket.join(`conv_${conversationId}`);
  });

  // Leave a conversation room
  socket.on('conversation:leave', (conversationId) => {
    socket.leave(`conv_${conversationId}`);
  });

  // Typing indicators
  socket.on('typing:start', ({ conversationId }) => {
    socket.to(`conv_${conversationId}`).emit('typing:status', {
      conversationId,
      userId,
      isTyping: true,
      userName: socket.user.fullName
    });
  });

  socket.on('typing:stop', ({ conversationId }) => {
    socket.to(`conv_${conversationId}`).emit('typing:status', {
      conversationId,
      userId,
      isTyping: false
    });
  });

  // Real-time message dispatch
  socket.on('message:send', async (data, callback) => {
    try {
      const { conversationId, content, messageType = 'text', media, replyToId, tempId } = data;

      const conversation = await Conversation.findOne({
        _id: conversationId,
        participants: userId
      });

      if (!conversation) {
        if (typeof callback === 'function') callback({ error: 'Conversation not found' });
        return;
      }

      const otherParticipants = conversation.participants.filter(
        (p) => p.toString() !== userId.toString()
      );

      // Check online status for automatic 'delivered' status
      const hasOnlineRecipient = otherParticipants.some(
        (p) => onlineUsers.has(p.toString()) && onlineUsers.get(p.toString()).size > 0
      );

      const initialStatus = hasOnlineRecipient ? 'delivered' : 'sent';

      const deliveryStatus = otherParticipants.map((p) => ({
        user: p,
        status: (onlineUsers.has(p.toString()) && onlineUsers.get(p.toString()).size > 0) ? 'delivered' : 'sent',
        updatedAt: new Date()
      }));

      const message = await Message.create({
        conversationId,
        sender: userId,
        messageType,
        content: content || '',
        media: media || {},
        replyTo: replyToId || null,
        status: initialStatus,
        deliveryStatus
      });

      // Update conversation
      conversation.lastMessage = message._id;
      conversation.updatedAt = new Date();

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

      // Broadcast to active conversation room and participant rooms without duplicate packets
      const targetRooms = [
        `conv_${conversationId}`,
        ...conversation.participants.map((p) => `user_${p.toString()}`)
      ];
      io.to(targetRooms).emit('message:receive', {
        message: populatedMessage,
        tempId
      });

      // Update conversation list/badges for participants
      for (const pId of conversation.participants) {
        io.to(`user_${pId.toString()}`).emit('conversation:updated', {
          conversationId,
          lastMessage: populatedMessage,
          unreadCountIncrement: pId.toString() === userId.toString() ? 0 : 1
        });
      }

      // Offline push notification
      for (const pId of otherParticipants) {
        const isOnline = onlineUsers.has(pId.toString()) && onlineUsers.get(pId.toString()).size > 0;
        if (!isOnline) {
          sendPushToUser(pId, {
            type: 'message',
            title: socket.user.fullName,
            body: messageType === 'text' ? content : `Sent a ${messageType}`,
            data: { conversationId, messageId: message._id }
          }).catch(() => {});
        }
      }

      if (typeof callback === 'function') {
        callback({ success: true, message: populatedMessage, tempId });
      }
    } catch (err) {
      logger.error('Socket message:send error:', err.message);
      if (typeof callback === 'function') callback({ error: err.message });
    }
  });

  // Mark messages as delivered
  socket.on('message:delivered', async ({ messageId, conversationId }) => {
    try {
      await Message.updateOne(
        { _id: messageId, 'deliveryStatus.user': userId },
        {
          $set: {
            'deliveryStatus.$.status': 'delivered',
            'deliveryStatus.$.updatedAt': new Date(),
            status: 'delivered'
          }
        }
      );

      io.to(`conv_${conversationId}`).emit('message:status_updated', {
        messageId,
        status: 'delivered',
        userId
      });
    } catch (err) {
      logger.error('Error updating delivery status:', err.message);
    }
  });

  // Mark messages as read
  socket.on('message:read', async ({ conversationId, messageIds }) => {
    try {
      if (messageIds && messageIds.length > 0) {
        await Message.updateMany(
          {
            _id: { $in: messageIds },
            'deliveryStatus.user': userId
          },
          {
            $set: {
              'deliveryStatus.$.status': 'read',
              'deliveryStatus.$.updatedAt': new Date(),
              status: 'read'
            }
          }
        );
      }

      // Reset unread count for user
      await Conversation.updateOne(
        { _id: conversationId, 'unreadCounts.user': userId },
        { $set: { 'unreadCounts.$.count': 0 } }
      );

      // Emit read receipt to conversation room
      io.to(`conv_${conversationId}`).emit('message:read_receipt', {
        conversationId,
        readBy: userId,
        messageIds,
        readAt: new Date()
      });
    } catch (err) {
      logger.error('Error updating read status:', err.message);
    }
  });

  // Message reaction
  socket.on('message:react', async ({ messageId, conversationId, emoji }) => {
    try {
      const message = await Message.findById(messageId);
      if (!message) return;

      const existingIndex = message.reactions.findIndex((r) => r.user.toString() === userId.toString());
      if (!emoji) {
        if (existingIndex !== -1) message.reactions.splice(existingIndex, 1);
      } else {
        if (existingIndex !== -1) {
          message.reactions[existingIndex].emoji = emoji;
        } else {
          message.reactions.push({ user: userId, emoji, createdAt: new Date() });
        }
      }
      await message.save();

      io.to(`conv_${conversationId}`).emit('message:reaction_updated', {
        messageId,
        reactions: message.reactions
      });
    } catch (err) {
      logger.error('Error reacting to message:', err.message);
    }
  });
};
