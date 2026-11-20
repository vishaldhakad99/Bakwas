import React from 'react';
import { Lock, ShieldCheck, PhoneCall, Video, Zap, MessageSquare, UserPlus } from 'lucide-react';

export const EmptyChat = ({ onOpenNewChat, onOpenSaveContact }) => {
  return (
    <div className="hidden md:flex flex-1 h-full flex-col items-center justify-center p-8 bg-bakwas-dark text-center select-none relative overflow-hidden chat-wallpaper-dark">
      {/* Decorative gradient lights */}
      <div className="absolute w-96 h-96 bg-bakwas-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md flex flex-col items-center z-10">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-bakwas-600 via-teal-500 to-cyan-400 p-0.5 shadow-2xl shadow-bakwas-500/25 mb-6">
          <div className="w-full h-full bg-bakwas-dark rounded-[22px] flex items-center justify-center">
            <img src="/icon.svg" alt="BAKWAS" className="w-12 h-12" />
          </div>
        </div>

        <h2 className="text-2xl font-bold tracking-tight text-white mb-2">
          BAKWAS Web
        </h2>
        <p className="text-sm text-slate-400 leading-relaxed mb-6">
          Send real-time messages, make crisp WebRTC audio and video calls, and keep all your conversations synchronized 24/7.
        </p>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-2 gap-3 w-full mb-8 text-left">
          <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800/60 backdrop-blur-sm">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-2">
              <Zap className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-semibold text-slate-200">Instant Delivery</h4>
            <p className="text-[11px] text-slate-400">Live Socket.IO real-time presence and sync.</p>
          </div>

          <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800/60 backdrop-blur-sm">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-2">
              <Video className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-semibold text-slate-200">WebRTC Calls</h4>
            <p className="text-[11px] text-slate-400">P2P voice & video across networks via STUN/TURN.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={onOpenNewChat}
            className="px-5 py-3 rounded-xl bg-bakwas-500 hover:bg-bakwas-600 text-slate-950 font-bold text-sm transition-all flex items-center gap-2 shadow-lg shadow-bakwas-500/25 active:scale-95"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Start a New Chat</span>
          </button>

          {onOpenSaveContact && (
            <button
              onClick={onOpenSaveContact}
              className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm transition-all flex items-center gap-2 border border-slate-700 active:scale-95"
            >
              <UserPlus className="w-4 h-4 text-bakwas-400" />
              <span>Save a Number</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 mt-12">
          <Lock className="w-3.5 h-3.5 text-slate-400" />
          <span>TLS 1.3 Transport Encrypted & MongoDB Atlas Protected</span>
        </div>
      </div>
    </div>
  );
};
