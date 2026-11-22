import React, { useState, useRef, useEffect } from 'react';
import {
  Smile,
  Paperclip,
  Mic,
  Send,
  X,
  Image as ImageIcon,
  FileText,
  Video as VideoIcon,
  RotateCw
} from 'lucide-react';
import { VoiceRecorder } from './VoiceRecorder';
import { useChatStore } from '../../store/useChatStore';
import { useAuthStore } from '../../store/useAuthStore';
import { getSocket } from '../../services/socket';
import { sound } from '../../services/sound';
import { api } from '../../services/api';

const EMOJI_LIST = [
  '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇',
  '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚',
  '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩',
  '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣',
  '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬',
  '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗',
  '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯',
  '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉',
  '👆', '🖕', '👇', '☝️', '🖐️', '✋', '🖖', '👋', '👏', '🙌',
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
  '🔥', '✨', '🎉', '🎊', '🚀', '💯', '🙏', '💪', '🤝', '☕'
];

export const MessageInput = () => {
  const [content, setContent] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const { activeConversation, addMessage, replyingTo, setReplyingTo } = useChatStore();
  const { user } = useAuthStore();

  const handleTyping = (text) => {
    setContent(text);
    const socket = getSocket();
    if (!socket || !activeConversation) return;

    socket.emit('typing:start', { conversationId: activeConversation._id });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing:stop', { conversationId: activeConversation._id });
    }, 2000);
  };

  const handleSendMessage = () => {
    if (!content.trim() || !activeConversation) return;

    const socket = getSocket();
    const tempId = `temp_${Date.now()}`;
    const messagePayload = {
      conversationId: activeConversation._id,
      content: content.trim(),
      messageType: 'text',
      replyToId: replyingTo?._id,
      tempId
    };

    // Optimistic local add
    addMessage({
      _id: tempId,
      conversationId: activeConversation._id,
      sender: user,
      content: content.trim(),
      messageType: 'text',
      replyTo: replyingTo,
      status: 'sending',
      createdAt: new Date().toISOString()
    });

    sound.playSent();
    setContent('');
    setReplyingTo(null);
    setShowEmojiPicker(false);

    if (socket) {
      socket.emit('message:send', messagePayload, (response) => {
        if (response?.error) {
          console.error('Failed to send message:', response.error);
        } else if (response?.message) {
          addMessage(response.message, false, tempId);
        }
      });
      socket.emit('typing:stop', { conversationId: activeConversation._id });
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileUpload = async (e, type) => {
    const file = e.target.files?.[0];
    if (!file || !activeConversation) return;

    setIsUploading(true);
    setShowAttachMenu(false);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const uploadRes = await api.post('/media/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const mediaData = uploadRes.data.data;
      const socket = getSocket();
      const tempId = `temp_${Date.now()}`;
      const messagePayload = {
        conversationId: activeConversation._id,
        content: file.name,
        messageType: type,
        media: mediaData,
        replyToId: replyingTo?._id,
        tempId
      };

      // Optimistic local add so the user sees their media immediately!
      addMessage({
        _id: tempId,
        conversationId: activeConversation._id,
        sender: user,
        content: file.name,
        messageType: type,
        media: mediaData,
        replyTo: replyingTo,
        status: 'sent',
        createdAt: new Date().toISOString()
      });

      if (socket) {
        socket.emit('message:send', messagePayload);
      }
      sound.playSent();
      setReplyingTo(null);
    } catch (err) {
      console.error('File upload error:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to upload attachment';
      alert(`Upload error: ${msg}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSendAudioNote = (mediaData) => {
    if (!activeConversation) return;

    const socket = getSocket();
    const tempId = `temp_${Date.now()}`;
    const messagePayload = {
      conversationId: activeConversation._id,
      content: 'Voice note',
      messageType: 'audio',
      media: mediaData,
      replyToId: replyingTo?._id,
      tempId
    };

    // Optimistic local add for audio voice notes!
    addMessage({
      _id: tempId,
      conversationId: activeConversation._id,
      sender: user,
      content: 'Voice note',
      messageType: 'audio',
      media: mediaData,
      replyTo: replyingTo,
      status: 'sent',
      createdAt: new Date().toISOString()
    });

    if (socket) {
      socket.emit('message:send', messagePayload);
    }
    sound.playSent();
    setIsRecordingVoice(false);
    setReplyingTo(null);
  };

  if (!activeConversation) return null;

  return (
    <div className="relative border-t border-slate-800/80 bg-bakwas-panel px-4 py-3 z-20">
      {/* Replying banner */}
      {replyingTo && (
        <div className="mb-2 p-2.5 rounded-xl bg-slate-900 border border-slate-700/80 flex items-center justify-between text-xs animate-in fade-in slide-in-from-bottom-2">
          <div className="border-l-4 border-bakwas-500 pl-2.5 min-w-0">
            <span className="font-semibold text-bakwas-400 block truncate">
              Replying to {replyingTo.sender?.fullName || 'User'}
            </span>
            <p className="text-slate-300 truncate">
              {replyingTo.content || `[${replyingTo.messageType}]`}
            </p>
          </div>
          <button
            onClick={() => setReplyingTo(null)}
            className="p-1 text-slate-400 hover:text-white rounded-full hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Uploading progress indicator */}
      {isUploading && (
        <div className="mb-2 p-2 px-3 rounded-xl bg-bakwas-500/10 border border-bakwas-500/30 text-xs text-bakwas-400 flex items-center gap-2 animate-pulse">
          <RotateCw className="w-3.5 h-3.5 animate-spin" />
          <span>Uploading media file...</span>
        </div>
      )}

      {/* Emoji Picker Popup */}
      {showEmojiPicker && (
        <div className="absolute bottom-16 left-4 w-72 sm:w-80 h-64 bg-slate-900 border border-slate-800 rounded-3xl p-3 shadow-2xl z-50 overflow-y-auto">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-xs font-semibold text-slate-300">
            <span>Emojis</span>
            <button onClick={() => setShowEmojiPicker(false)} className="text-slate-500 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1.5 text-xl">
            {EMOJI_LIST.map((emoji) => (
              <button
                key={emoji}
                onClick={() => setContent((prev) => prev + emoji)}
                className="hover:scale-125 transition-transform p-1.5 text-center flex items-center justify-center rounded-lg hover:bg-slate-800"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Attachment Menu Popup */}
      {showAttachMenu && (
        <div className="absolute bottom-16 left-12 bg-slate-900 border border-slate-800 rounded-2xl p-2 shadow-2xl z-50 flex flex-col gap-1 w-44 text-xs text-slate-200">
          <label className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-800 cursor-pointer">
            <ImageIcon className="w-4 h-4 text-emerald-400" />
            <span>Image / Photo</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileUpload(e, 'image')}
            />
          </label>

          <label className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-800 cursor-pointer">
            <VideoIcon className="w-4 h-4 text-cyan-400" />
            <span>Video</span>
            <input
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => handleFileUpload(e, 'video')}
            />
          </label>

          <label className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-800 cursor-pointer">
            <FileText className="w-4 h-4 text-indigo-400" />
            <span>Document / PDF</span>
            <input
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
              className="hidden"
              onChange={(e) => handleFileUpload(e, 'document')}
            />
          </label>
        </div>
      )}

      {/* Voice Recorder mode OR Regular Input */}
      {isRecordingVoice ? (
        <VoiceRecorder
          onSendAudio={handleSendAudioNote}
          onCancel={() => setIsRecordingVoice(false)}
        />
      ) : (
        <div className="flex items-end gap-2">
          {/* Emoji Toggle */}
          <button
            type="button"
            onClick={() => {
              setShowEmojiPicker(!showEmojiPicker);
              setShowAttachMenu(false);
            }}
            className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
          >
            <Smile className="w-5 h-5" />
          </button>

          {/* Attachment Toggle */}
          <button
            type="button"
            onClick={() => {
              setShowAttachMenu(!showAttachMenu);
              setShowEmojiPicker(false);
            }}
            className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          {/* Textarea */}
          <div className="flex-1 bg-slate-900 border border-slate-700/80 rounded-2xl px-4 py-2 min-h-[42px] max-h-32 flex items-center">
            <textarea
              rows={1}
              placeholder="Type a message..."
              value={content}
              onChange={(e) => handleTyping(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none resize-none max-h-28"
            />
          </div>

          {/* Send or Voice Record Button */}
          {content.trim() ? (
            <button
              onClick={handleSendMessage}
              className="p-2.5 rounded-full bg-bakwas-500 hover:bg-bakwas-600 text-slate-950 font-bold transition-transform active:scale-95 shadow-md flex-shrink-0"
              title="Send Message"
            >
              <Send className="w-5 h-5 fill-current" />
            </button>
          ) : (
            <button
              onClick={() => setIsRecordingVoice(true)}
              className="p-2.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 transition-transform active:scale-95 flex-shrink-0"
              title="Record Voice Note"
            >
              <Mic className="w-5 h-5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
