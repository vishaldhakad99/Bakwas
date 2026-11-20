import React, { useState, useRef, useEffect } from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import { X, Search } from 'lucide-react';
import { ChatHeader } from '../chat/ChatHeader';
import { MessageBubble } from '../chat/MessageBubble';
import { MessageInput } from '../chat/MessageInput';
import { useChatStore } from '../../store/useChatStore';

const formatMessageDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'MMMM d, yyyy');
};

export const ChatPanel = ({ onBack, onOpenContactInfo, onForwardMessage }) => {
  const [lightboxImage, setLightboxImage] = useState(null);
  const [showInChatSearch, setShowInChatSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const messagesEndRef = useRef(null);
  const { activeConversation, messages, isLoadingMessages } = useChatStore();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages.length]);

  if (!activeConversation) return null;

  // Filter messages if in-chat search active
  const filteredMessages = searchQuery.trim()
    ? messages.filter((m) =>
        (m.content || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : messages;

  return (
    <div className="flex-1 h-full flex flex-col bg-bakwas-dark select-none relative overflow-hidden">
      {/* Chat Header */}
      <ChatHeader
        onBack={onBack}
        onToggleSearch={() => setShowInChatSearch(!showInChatSearch)}
        onOpenContactInfo={onOpenContactInfo}
      />

      {/* In-Chat Search Bar Drawer */}
      {showInChatSearch && (
        <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 flex items-center gap-2 z-10 animate-in slide-in-from-top-2">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search in this conversation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
            className="flex-1 bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => { setShowInChatSearch(false); setSearchQuery(''); }}
            className="text-xs text-bakwas-400 font-medium"
          >
            Close
          </button>
        </div>
      )}

      {/* Messages Scroll Area with Subtle Matrix Wallpaper */}
      <div className="flex-1 overflow-y-auto py-4 chat-wallpaper-dark">
        {isLoadingMessages && (
          <div className="py-4 text-center">
            <span className="text-xs text-slate-500 font-medium">Loading conversation history...</span>
          </div>
        )}

        {filteredMessages.length === 0 && !isLoadingMessages && (
          <div className="py-20 text-center text-slate-500 text-xs">
            {searchQuery ? 'No messages matching search' : 'No messages yet. Send a greeting! 👋'}
          </div>
        )}

        {filteredMessages.map((msg, idx) => {
          const prevMsg = filteredMessages[idx - 1];
          const showDateSeparator =
            !prevMsg ||
            formatMessageDate(prevMsg.createdAt) !== formatMessageDate(msg.createdAt);

          return (
            <React.Fragment key={msg._id || idx}>
              {showDateSeparator && (
                <div className="flex items-center justify-center my-3 select-none">
                  <span className="px-3 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-[11px] font-medium text-slate-400 shadow-sm">
                    {formatMessageDate(msg.createdAt)}
                  </span>
                </div>
              )}

              <MessageBubble
                message={msg}
                isGroup={activeConversation.type === 'group'}
                onOpenImage={(url) => setLightboxImage(url)}
                onForward={(m) => onForwardMessage(m)}
              />
            </React.Fragment>
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Footer */}
      <MessageInput />

      {/* Image Lightbox Modal */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
        >
          <img
            src={lightboxImage}
            alt="Preview"
            className="max-w-full max-h-[90vh] rounded-2xl object-contain shadow-2xl"
          />
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 p-2 text-white bg-slate-800/80 rounded-full hover:bg-slate-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      )}
    </div>
  );
};
