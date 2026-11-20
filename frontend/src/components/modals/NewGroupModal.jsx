import React, { useState } from 'react';
import { X, Users, Search, Check, ArrowRight } from 'lucide-react';
import { Avatar } from '../common/Avatar';
import { api } from '../../services/api';
import { useChatStore } from '../../store/useChatStore';

export const NewGroupModal = ({ isOpen, onClose }) => {
  const [step, setStep] = useState(1); // 1: select members, 2: group info
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { setActiveConversation, fetchConversations } = useChatStore();

  if (!isOpen) return null;

  const handleSearch = async (val) => {
    setQuery(val);
    if (val.trim().length < 2) return;
    try {
      const res = await api.get(`/users/search?query=${encodeURIComponent(val.trim())}`);
      setResults(res.data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleSelectUser = (u) => {
    if (selectedUsers.some((x) => x._id === u._id)) {
      setSelectedUsers(selectedUsers.filter((x) => x._id !== u._id));
    } else {
      setSelectedUsers([...selectedUsers, u]);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!groupName.trim() || selectedUsers.length === 0) return;

    setIsSubmitting(true);
    try {
      const res = await api.post('/groups', {
        name: groupName.trim(),
        description: description.trim(),
        participantIds: selectedUsers.map((u) => u._id)
      });

      await fetchConversations();
      onClose();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create group');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-md bg-bakwas-panel border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-teal-400" />
            <span>{step === 1 ? 'Add Group Participants' : 'New Group Details'}</span>
          </h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {step === 1 ? (
          <div className="flex-1 flex flex-col min-h-0 pt-4">
            {/* Selected chips */}
            {selectedUsers.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-2 border-b border-slate-800">
                {selectedUsers.map((u) => (
                  <div
                    key={u._id}
                    onClick={() => toggleSelectUser(u)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-bakwas-500/20 border border-bakwas-500/40 text-xs text-bakwas-300 cursor-pointer hover:bg-rose-500/20 hover:text-rose-300"
                  >
                    <span>{u.fullName}</span>
                    <X className="w-3 h-3" />
                  </div>
                ))}
              </div>
            )}

            <div className="relative mb-3">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
              <input
                type="text"
                placeholder="Search users to add..."
                value={query}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-bakwas-500"
              />
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-800/40">
              {results.map((u) => {
                const isSelected = selectedUsers.some((x) => x._id === u._id);
                return (
                  <div
                    key={u._id}
                    onClick={() => toggleSelectUser(u)}
                    className="py-2.5 px-2 flex items-center justify-between hover:bg-slate-800/40 rounded-xl cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar src={u.avatar?.url} name={u.fullName} size="sm" />
                      <div>
                        <h4 className="text-xs font-semibold text-white">{u.fullName}</h4>
                        <p className="text-[11px] text-slate-400">{u.formattedPhone}</p>
                      </div>
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

            <div className="pt-4 border-t border-slate-800 flex justify-end">
              <button
                disabled={selectedUsers.length === 0}
                onClick={() => setStep(2)}
                className="py-2.5 px-5 rounded-xl bg-bakwas-500 hover:bg-bakwas-600 text-slate-950 font-semibold text-xs transition-all flex items-center gap-1.5 disabled:opacity-40"
              >
                <span>Next ({selectedUsers.length})</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreateGroup} className="space-y-4 pt-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Group Name</label>
              <input
                type="text"
                required
                maxLength={100}
                placeholder="e.g. Core Engineering Team"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-bakwas-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Description (Optional)</label>
              <textarea
                rows={3}
                placeholder="What is this group about?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-bakwas-500 resize-none"
              />
            </div>

            <div className="pt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Back to members
              </button>

              <button
                type="submit"
                disabled={isSubmitting || !groupName.trim()}
                className="py-2.5 px-5 rounded-xl bg-bakwas-500 hover:bg-bakwas-600 text-slate-950 font-semibold text-xs shadow-lg shadow-bakwas-500/20"
              >
                {isSubmitting ? 'Creating...' : 'Create Group'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
