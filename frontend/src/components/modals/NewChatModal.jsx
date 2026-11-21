import React, { useState, useEffect } from 'react';
import { X, Search, UserPlus, MessageSquare, Users } from 'lucide-react';
import { Avatar } from '../common/Avatar';
import { api } from '../../services/api';
import { useChatStore } from '../../store/useChatStore';

export const NewChatModal = ({ isOpen, onClose, onOpenSaveContact }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const { setActiveConversation, fetchConversations } = useChatStore();

  const loadUsers = async (searchVal = '') => {
    setIsSearching(true);
    try {
      const res = await api.get(`/users/search?query=${encodeURIComponent(searchVal.trim())}`);
      setResults(res.data.data || []);
    } catch (err) {
      console.error('Failed to search users:', err);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      loadUsers('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSearch = (val) => {
    setQuery(val);
    loadUsers(val);
  };

  const handleStartChat = async (user) => {
    try {
      const res = await api.post('/chat/conversations', { recipientId: user._id });
      await fetchConversations();
      setActiveConversation(res.data.data);
      onClose();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to start conversation');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-md bg-bakwas-panel border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-bakwas-400" />
            <span>New Chat</span>
          </h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search input */}
        <div className="my-3 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name, phone or username..."
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            autoFocus
            className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-bakwas-500"
          />
        </div>

        {/* Quick action: Save new number */}
        {onOpenSaveContact && (
          <button
            onClick={onOpenSaveContact}
            className="mb-3 w-full py-2.5 px-3 rounded-xl bg-bakwas-500/10 hover:bg-bakwas-500/20 border border-bakwas-500/30 text-bakwas-400 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            <span>Save a New Phone Number</span>
          </button>
        )}

        {/* Results List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/40">
          {!query && results.length > 0 && (
            <div className="px-2 py-1.5 text-[11px] font-semibold text-slate-400 flex items-center gap-1.5 uppercase tracking-wider">
              <Users className="w-3.5 h-3.5 text-bakwas-400" />
              <span>Registered BAKWAS Members ({results.length})</span>
            </div>
          )}

          {isSearching && (
            <div className="py-8 text-center text-xs text-slate-500">Searching directory...</div>
          )}

          {!isSearching && results.length === 0 && (
            <div className="py-8 text-center text-xs text-slate-500">
              {query ? `No users found for "${query}"` : 'No other users registered yet. Save a number or share the link with a friend!'}
            </div>
          )}

          {results.map((u) => (
            <div
              key={u._id}
              onClick={() => handleStartChat(u)}
              className="py-3 px-2 flex items-center justify-between hover:bg-slate-800/50 rounded-xl cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Avatar src={u.avatar?.url} name={u.fullName} size="md" />
                <div className="min-w-0">
                  <h4 className="text-sm font-semibold text-white truncate">{u.fullName}</h4>
                  <p className="text-xs text-slate-400 truncate">{u.formattedPhone}</p>
                </div>
              </div>
              <button className="p-2 text-bakwas-400 hover:bg-bakwas-500/10 rounded-full">
                <MessageSquare className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
