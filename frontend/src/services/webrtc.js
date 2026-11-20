import { api } from './api';
import { getSocket } from './socket';

class WebRTCManager {
  constructor() {
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    this.iceServers = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ];
    this.onRemoteStreamCallback = null;
    this.onIceCandidateCallback = null;
    this.onConnectionStateChangeCallback = null;
  }

  async fetchIceServers() {
    try {
      const res = await api.get('/media/ice-servers');
      if (res.data?.data?.iceServers?.length > 0) {
        this.iceServers = res.data.data.iceServers;
      }
    } catch {
      // Fallback to Google STUN
    }
  }

  async initializePeerConnection(callId, targetUserId) {
    await this.fetchIceServers();

    this.peerConnection = new RTCPeerConnection({
      iceServers: this.iceServers,
      iceCandidatePoolSize: 10
    });

    // Remote stream receiver
    this.remoteStream = new MediaStream();
    this.peerConnection.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => {
        this.remoteStream.addTrack(track);
      });
      if (this.onRemoteStreamCallback) {
        this.onRemoteStreamCallback(this.remoteStream);
      }
    };

    // Relay local ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        const socket = getSocket();
        if (socket) {
          socket.emit('call:ice-candidate', {
            to: targetUserId,
            candidate: event.candidate,
            callId
          });
        }
      }
    };

    this.peerConnection.onconnectionstatechange = () => {
      if (this.onConnectionStateChangeCallback) {
        this.onConnectionStateChangeCallback(this.peerConnection.connectionState);
      }
    };

    // Add local tracks if stream exists
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        this.peerConnection.addTrack(track, this.localStream);
      });
    }

    return this.peerConnection;
  }

  async startLocalMedia(callType = 'voice') {
    const constraints = {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      },
      video: callType === 'video' ? {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: 'user'
      } : false
    };

    try {
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      return this.localStream;
    } catch (err) {
      console.error('Media stream acquisition failed:', err);
      // Fallback to audio only if video failed
      if (callType === 'video') {
        this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        return this.localStream;
      }
      throw err;
    }
  }

  async createOffer(callId, targetUserId) {
    if (!this.peerConnection) {
      await this.initializePeerConnection(callId, targetUserId);
    }
    const offer = await this.peerConnection.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true
    });
    await this.peerConnection.setLocalDescription(offer);
    return offer;
  }

  async handleOfferAndCreateAnswer(offer, callId, targetUserId) {
    if (!this.peerConnection) {
      await this.initializePeerConnection(callId, targetUserId);
    }
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);
    return answer;
  }

  async handleAnswer(answer) {
    if (this.peerConnection && !this.peerConnection.currentRemoteDescription) {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    }
  }

  async addIceCandidate(candidate) {
    if (this.peerConnection && candidate) {
      try {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.warn('Error adding ICE candidate:', err);
      }
    }
  }

  toggleAudio(enabled) {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = enabled;
        return audioTrack.enabled;
      }
    }
    return false;
  }

  toggleVideo(enabled) {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = enabled;
        return videoTrack.enabled;
      }
    }
    return false;
  }

  close() {
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }
    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach((track) => track.stop());
      this.remoteStream = null;
    }
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
  }
}

export const webrtc = new WebRTCManager();
