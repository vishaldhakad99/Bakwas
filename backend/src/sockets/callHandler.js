import { Call } from '../models/Call.js';
import { logger } from '../utils/logger.js';
import { sendPushToUser } from '../services/notification.service.js';

// Map of user to active callId
const activeCalls = new Map();

export const registerCallHandlers = (io, socket) => {
  const userId = socket.user._id;

  // Caller initiates call
  socket.on('call:initiate', async (data) => {
    try {
      const { receiverId, callType, callId } = data;

      // Check if receiver is in an active call
      if (activeCalls.has(receiverId)) {
        const existingCallId = activeCalls.get(receiverId);
        const existingCall = await Call.findById(existingCallId).lean();
        if (existingCall && (existingCall.status === 'initiated' || existingCall.status === 'ringing' || existingCall.status === 'accepted')) {
          socket.emit('call:busy', { receiverId, callId });
          await Call.findByIdAndUpdate(callId, { status: 'busy', endReason: 'busy', endedAt: new Date() });
          return;
        } else {
          activeCalls.delete(receiverId);
        }
      }

      activeCalls.set(userId, callId);
      activeCalls.set(receiverId, callId);

      // Relay call request to receiver's private room
      io.to(`user_${receiverId}`).emit('call:incoming', {
        callId,
        callType,
        caller: {
          _id: socket.user._id,
          fullName: socket.user.fullName,
          username: socket.user.username,
          avatar: socket.user.avatar
        }
      });

      // Send push notification for incoming call
      sendPushToUser(receiverId, {
        type: 'call',
        title: `Incoming ${callType} call`,
        body: `${socket.user.fullName} is calling you on BAKWAS...`,
        data: { callId, callType }
      }).catch(() => {});
    } catch (err) {
      logger.error('Error initiating call:', err.message);
    }
  });

  // Receiver sends ringing signal back to caller
  socket.on('call:ringing', ({ callerId, callId }) => {
    io.to(`user_${callerId}`).emit('call:ringing', { callId });
    Call.findByIdAndUpdate(callId, { status: 'ringing' }).catch(() => {});
  });

  // Receiver accepts call
  socket.on('call:accept', async ({ callerId, callId }) => {
    activeCalls.set(userId, callId);
    io.to(`user_${callerId}`).emit('call:accepted', { callId, receiverId: userId });
    await Call.findByIdAndUpdate(callId, { status: 'accepted', acceptedAt: new Date() });
  });

  // WebRTC SDP Offer relay
  socket.on('call:offer', ({ to, offer, callId }) => {
    io.to(`user_${to}`).emit('call:offer', {
      offer,
      from: userId,
      callId
    });
  });

  // WebRTC SDP Answer relay
  socket.on('call:answer', ({ to, answer, callId }) => {
    io.to(`user_${to}`).emit('call:answer', {
      answer,
      from: userId,
      callId
    });
  });

  // WebRTC ICE Candidate relay
  socket.on('call:ice-candidate', ({ to, candidate, callId }) => {
    io.to(`user_${to}`).emit('call:ice-candidate', {
      candidate,
      from: userId,
      callId
    });
  });

  // Call rejection
  socket.on('call:reject', async ({ callerId, callId }) => {
    activeCalls.delete(callerId);
    activeCalls.delete(userId);

    io.to(`user_${callerId}`).emit('call:rejected', { callId });

    await Call.findByIdAndUpdate(callId, {
      status: 'rejected',
      endReason: 'declined',
      endedAt: new Date()
    });
  });

  // End call
  socket.on('call:end', async ({ peerId, callId, reason }) => {
    activeCalls.delete(userId);
    if (peerId) activeCalls.delete(peerId);

    if (peerId) {
      io.to(`user_${peerId}`).emit('call:ended', { callId, reason });
    }

    if (callId) {
      const call = await Call.findById(callId);
      if (call && call.status !== 'ended') {
        const endedAt = new Date();
        const durationSeconds = call.acceptedAt
          ? Math.max(0, Math.round((endedAt - call.acceptedAt) / 1000))
          : 0;

        call.status = 'ended';
        call.endedAt = endedAt;
        call.durationSeconds = durationSeconds;
        call.endReason = reason || 'completed';
        await call.save();
      }
    }
  });

  // Clean up active call on disconnect
  socket.on('disconnect', () => {
    if (activeCalls.has(userId)) {
      const callId = activeCalls.get(userId);
      activeCalls.delete(userId);
      socket.broadcast.emit('call:ended', { callId, reason: 'network_error' });
    }
  });
};
