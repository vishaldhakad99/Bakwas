import { Call } from '../models/Call.js';
import { Conversation } from '../models/Conversation.js';
import { Message } from '../models/Message.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';

export const getCallHistory = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const calls = await Call.find({
      $or: [{ caller: userId }, { receiver: userId }]
    })
      .populate('caller', 'fullName username formattedPhone avatar')
      .populate('receiver', 'fullName username formattedPhone avatar')
      .sort({ createdAt: -1 })
      .limit(50);

    const formattedCalls = calls.map((c) => {
      const isCaller = c.caller._id.toString() === userId.toString();
      const peer = isCaller ? c.receiver : c.caller;
      return {
        _id: c._id,
        callType: c.callType,
        status: c.status,
        startedAt: c.startedAt,
        acceptedAt: c.acceptedAt,
        endedAt: c.endedAt,
        durationSeconds: c.durationSeconds,
        endReason: c.endReason,
        isOutgoing: isCaller,
        peer
      };
    });

    return res.status(200).json(new ApiResponse(200, formattedCalls));
  } catch (error) {
    next(error);
  }
};

export const initiateCall = async (req, res, next) => {
  try {
    const { receiverId, callType, conversationId } = req.body;
    const callerId = req.user._id;

    if (!receiverId) throw new ApiError(400, 'Receiver ID required');
    if (receiverId === callerId.toString()) throw new ApiError(400, 'Cannot call yourself');

    const receiver = await User.findById(receiverId);
    if (!receiver) throw new ApiError(404, 'Receiver user not found');

    const call = await Call.create({
      caller: callerId,
      receiver: receiverId,
      conversationId: conversationId || null,
      callType: callType || 'voice',
      status: 'initiated',
      startedAt: new Date()
    });

    const populatedCall = await Call.findById(call._id)
      .populate('caller', 'fullName username formattedPhone avatar')
      .populate('receiver', 'fullName username formattedPhone avatar');

    return res.status(201).json(new ApiResponse(201, populatedCall));
  } catch (error) {
    next(error);
  }
};

export const updateCallStatus = async (req, res, next) => {
  try {
    const { callId } = req.params;
    const { status, endReason } = req.body;
    const userId = req.user._id;

    const call = await Call.findById(callId);
    if (!call) throw new ApiError(404, 'Call record not found');

    if (call.caller.toString() !== userId.toString() && call.receiver.toString() !== userId.toString()) {
      throw new ApiError(403, 'Permission denied');
    }

    call.status = status;

    if (status === 'accepted') {
      call.acceptedAt = new Date();
    } else if (['ended', 'rejected', 'missed', 'busy'].includes(status)) {
      call.endedAt = new Date();
      if (endReason) call.endReason = endReason;
      if (call.acceptedAt) {
        call.durationSeconds = Math.max(0, Math.round((call.endedAt - call.acceptedAt) / 1000));
      }

      // If call is attached to a conversation, log call message
      if (call.conversationId) {
        await Message.create({
          conversationId: call.conversationId,
          sender: call.caller,
          messageType: 'call_log',
          content: `${call.callType === 'video' ? 'Video' : 'Voice'} call (${call.status})`,
          callLog: {
            callId: call._id,
            callType: call.callType,
            status: call.status,
            duration: call.durationSeconds
          }
        });
      }
    }

    await call.save();

    return res.status(200).json(new ApiResponse(200, call, 'Call status updated'));
  } catch (error) {
    next(error);
  }
};
