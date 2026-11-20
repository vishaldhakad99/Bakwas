import React, { useState, useEffect } from 'react';
import {
  X,
  Search,
  UserPlus,
  MessageSquare,
  Share2,
  Trash2,
  Phone,
  CheckCircle,
  ExternalLink,
  RotateCw
} from 'lucide-react';
import { api } from '../../services/api';
import { useChatStore } from '../../store/useChatStore';
import { Avatar } from '../common/Avatar';

export const ContactsModal = ({ isOpen, onClose, onOpenSaveContact }) => {
  const [contacts, setContacts] = useState([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { setActiveConversation, fetchConversations, onlineUserIds } = useChatStore();

  const fetchContacts = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await api.get('/contacts');
      setContacts(res.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load contacts');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchContacts();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredContacts = contacts.filter((c) => {
    const q = search.toLowerCase();
    return (
      (c.customName || '').toLowerCase().includes(q) ||
      (c.phoneNumber || '').toLowerCase().includes(q) ||
      (c.contactUser?.fullName || '').toLowerCase().includes(q)
    );
  });

  const handleStartChat = async (contact) => {
    if (!contact.contactUser?._id) return;
    try {
      const res = await api.post('/chat/conversations', {
        recipientId: contact.contactUser._id
      });
      await fetchConversations();
      setActiveConversation(res.data.data);
      onClose();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to start conversation');
    }
  };

  const handleDeleteContact = async (contactId, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this saved contact?')) return;
    try {
      await api.delete(`/contacts/${contactId}`);
      setContacts((prev) => prev.filter((c) => c._id !== contactId));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete contact');
    }
  };

  const handleShareInvite = (contact, e) => {
    e.stopPropagation();
    const text = `Hey ${contact.customName}, let's chat on BAKWAS: ${window.location.origin}`;
    if (navigator.share) {
      navigator.share({ title: 'BAKWAS Chat', text, url: window.location.origin }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      alert(`Invite link for ${contact.customName} copied to clipboard!`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-lg bg-bakwas-panel border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-bakwas-500/20 text-bakwas-400 flex items-center justify-center">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Saved Contacts</h3>
              <p className="text-xs text-slate-400">{contacts.length} saved contact{contacts.length === 1 ? '' : 's'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                if (onOpenSaveContact) onOpenSaveContact();
              }}
              className="px-3 py-1.5 bg-bakwas-500 hover:bg-bakwas-600 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-bakwas-500/20 transition-transform active:scale-95"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Save Number</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-full hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="my-3 relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Search saved contacts by name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-bakwas-500"
          />
        </div>

        {/* Contact list */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/40 pr-1">
          {isLoading && (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-xs text-slate-500">
              <RotateCw className="w-5 h-5 animate-spin text-bakwas-400" />
              <span>Loading saved contacts...</span>
            </div>
          )}

          {!isLoading && filteredContacts.length === 0 && (
            <div className="py-12 text-center text-slate-500 space-y-3">
              <p className="text-xs">No contacts found</p>
              <button
                onClick={() => {
                  onClose();
                  if (onOpenSaveContact) onOpenSaveContact();
                }}
                className="text-xs text-bakwas-400 hover:underline font-semibold inline-flex items-center gap-1"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Save your first contact now</span>
              </button>
            </div>
          )}

          {!isLoading &&
            filteredContacts.map((c) => {
              const isRegistered = c.isRegistered && c.contactUser;
              const isOnline = isRegistered && onlineUserIds.has(c.contactUser._id);

              return (
                <div
                  key={c._id}
                  onClick={() => isRegistered && handleStartChat(c)}
                  className={`py-3 px-2 flex items-center justify-between rounded-xl transition-colors ${
                    isRegistered ? 'hover:bg-slate-800/50 cursor-pointer' : 'hover:bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative">
                      <Avatar
                        src={c.contactUser?.avatar?.url}
                        name={c.customName}
                        size="md"
                      />
                      {isRegistered && isOnline && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-white truncate">{c.customName}</h4>
                        {isRegistered ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-medium">
                            BAKWAS
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400 border border-slate-700 font-medium">
                            Not registered
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 truncate">{c.phoneNumber}</p>
                      {c.notes && (
                        <p className="text-[11px] text-slate-500 truncate italic">{c.notes}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {isRegistered ? (
                      <button
                        onClick={() => handleStartChat(c)}
                        title="Start Chat"
                        className="p-2 text-bakwas-400 hover:bg-bakwas-500/20 rounded-full transition-colors"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={(e) => handleShareInvite(c, e)}
                        title="Share Invite Link"
                        className="p-2 text-cyan-400 hover:bg-cyan-500/20 rounded-full transition-colors flex items-center gap-1 text-xs"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline text-[11px]">Invite</span>
                      </button>
                    )}

                    <button
                      onClick={(e) => handleDeleteContact(c._id, e)}
                      title="Delete Contact"
                      className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-full transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
};
