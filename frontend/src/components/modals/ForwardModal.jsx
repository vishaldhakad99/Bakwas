import React, { useState } from 'react';
import { X, CornerUpRight, Send, Check } from 'lucide-react';
import { Avatar } from '../common/Avatar';
import { useChatStore } from '../../store/useChatStore';
import { useAuthStore } from '../../store/useAuthStore';
import { getSocket } from '../../services/socket';

export const ForwardModal = ({ message, onClose }) => {
  const [selectedConvIds, setSelectedConvIds] = useState([]);
  const [isSending, setIsSending] = useState(false);

  const { conversations } = useChatStore();
  const { user } = useAuthStore();

  if (!message) return null;

  const toggleSelect = (id) => {
    if (selectedConvIds.includes(id)) {
      setSelectedConvIds(selectedConvIds.filter((x) => x !== id));
    } else {
      setSelectedConvIds([...selectedConvIds, id]);
    }
  };

  const handleForward = () => {
    if (selectedConvIds.length === 0) return;
    setIsSending(true);

    const socket = getSocket();
    if (socket) {
      selectedConvIds.forEach((convId) => {
        socket.emit('message:send', {
          conversationId: convId,
          content: message.content,
          messageType: message.messageType,
          media: message.media,
          forwarded: true
        });
      });
    }

    setIsSending(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-sm bg-bakwas-panel border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <CornerUpRight className="w-4 h-4 text-bakwas-400" />
            <span>Forward Message</span>
          </h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-full">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="my-2 p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 truncate">
          <span className="font-semibold text-slate-400 mr-1">Message:</span>
          {message.content || `[${message.messageType}]`}
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/40 my-2">
          {conversations.map((c) => {
            const isGroup = c.type === 'group';
            const other = (c.participants || []).find((p) => p._id !== user?._id) || {};
            const title = isGroup ? c.group?.name : other.fullName || other.formattedPhone;
            const isSelected = selectedConvIds.includes(c._id);

            return (
              <div
                key={c._id}
                onClick={() => toggleSelect(c._id)}
                className="py-2.5 px-2 flex items-center justify-between hover:bg-slate-800/40 rounded-xl cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Avatar
                    src={isGroup ? c.group?.avatar?.url : other.avatar?.url}
                    name={title}
                    size="sm"
                  />
                  <span className="text-xs font-semibold text-white">{title}</span>
                </div>
                <div
                  className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                    isSelected
                      ? 'bg-bakwas-500 border-bakwas-500 text-slate-950'
                      : 'border-slate-600'
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={handleForward}
            disabled={selectedConvIds.length === 0 || isSending}
            className="py-2.5 px-5 rounded-xl bg-bakwas-500 hover:bg-bakwas-600 text-slate-950 font-semibold text-xs flex items-center gap-2 disabled:opacity-40"
          >
            <Send className="w-4 h-4" />
            <span>Forward ({selectedConvIds.length})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
