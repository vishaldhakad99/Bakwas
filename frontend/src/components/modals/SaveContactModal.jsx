import React, { useState } from 'react';
import { X, UserPlus, Phone, User, FileText, CheckCircle2, MessageSquare, Share2, RotateCw } from 'lucide-react';
import { api } from '../../services/api';
import { useChatStore } from '../../store/useChatStore';
import { Avatar } from '../common/Avatar';

const COUNTRY_CODES = [
  { code: '+91', country: 'India', flag: '🇮🇳' },
  { code: '+1', country: 'USA / Canada', flag: '🇺🇸' },
  { code: '+44', country: 'United Kingdom', flag: '🇬🇧' },
  { code: '+971', country: 'UAE', flag: '🇦🇪' },
  { code: '+65', country: 'Singapore', flag: '🇸🇬' },
  { code: '+61', country: 'Australia', flag: '🇦🇺' },
  { code: '+49', country: 'Germany', flag: '🇩🇪' },
  { code: '+33', country: 'France', flag: '🇫🇷' },
  { code: '+81', country: 'Japan', flag: '🇯🇵' }
];

export const SaveContactModal = ({ isOpen, onClose, onContactSaved }) => {
  const [customName, setCustomName] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [savedContact, setSavedContact] = useState(null);

  const { setActiveConversation, fetchConversations } = useChatStore();

  if (!isOpen) return null;

  const handleReset = () => {
    setCustomName('');
    setPhoneNumber('');
    setNotes('');
    setError('');
    setSavedContact(null);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleSaveContact = async (e) => {
    if (e) e.preventDefault();
    setError('');

    const cleanName = customName.trim();
    const cleanNumber = phoneNumber.replace(/\D/g, '').replace(/^0+/, '');

    if (!cleanName) {
      setError('Please enter a name for this contact');
      return;
    }

    if (cleanNumber.length < 6 || cleanNumber.length > 15) {
      setError('Please enter a valid mobile number (6 to 15 digits)');
      return;
    }

    setIsLoading(true);
    try {
      const fullPhone = `${countryCode}${cleanNumber}`;
      const res = await api.post('/contacts', {
        customName: cleanName,
        countryCode,
        phoneNumber: fullPhone,
        notes: notes.trim()
      });

      const savedData = res.data.data;
      setSavedContact(savedData);
      if (onContactSaved) onContactSaved(savedData);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to save contact';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartChatWithContact = async () => {
    if (!savedContact?.contactUser?._id) return;
    try {
      const res = await api.post('/chat/conversations', {
        recipientId: savedContact.contactUser._id
      });
      await fetchConversations();
      setActiveConversation(res.data.data);
      handleClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to initiate conversation');
    }
  };

  const handleShareInvite = () => {
    const inviteText = `Hey ${customName}, connect with me on BAKWAS - the ultra-fast real-time messaging app: ${window.location.origin}`;
    if (navigator.share) {
      navigator.share({
        title: 'Join BAKWAS',
        text: inviteText,
        url: window.location.origin
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(inviteText);
      alert('Invite link copied to clipboard!');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-md bg-bakwas-panel border border-slate-800 rounded-3xl p-6 shadow-2xl relative">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-bakwas-500/20 text-bakwas-400 flex items-center justify-center">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Save Contact</h3>
              <p className="text-xs text-slate-400">Save any mobile number to your address book</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-full hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400">
            {error}
          </div>
        )}

        {/* Success State */}
        {savedContact ? (
          <div className="py-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h4 className="text-base font-bold text-white">{savedContact.customName}</h4>
              <p className="text-xs text-slate-400">{savedContact.phoneNumber}</p>
            </div>

            {savedContact.isRegistered && savedContact.contactUser ? (
              <div className="p-4 bg-bakwas-500/10 border border-bakwas-500/30 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar
                    src={savedContact.contactUser.avatar?.url}
                    name={savedContact.contactUser.fullName}
                    size="md"
                  />
                  <div className="text-left">
                    <p className="text-xs font-semibold text-white">Already on BAKWAS</p>
                    <p className="text-[11px] text-emerald-400">Available to chat and call</p>
                  </div>
                </div>
                <button
                  onClick={handleStartChatWithContact}
                  className="px-3.5 py-2 bg-bakwas-500 hover:bg-bakwas-600 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-bakwas-500/20 transition-transform active:scale-95"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Chat Now</span>
                </button>
              </div>
            ) : (
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl text-left space-y-2">
                <p className="text-xs font-semibold text-slate-300">Contact Saved to Address Book</p>
                <p className="text-xs text-slate-500 leading-relaxed">
                  This contact has not registered on BAKWAS yet. You can invite them or wait until they sign up — they'll automatically appear in your chat list when they join!
                </p>
                <button
                  onClick={handleShareInvite}
                  className="mt-2 w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-white font-medium flex items-center justify-center gap-2 transition-colors"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share Invite Link</span>
                </button>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleReset}
                className="flex-1 py-2.5 rounded-xl border border-slate-700 text-xs font-semibold text-slate-300 hover:bg-slate-800"
              >
                Save Another Number
              </button>
              <button
                onClick={handleClose}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* Form State */
          <form onSubmit={handleSaveContact} className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Contact Name <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  type="text"
                  placeholder="e.g. Papa, Rohit Sharma, Pooja"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  autoFocus
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-bakwas-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Mobile Number <span className="text-red-400">*</span>
              </label>
              <div className="flex gap-2">
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2.5 text-xs text-white focus:outline-none focus:border-bakwas-500"
                >
                  {COUNTRY_CODES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.code}
                    </option>
                  ))}
                </select>
                <div className="relative flex-1">
                  <Phone className="w-4 h-4 text-slate-500 absolute right-3.5 top-3 pointer-events-none" />
                  <input
                    type="tel"
                    placeholder="10-digit mobile number"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-bakwas-500"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Notes (Optional)
              </label>
              <div className="relative">
                <FileText className="w-4 h-4 text-slate-500 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  type="text"
                  placeholder="e.g. College friend, Office"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-bakwas-500"
                />
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 py-3 rounded-xl border border-slate-700 text-xs font-semibold text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || !customName.trim() || !phoneNumber.trim()}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-bakwas-500 to-teal-500 hover:from-bakwas-600 hover:to-teal-600 text-slate-950 font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-bakwas-500/25 disabled:opacity-50"
              >
                {isLoading ? (
                  <RotateCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Save Contact</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
