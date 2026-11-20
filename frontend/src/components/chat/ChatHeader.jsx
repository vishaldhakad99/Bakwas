import React, { useState } from 'react';
import {
  Phone,
  Video,
  Search,
  MoreVertical,
  ArrowLeft,
  Pin,
  Trash2,
  ShieldAlert,
  UserX
} from 'lucide-react';
import { format } from 'date-fns';
import { Avatar } from '../common/Avatar';
import { useAuthStore } from '../../store/useAuthStore';
import { useChatStore } from '../../store/useChatStore';
import { useCallStore } from '../../store/useCallStore';
import { api } from '../../services/api';

export const ChatHeader = ({ onBack, onToggleSearch, onOpenContactInfo }) => {
  const [showMenu, setShowMenu] = useState(false);
  const { user } = useAuthStore();
  const {
    activeConversation,
    typingUsers,
    onlineUserIds,
    fetchConversations,
    setActiveConversation
  } = useChatStore();
  const { startOutgoingCall } = useCallStore();

  if (!activeConversation) return null;

  const isGroup = activeConversation.type === 'group';

  // Get details
  const otherParticipant = isGroup
    ? null
    : (activeConversation.participants || []).find((p) => p._id !== user?._id) ||
      activeConversation.participants?.[0];

  const title = isGroup
    ? activeConversation.group?.name || 'Group Chat'
    : otherParticipant?.fullName || otherParticipant?.formattedPhone || 'Chat';

  const avatarUrl = isGroup
    ? activeConversation.group?.avatar?.url
    : otherParticipant?.avatar?.url;

  const isOnline = otherParticipant ? onlineUserIds.has(otherParticipant._id) : false;
  const isTyping = (typingUsers[activeConversation._id] || []).length > 0;
  const typingNames = (typingUsers[activeConversation._id] || []).join(', ');

  const handleStartCall = (type) => {
    if (isGroup) {
      alert('Group calling is coming soon in the next release!');
      return;
    }
    if (otherParticipant) {
      startOutgoingCall(type, otherParticipant, activeConversation._id);
    }
  };

  const handleTogglePin = async () => {
    try {
      await api.post(`/chat/conversations/${activeConversation._id}/pin`);
      fetchConversations();
      setShowMenu(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearChat = async () => {
    if (window.confirm('Are you sure you want to clear this conversation history for yourself?')) {
      try {
        await api.post(`/chat/conversations/${activeConversation._id}/clear`);
        window.location.reload();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleBlockUser = async () => {
    if (!isGroup && otherParticipant) {
      if (window.confirm(`Block ${otherParticipant.fullName}? You will no longer receive calls or messages from them.`)) {
        try {
          await api.post('/contacts/block', { targetUserId: otherParticipant._id });
          alert('User blocked successfully');
          setShowMenu(false);
        } catch (err) {
          console.error(err);
        }
      }
    }
  };

  return (
    <div className="h-16 px-4 flex items-center justify-between bg-bakwas-panel border-b border-slate-800/80 z-20">
      {/* Left: Back button (mobile) + Avatar + Name & Status */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onBack}
          className="md:hidden p-1.5 -ml-1 text-slate-400 hover:text-white rounded-full hover:bg-slate-800"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div
          onClick={onOpenContactInfo}
          className="flex items-center gap-3 cursor-pointer min-w-0 group"
        >
          <Avatar src={avatarUrl} name={title} size="md" isOnline={isOnline} />

          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-slate-100 truncate group-hover:text-bakwas-400 transition-colors">
              {title}
            </h3>
            <p className="text-xs truncate">
              {isTyping ? (
                <span className="text-bakwas-400 font-medium italic animate-pulse">
                  {typingNames} is typing...
                </span>
              ) : isGroup ? (
                <span className="text-slate-400">
                  {activeConversation.participants?.length || 0} participants
                </span>
              ) : isOnline ? (
                <span className="text-emerald-400 font-medium">Online</span>
              ) : otherParticipant?.lastSeen ? (
                <span className="text-slate-400">
                  last seen {format(new Date(otherParticipant.lastSeen), 'h:mm a')}
                </span>
              ) : (
                <span className="text-slate-500">Offline</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1 text-slate-400 relative">
        <button
          onClick={() => handleStartCall('voice')}
          className="p-2.5 rounded-full hover:text-white hover:bg-slate-800/70 transition-colors"
          title="Voice Call"
        >
          <Phone className="w-5 h-5" />
        </button>

        <button
          onClick={() => handleStartCall('video')}
          className="p-2.5 rounded-full hover:text-white hover:bg-slate-800/70 transition-colors"
          title="Video Call"
        >
          <Video className="w-5 h-5" />
        </button>

        <button
          onClick={onToggleSearch}
          className="p-2.5 rounded-full hover:text-white hover:bg-slate-800/70 transition-colors"
          title="Search in Conversation"
        >
          <Search className="w-5 h-5" />
        </button>

        {/* Dropdown menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2.5 rounded-full hover:text-white hover:bg-slate-800/70 transition-colors"
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          {showMenu && (
            <div className="absolute right-0 top-12 w-48 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl py-1.5 z-50 text-xs text-slate-300">
              <button
                onClick={handleTogglePin}
                className="w-full px-4 py-2 text-left hover:bg-slate-800 flex items-center gap-2"
              >
                <Pin className="w-4 h-4 text-slate-400" />
                <span>{activeConversation.isPinned ? 'Unpin Chat' : 'Pin Chat'}</span>
              </button>

              <button
                onClick={handleClearChat}
                className="w-full px-4 py-2 text-left hover:bg-slate-800 flex items-center gap-2 text-rose-400"
              >
                <Trash2 className="w-4 h-4" />
                <span>Clear Messages</span>
              </button>

              {!isGroup && (
                <button
                  onClick={handleBlockUser}
                  className="w-full px-4 py-2 text-left hover:bg-slate-800 flex items-center gap-2 text-rose-400"
                >
                  <UserX className="w-4 h-4" />
                  <span>Block User</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
