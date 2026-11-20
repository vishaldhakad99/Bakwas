import { create } from 'zustand';
import { webrtc } from '../services/webrtc';
import { getSocket } from '../services/socket';
import { sound } from '../services/sound';
import { api } from '../services/api';

export const useCallStore = create((set, get) => ({
  callState: 'idle', // 'idle' | 'incoming' | 'outgoing' | 'connected'
  callType: 'voice', // 'voice' | 'video'
  callId: null,
  peer: null,
  isOutgoing: false,
  localStream: null,
  remoteStream: null,
  isMuted: false,
  isVideoOff: false,
  duration: 0,
  timerInterval: null,

  setIncomingCall: ({ callId, callType, caller }) => {
    sound.playIncomingRing();
    set({
      callState: 'incoming',
      callId,
      callType,
      peer: caller,
      isOutgoing: false,
      duration: 0
    });
  },

  startOutgoingCall: async (callType, peer, conversationId) => {
    try {
      // 1. Initiate in backend
      const res = await api.post('/calls/initiate', {
        receiverId: peer._id,
        callType,
        conversationId
      });
      const callData = res.data.data;

      sound.playOutgoingRing();

      // 2. Start local media stream
      const localStream = await webrtc.startLocalMedia(callType);

      set({
        callState: 'outgoing',
        callId: callData._id,
        callType,
        peer,
        isOutgoing: true,
        localStream,
        duration: 0
      });

      // 3. Emit initiate via socket
      const socket = getSocket();
      if (socket) {
        socket.emit('call:initiate', {
          receiverId: peer._id,
          callType,
          callId: callData._id
        });
      }
    } catch (err) {
      console.error('Failed to initiate call:', err);
      sound.stopRinging();
      set({ callState: 'idle' });
      alert(err.response?.data?.message || err.message || 'Call failed to start');
    }
  },

  acceptIncomingCall: async () => {
    const { callId, callType, peer } = get();
    sound.stopRinging();

    try {
      // 1. Get media stream
      const localStream = await webrtc.startLocalMedia(callType);

      webrtc.onRemoteStreamCallback = (remoteStream) => {
        set({ remoteStream });
      };

      set({
        callState: 'connected',
        localStream
      });

      // 2. Notify backend & socket
      await api.put(`/calls/${callId}/status`, { status: 'accepted' });

      const socket = getSocket();
      if (socket) {
        socket.emit('call:accept', { callerId: peer._id, callId });
      }

      // 3. Start timer
      get().startCallTimer();
    } catch (err) {
      console.error('Failed to accept call:', err);
      get().endCall('network_error');
    }
  },

  rejectIncomingCall: async () => {
    const { callId, peer } = get();
    sound.stopRinging();

    const socket = getSocket();
    if (socket && peer) {
      socket.emit('call:reject', { callerId: peer._id, callId });
    }

    if (callId) {
      await api.put(`/calls/${callId}/status`, { status: 'rejected', endReason: 'declined' }).catch(() => {});
    }

    set({ callState: 'idle', callId: null, peer: null });
  },

  endCall: async (reason = 'completed') => {
    const { callId, peer, timerInterval } = get();
    sound.stopRinging();

    if (timerInterval) {
      clearInterval(timerInterval);
    }

    webrtc.close();

    const socket = getSocket();
    if (socket && peer) {
      socket.emit('call:end', { peerId: peer._id, callId, reason });
    }

    if (callId) {
      await api.put(`/calls/${callId}/status`, { status: 'ended', endReason: reason }).catch(() => {});
    }

    set({
      callState: 'idle',
      callId: null,
      peer: null,
      localStream: null,
      remoteStream: null,
      isMuted: false,
      isVideoOff: false,
      duration: 0,
      timerInterval: null
    });
  },

  startCallTimer: () => {
    const timerInterval = setInterval(() => {
      set((state) => ({ duration: state.duration + 1 }));
    }, 1000);
    set({ timerInterval });
  },

  toggleMute: () => {
    const current = get().isMuted;
    webrtc.toggleAudio(current); // if current is true (muted), enable=true
    set({ isMuted: !current });
  },

  toggleVideo: () => {
    const current = get().isVideoOff;
    webrtc.toggleVideo(current); // if current is true (video off), enable=true
    set({ isVideoOff: !current });
  }
}));
