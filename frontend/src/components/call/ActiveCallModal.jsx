import React, { useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { Avatar } from '../common/Avatar';
import { useCallStore } from '../../store/useCallStore';
import { webrtc } from '../../services/webrtc';
import { getSocket } from '../../services/socket';
import { sound } from '../../services/sound';

export const ActiveCallModal = () => {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);

  const {
    callState,
    callType,
    peer,
    callId,
    isMuted,
    isVideoOff,
    duration,
    localStream,
    remoteStream,
    toggleMute,
    toggleVideo,
    endCall,
    startCallTimer
  } = useCallStore();

  // Attach local stream to video tag
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, callState]);

  // Attach remote stream to video tag
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, callState]);

  // Attach remote stream to dedicated audio tag (essential for voice calls)
  useEffect(() => {
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
      remoteAudioRef.current.play().catch((e) => console.log('Audio autoplay info:', e.message));
    }
  }, [remoteStream, callState]);

  if (callState !== 'outgoing' && callState !== 'connected') return null;

  const formatDuration = (sec) => {
    const mins = Math.floor(sec / 60);
    const remaining = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${remaining.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-lg">
      {/* Dedicated audio element to play remote audio stream across desktop and mobile */}
      <audio
        ref={remoteAudioRef}
        autoPlay
        playsInline
        className="absolute -top-[9999px] -left-[9999px] w-1 h-1 opacity-0 pointer-events-none"
      />

      <div className="w-full max-w-4xl h-[85vh] bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col relative">
        {/* Main Display Area */}
        <div className="flex-1 relative flex items-center justify-center bg-black overflow-hidden">
          {callType === 'video' ? (
            <>
              {/* Remote Video (Full Screen) */}
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />

              {/* Local Video Picture-in-Picture Thumbnail */}
              <div className="absolute top-4 right-4 w-36 h-48 sm:w-44 sm:h-60 rounded-2xl overflow-hidden border-2 border-slate-700 bg-slate-900 shadow-2xl z-20">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${isVideoOff ? 'hidden' : 'block'}`}
                />
                {isVideoOff && (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-slate-500 text-xs gap-1">
                    <VideoOff className="w-6 h-6" />
                    <span>Camera Off</span>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Voice Call Screen */
            <div className="flex flex-col items-center justify-center">
              <div className="relative mb-6">
                <Avatar src={peer?.avatar?.url} name={peer?.fullName} size="xl" />
                <div className="absolute inset-0 rounded-full border-4 border-bakwas-500/40 animate-ping pointer-events-none" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">{peer?.fullName}</h3>
              <p className="text-sm font-mono text-bakwas-400">
                {callState === 'outgoing' ? 'Calling...' : formatDuration(duration)}
              </p>
            </div>
          )}

          {/* Floating Call Info overlay for video call */}
          {callType === 'video' && (
            <div className="absolute top-4 left-4 z-20 bg-black/50 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10">
              <h4 className="text-sm font-semibold text-white">{peer?.fullName}</h4>
              <p className="text-xs font-mono text-emerald-400">
                {callState === 'outgoing' ? 'Calling...' : formatDuration(duration)}
              </p>
            </div>
          )}
        </div>

        {/* Controls Bar Footer */}
        <div className="h-20 bg-slate-900/90 border-t border-slate-800 px-6 flex items-center justify-center gap-6 z-30">
          {/* Mute Microphone */}
          <button
            onClick={toggleMute}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
              isMuted ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
            title={isMuted ? 'Unmute Mic' : 'Mute Mic'}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Camera Video Toggle (if video call) */}
          {callType === 'video' && (
            <button
              onClick={toggleVideo}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                isVideoOff ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
              title={isVideoOff ? 'Turn Camera On' : 'Turn Camera Off'}
            >
              {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
            </button>
          )}

          {/* End Call Button */}
          <button
            onClick={() => endCall('caller_ended')}
            className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-xl shadow-rose-600/40 active:scale-95 transition-transform"
            title="End Call"
          >
            <PhoneOff className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};
