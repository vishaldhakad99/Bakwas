import React, { useState, useRef } from 'react';
import {
  MoreVertical,
  Reply,
  CornerUpRight,
  Star,
  Trash2,
  Edit2,
  Play,
  Pause,
  FileText,
  Download,
  PhoneCall,
  Video,
  CornerDownRight
} from 'lucide-react';
import { format } from 'date-fns';
import { StatusTicks } from '../common/StatusTicks';
import { Avatar } from '../common/Avatar';
import { useAuthStore } from '../../store/useAuthStore';
import { useChatStore } from '../../store/useChatStore';
import { api, getMediaUrl } from '../../services/api';
import { getSocket } from '../../services/socket';

const POPULAR_EMOJIS = ['❤️', '👍', '😂', '😮', '😢', '🙏'];

export const MessageBubble = ({
  message,
  isGroup = false,
  onOpenImage,
  onForward
}) => {
  const [showActions, setShowActions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content || '');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const audioRef = useRef(null);

  const { user } = useAuthStore();
  const { setReplyingTo, updateMessageReactions, activeConversation } = useChatStore();

  const isSender = message.sender?._id === user?._id || message.sender === user?._id;
  const isDeleted = message.deletedForEveryone;
  const isStarred = (message.starredBy || []).includes(user?._id);

  const handleToggleAudio = () => {
    if (!audioRef.current) return;
    if (isPlayingAudio) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioRef.current.play();
      setIsPlayingAudio(true);
    }
  };

  const handleReact = (emoji) => {
    const socket = getSocket();
    if (socket && activeConversation) {
      socket.emit('message:react', {
        messageId: message._id,
        conversationId: activeConversation._id,
        emoji
      });
    }
    setShowActions(false);
  };

  const handleStar = async () => {
    try {
      await api.post(`/chat/messages/${message._id}/star`);
      message.starredBy = isStarred
        ? (message.starredBy || []).filter((id) => id !== user?._id)
        : [...(message.starredBy || []), user?._id];
      setShowActions(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (type) => {
    if (window.confirm(`Delete message for ${type === 'everyone' ? 'everyone' : 'you'}?`)) {
      try {
        await api.delete(`/chat/messages/${message._id}?type=${type}`);
        window.location.reload();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleSaveEdit = async () => {
    if (!editContent.trim()) return;
    try {
      await api.put(`/chat/messages/${message._id}`, { newContent: editContent.trim() });
      message.content = editContent.trim();
      message.isEdited = true;
      setIsEditing(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to edit message');
    }
  };

  return (
    <div
      className={`group relative flex flex-col mb-1.5 px-4 ${
        isSender ? 'items-end' : 'items-start'
      }`}
      onMouseLeave={() => setShowActions(false)}
    >
      <div
        className={`max-w-[85%] sm:max-w-[70%] md:max-w-[60%] rounded-2xl p-2.5 shadow-sm text-sm relative transition-all ${
          isSender
            ? 'bg-bakwas-sent text-slate-100 rounded-tr-none'
            : 'bg-bakwas-received text-slate-100 rounded-tl-none border border-slate-800/40'
        }`}
      >
        {/* Forwarded Header */}
        {message.forwarded && (
          <div className="flex items-center gap-1 text-[11px] text-slate-400 italic mb-1">
            <CornerUpRight className="w-3 h-3" />
            <span>Forwarded</span>
          </div>
        )}

        {/* Group Sender Name */}
        {isGroup && !isSender && message.sender && (
          <div className="text-xs font-semibold text-teal-400 mb-1">
            {message.sender.fullName || message.sender.username}
          </div>
        )}

        {/* Replied Message Banner */}
        {message.replyTo && (
          <div className="mb-2 p-2 rounded-lg bg-black/20 border-l-4 border-bakwas-400 text-xs">
            <span className="font-semibold text-bakwas-400 block truncate">
              {message.replyTo.sender?.fullName || 'User'}
            </span>
            <span className="text-slate-300 line-clamp-1">
              {message.replyTo.content || `[${message.replyTo.messageType}]`}
            </span>
          </div>
        )}

        {/* Media: Image */}
        {message.messageType === 'image' && message.media?.url && (
          <div className="rounded-xl overflow-hidden mb-1.5 max-h-80 cursor-pointer">
            <img
              src={getMediaUrl(message.media.url)}
              alt={message.media.fileName || 'Photo'}
              onClick={() => onOpenImage(getMediaUrl(message.media.url))}
              className="w-full h-auto object-cover hover:opacity-95 transition-opacity"
            />
          </div>
        )}

        {/* Media: Video */}
        {message.messageType === 'video' && message.media?.url && (
          <div className="rounded-xl overflow-hidden mb-1.5 max-h-80">
            <video
              src={getMediaUrl(message.media.url)}
              controls
              className="w-full max-h-80 rounded-xl bg-black"
            />
          </div>
        )}

        {/* Media: Audio / Voice Note */}
        {message.messageType === 'audio' && message.media?.url && (
          <div className="flex items-center gap-3 py-1.5 px-1 min-w-[220px]">
            <audio
              ref={audioRef}
              src={getMediaUrl(message.media.url)}
              onEnded={() => setIsPlayingAudio(false)}
            />
            <button
              onClick={handleToggleAudio}
              className="w-10 h-10 rounded-full bg-bakwas-500 text-slate-950 flex items-center justify-center flex-shrink-0 shadow-md active:scale-95 transition-transform"
            >
              {isPlayingAudio ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
            </button>
            <div className="flex-1 flex items-center gap-1 h-6">
              {[4, 12, 18, 8, 14, 20, 10, 16, 6, 12, 14, 8, 18, 10].map((h, i) => (
                <div
                  key={i}
                  style={{ height: isPlayingAudio ? undefined : `${h}px` }}
                  className={`w-1 rounded-full ${isPlayingAudio ? 'wave-bar' : ''} ${
                    isSender ? 'bg-slate-300' : 'bg-slate-400'
                  }`}
                />
              ))}
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              {message.media.duration ? `${Math.floor(message.media.duration)}s` : 'Voice'}
            </span>
          </div>
        )}

        {/* Media: Document / PDF */}
        {(message.messageType === 'document' || message.messageType === 'pdf') && message.media?.url && (
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-black/25 mb-1.5">
            <div className="w-10 h-10 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-100 truncate">
                {message.media.fileName || 'Attachment'}
              </p>
              <p className="text-[10px] text-slate-400">
                {message.media.fileSize
                  ? `${(message.media.fileSize / 1024).toFixed(1)} KB`
                  : 'Document'}
              </p>
            </div>
            <a
              href={getMediaUrl(message.media.url)}
              download={message.media.fileName}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-full hover:bg-slate-700 text-slate-300"
            >
              <Download className="w-4 h-4" />
            </a>
          </div>
        )}

        {/* Call Log message */}
        {message.messageType === 'call_log' && (
          <div className="flex items-center gap-2.5 py-1 text-slate-200">
            {message.callLog?.callType === 'video' ? (
              <Video className="w-5 h-5 text-cyan-400" />
            ) : (
              <PhoneCall className="w-5 h-5 text-emerald-400" />
            )}
            <div>
              <p className="text-xs font-semibold">{message.content}</p>
              {message.callLog?.duration > 0 && (
                <p className="text-[10px] text-slate-400">
                  Duration: {Math.floor(message.callLog.duration / 60)}m {message.callLog.duration % 60}s
                </p>
              )}
            </div>
          </div>
        )}

        {/* Content text */}
        {message.messageType !== 'call_log' && (
          <div>
            {isEditing ? (
              <div className="space-y-2 mt-1">
                <input
                  type="text"
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full bg-slate-900 px-3 py-1.5 rounded-lg text-xs text-white border border-slate-700"
                />
                <div className="flex justify-end gap-2 text-xs">
                  <button onClick={() => setIsEditing(false)} className="text-slate-400">Cancel</button>
                  <button onClick={handleSaveEdit} className="text-bakwas-400 font-semibold">Save</button>
                </div>
              </div>
            ) : (
              <p className={`whitespace-pre-wrap break-words leading-relaxed ${isDeleted ? 'italic text-slate-400' : ''}`}>
                {message.content}
              </p>
            )}
          </div>
        )}

        {/* Metadata footer: time, edited tag, star, status ticks */}
        <div className="flex items-center justify-end gap-1.5 mt-1 select-none">
          {message.isEdited && (
            <span className="text-[10px] text-slate-400 italic">edited</span>
          )}
          {isStarred && (
            <Star className="w-3 h-3 text-amber-400 fill-current" />
          )}
          <span className="text-[10px] text-slate-400">
            {format(new Date(message.createdAt || Date.now()), 'h:mm a')}
          </span>
          {isSender && <StatusTicks status={message.status} />}
        </div>

        {/* Emoji Reactions pill badge */}
        {message.reactions?.length > 0 && (
          <div className="absolute -bottom-2.5 right-2 flex items-center gap-0.5 bg-slate-900 border border-slate-700 rounded-full px-2 py-0.5 shadow-md text-xs cursor-pointer">
            {message.reactions.map((r, i) => (
              <span key={i}>{r.emoji}</span>
            ))}
            {message.reactions.length > 1 && (
              <span className="text-[10px] text-slate-400 ml-0.5 font-bold">{message.reactions.length}</span>
            )}
          </div>
        )}
      </div>

      {/* Hover action menu button */}
      {!isDeleted && (
        <div
          className={`absolute top-0 ${
            isSender ? 'right-2' : 'left-2'
          } opacity-0 group-hover:opacity-100 transition-opacity z-10`}
        >
          <div className="relative">
            <button
              onClick={() => setShowActions(!showActions)}
              className="p-1.5 rounded-full bg-slate-900 border border-slate-800 text-slate-400 hover:text-white shadow-lg"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>

            {showActions && (
              <div
                className={`absolute ${
                  isSender ? 'right-0' : 'left-0'
                } top-8 w-44 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl py-1.5 z-50 text-xs text-slate-300`}
              >
                {/* Quick Emoji bar */}
                <div className="flex items-center justify-around px-2 py-1.5 border-b border-slate-800">
                  {POPULAR_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => handleReact(emoji)}
                      className="hover:scale-125 transition-transform text-sm"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => { setReplyingTo(message); setShowActions(false); }}
                  className="w-full px-3 py-2 text-left hover:bg-slate-800 flex items-center gap-2"
                >
                  <Reply className="w-3.5 h-3.5 text-slate-400" />
                  <span>Reply</span>
                </button>

                <button
                  onClick={() => { onForward(message); setShowActions(false); }}
                  className="w-full px-3 py-2 text-left hover:bg-slate-800 flex items-center gap-2"
                >
                  <CornerUpRight className="w-3.5 h-3.5 text-slate-400" />
                  <span>Forward</span>
                </button>

                <button
                  onClick={handleStar}
                  className="w-full px-3 py-2 text-left hover:bg-slate-800 flex items-center gap-2"
                >
                  <Star className="w-3.5 h-3.5 text-slate-400" />
                  <span>{isStarred ? 'Unstar' : 'Star'}</span>
                </button>

                {isSender && (
                  <button
                    onClick={() => { setIsEditing(true); setShowActions(false); }}
                    className="w-full px-3 py-2 text-left hover:bg-slate-800 flex items-center gap-2"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>Edit</span>
                  </button>
                )}

                <button
                  onClick={() => handleDelete('me')}
                  className="w-full px-3 py-2 text-left hover:bg-slate-800 flex items-center gap-2 text-rose-400"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete for me</span>
                </button>

                {isSender && (
                  <button
                    onClick={() => handleDelete('everyone')}
                    className="w-full px-3 py-2 text-left hover:bg-slate-800 flex items-center gap-2 text-rose-400 font-medium"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete for everyone</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
