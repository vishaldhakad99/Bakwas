import React from 'react';
import { Phone, PhoneOff, Video } from 'lucide-react';
import { Avatar } from '../common/Avatar';
import { useCallStore } from '../../store/useCallStore';

export const IncomingCallModal = () => {
  const { callState, callType, peer, acceptIncomingCall, rejectIncomingCall } = useCallStore();

  if (callState !== 'incoming' || !peer) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="w-full max-w-sm bg-bakwas-panel border border-slate-700/80 rounded-3xl p-8 text-center shadow-2xl relative overflow-hidden">
        {/* Pulsing ring animation */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-64 h-64 rounded-full bg-bakwas-500/10 ring-pulse" />
        </div>

        <div className="relative z-10 flex flex-col items-center">
          <Avatar src={peer.avatar?.url} name={peer.fullName} size="xl" className="mb-4 shadow-xl" />

          <h3 className="text-xl font-bold text-white mb-1">{peer.fullName}</h3>
          <p className="text-xs text-slate-400 mb-2">{peer.formattedPhone || peer.username}</p>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-bakwas-500/20 text-bakwas-400 text-xs font-semibold mb-8">
            {callType === 'video' ? <Video className="w-3.5 h-3.5" /> : <Phone className="w-3.5 h-3.5" />}
            <span>Incoming {callType === 'video' ? 'Video' : 'Voice'} Call</span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-center gap-8 w-full">
            {/* Decline */}
            <div className="flex flex-col items-center gap-1.5">
              <button
                onClick={rejectIncomingCall}
                className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-lg shadow-rose-600/30 active:scale-95 transition-transform"
                title="Decline"
              >
                <PhoneOff className="w-6 h-6" />
              </button>
              <span className="text-xs text-slate-400 font-medium">Decline</span>
            </div>

            {/* Accept */}
            <div className="flex flex-col items-center gap-1.5">
              <button
                onClick={acceptIncomingCall}
                className="w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 flex items-center justify-center shadow-lg shadow-emerald-500/30 active:scale-95 transition-transform animate-bounce"
                title="Accept"
              >
                {callType === 'video' ? <Video className="w-6 h-6 fill-current" /> : <Phone className="w-6 h-6 fill-current" />}
              </button>
              <span className="text-xs text-emerald-400 font-medium">Accept</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
