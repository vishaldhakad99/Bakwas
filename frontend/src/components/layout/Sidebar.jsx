import React, { useState } from 'react';
import {
  MessageSquarePlus,
  Users,
  Settings as SettingsIcon,
  Search,
  Pin,
  X,
  Volume2,
  Video,
  UserPlus,
  Phone
} from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { Avatar } from '../common/Avatar';
import { StatusTicks } from '../common/StatusTicks';
import { useAuthStore } from '../../store/useAuthStore';
import { useChatStore } from '../../store/useChatStore';

const formatChatTime = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  if (isToday(date)) return format(date, 'h:mm a');
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'dd/MM/yy');
};

export const Sidebar = ({
  onOpenNewChat,
  onOpenNewGroup,
  onOpenProfile,
  onOpenSettings,
  onOpenContacts,
  onOpenSaveContact
}) => {
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'unread' | 'groups'
  const { user } = useAuthStore();
  const {
    conversations,
    activeConversation,
    setActiveConversation,
    searchFilter,
    setSearchFilter,
    typingUsers,
    onlineUserIds
  } = useChatStore();

  // Helper to extract display info for a conversation
  const getConversationDetails = (conv) => {
    if (conv.type === 'group') {
      return {
        title: conv.group?.name || 'Group Chat',
        avatar: conv.group?.avatar?.url,
        isOnline: false
      };
    }

    const otherParticipant = (conv.participants || []).find(
      (p) => p._id !== user?._id
    ) || conv.participants?.[0] || {};

    const isOnline = onlineUserIds.has(otherParticipant._id);

    return {
      title: otherParticipant.fullName || otherParticipant.formattedPhone || 'Chat',
      avatar: otherParticipant.avatar?.url,
      isOnline
    };
  };

  // Filter conversations
  const filteredConversations = conversations.filter((c) => {
    const details = getConversationDetails(c);
    const matchesSearch =
      details.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
      (c.lastMessage?.content || '').toLowerCase().includes(searchFilter.toLowerCase());

    if (!matchesSearch) return false;
    if (activeTab === 'unread') return (c.unreadCount || 0) > 0;
    if (activeTab === 'groups') return c.type === 'group';
    return true;
  });

  const pinnedChats = filteredConversations.filter((c) => c.isPinned);
  const otherChats = filteredConversations.filter((c) => !c.isPinned);

  return (
    <div className="w-full md:w-[380px] lg:w-[420px] h-full flex flex-col bg-bakwas-panel dark:bg-bakwas-panel border-r border-slate-800/80 select-none flex-shrink-0">
      {/* Top Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-slate-800/60 bg-bakwas-panel">
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenProfile}
            className="focus:outline-none transition-transform active:scale-95 relative group"
            title="Profile Settings"
          >
            <Avatar src={user?.avatar?.url} name={user?.fullName || 'Me'} size="md" />
            <div className="absolute inset-0 rounded-full bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px]">
              Edit
            </div>
          </button>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-bakwas-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
                BAKWAS
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500 animate-pulse" />
            </div>
            <p className="text-[11px] text-slate-400 font-medium">Real-Time Messaging</p>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={onOpenSaveContact}
            className="p-2 rounded-full text-slate-400 hover:text-bakwas-400 hover:bg-slate-800/70 transition-colors"
            title="Save Number / Add Contact"
          >
            <UserPlus className="w-4 h-4" />
          </button>
          <button
            onClick={onOpenContacts}
            className="p-2 rounded-full text-slate-400 hover:text-cyan-400 hover:bg-slate-800/70 transition-colors"
            title="Saved Contacts & Address Book"
          >
            <Phone className="w-4 h-4" />
          </button>
          <button
            onClick={onOpenNewChat}
            className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800/70 transition-colors"
            title="Start New Chat"
          >
            <MessageSquarePlus className="w-4 h-4" />
          </button>
          <button
            onClick={onOpenNewGroup}
            className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800/70 transition-colors"
            title="Create Group"
          >
            <Users className="w-4 h-4" />
          </button>
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800/70 transition-colors"
            title="Settings & Privacy"
          >
            <SettingsIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="p-3 border-b border-slate-800/40">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search or start a new chat..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-9 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-bakwas-500 transition-colors"
          />
          {searchFilter && (
            <button
              onClick={() => setSearchFilter('')}
              className="absolute right-3 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 mt-2.5 overflow-x-auto no-scrollbar">
          {['all', 'unread', 'groups'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                activeTab === tab
                  ? 'bg-bakwas-500/20 text-bakwas-400 border border-bakwas-500/40'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
          <button
            onClick={onOpenContacts}
            className="px-3 py-1 rounded-full text-xs font-medium bg-slate-900 text-slate-400 hover:text-bakwas-400 border border-transparent hover:border-slate-700 flex items-center gap-1 transition-colors"
          >
            <Phone className="w-3 h-3" />
            <span>Contacts</span>
          </button>
        </div>
      </div>

      {/* Chat List Container */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/30">
        {filteredConversations.length === 0 ? (
          <div className="py-12 px-6 text-center text-slate-400 flex flex-col items-center">
            <div className="w-14 h-14 rounded-2xl bg-bakwas-500/10 border border-bakwas-500/20 flex items-center justify-center text-bakwas-400 mb-4">
              <MessageSquarePlus className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-semibold text-white mb-1">No chats yet</h3>
            <p className="text-xs text-slate-400 max-w-[220px] mb-5 leading-relaxed">
              Start a new conversation with registered members or save a phone number.
            </p>
            <button
              onClick={onOpenNewChat}
              className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-bakwas-500 to-teal-500 text-slate-950 font-bold text-xs shadow-lg shadow-bakwas-500/20 hover:from-bakwas-600 hover:to-teal-600 transition-all flex items-center gap-2 active:scale-95"
            >
              <MessageSquarePlus className="w-4 h-4" />
              <span>Start New Chat</span>
            </button>
          </div>
        ) : (
          <>
            {/* Pinned section */}
            {pinnedChats.length > 0 && (
              <div className="py-1">
                <div className="px-4 py-1 text-[10px] font-semibold tracking-wider uppercase text-slate-500 flex items-center gap-1">
                  <Pin className="w-3 h-3 text-amber-400" />
                  <span>Pinned Chats</span>
                </div>
                {pinnedChats.map((c) => (
                  <ChatListItem
                    key={c._id}
                    conversation={c}
                    details={getConversationDetails(c)}
                    isActive={activeConversation?._id === c._id}
                    onClick={() => setActiveConversation(c)}
                    currentUserId={user?._id}
                    typingUserNames={typingUsers[c._id] || []}
                  />
                ))}
              </div>
            )}

            {/* Other chats */}
            <div className="py-1">
              {otherChats.map((c) => (
                <ChatListItem
                  key={c._id}
                  conversation={c}
                  details={getConversationDetails(c)}
                  isActive={activeConversation?._id === c._id}
                  onClick={() => setActiveConversation(c)}
                  currentUserId={user?._id}
                  typingUserNames={typingUsers[c._id] || []}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const ChatListItem = ({
  conversation,
  details,
  isActive,
  onClick,
  currentUserId,
  typingUserNames
}) => {
  const lastMsg = conversation.lastMessage;
  const isSender = lastMsg?.sender?._id === currentUserId || lastMsg?.sender === currentUserId;
  const isTyping = typingUserNames.length > 0;

  return (
    <div
      onClick={onClick}
      className={`px-3 py-3 flex items-center gap-3 cursor-pointer transition-colors relative ${
        isActive
          ? 'bg-bakwas-hover/80 dark:bg-slate-800/80 border-l-4 border-bakwas-500'
          : 'hover:bg-slate-800/40'
      }`}
    >
      <Avatar
        src={details.avatar}
        name={details.title}
        size="md"
        isOnline={details.isOnline}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-sm font-medium text-slate-100 truncate">
            {details.title}
          </span>
          <span className="text-[11px] text-slate-400 whitespace-nowrap ml-2">
            {formatChatTime(conversation.updatedAt)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-1">
          <div className="text-xs text-slate-400 truncate flex items-center gap-1 min-w-0">
            {isTyping ? (
              <span className="text-bakwas-400 font-medium italic animate-pulse">
                {typingUserNames[0]} is typing...
              </span>
            ) : lastMsg ? (
              <>
                {isSender && <StatusTicks status={lastMsg.status} />}
                <span className="truncate">
                  {lastMsg.messageType === 'text'
                    ? lastMsg.content
                    : `[${lastMsg.messageType.toUpperCase()}] ${lastMsg.content || ''}`}
                </span>
              </>
            ) : (
              <span className="italic text-slate-500">Tap to start chatting</span>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {conversation.isPinned && (
              <Pin className="w-3.5 h-3.5 text-slate-500" />
            )}
            {conversation.unreadCount > 0 && (
              <span className="px-1.5 py-0.5 min-w-[18px] text-[10px] font-bold rounded-full bg-bakwas-500 text-slate-950 text-center leading-none">
                {conversation.unreadCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
