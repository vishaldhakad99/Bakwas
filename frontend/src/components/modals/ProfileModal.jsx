import React, { useState } from 'react';
import { X, Camera, Check, ShieldCheck, Trash2 } from 'lucide-react';
import { Avatar } from '../common/Avatar';
import { useAuthStore } from '../../store/useAuthStore';
import { api } from '../../services/api';

export const ProfileModal = ({ isOpen, onClose }) => {
  const { user, setUser } = useAuthStore();
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [username, setUsername] = useState(user?.username || '');
  const [about, setAbout] = useState(user?.about || '');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  if (!isOpen || !user) return null;

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const res = await api.post('/users/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setUser({ ...user, avatar: res.data.data });
      setMessage('Profile picture updated!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update avatar');
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      await api.delete('/users/avatar');
      setUser({ ...user, avatar: { url: '', publicId: '' } });
      setMessage('Profile picture removed');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await api.put('/users/profile', {
        fullName: fullName.trim(),
        username: username.trim() || undefined,
        about: about.trim()
      });
      setUser(res.data.data);
      setMessage('Profile updated successfully!');
      setTimeout(() => {
        setMessage('');
        onClose();
      }, 1000);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-md bg-bakwas-panel border border-slate-800 rounded-3xl p-6 shadow-2xl relative">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <h3 className="text-base font-bold text-white">Profile Details</h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {message && (
          <div className="my-3 p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs text-center">
            {message}
          </div>
        )}

        <form onSubmit={handleSaveProfile} className="space-y-4 pt-4">
          {/* Avatar with upload overlay */}
          <div className="flex flex-col items-center justify-center mb-2">
            <div className="relative group cursor-pointer">
              <Avatar src={user.avatar?.url} name={user.fullName} size="xl" />
              <label className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white cursor-pointer">
                <Camera className="w-6 h-6 mb-1" />
                <span className="text-[10px]">Change</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </label>
            </div>

            {user.avatar?.url && (
              <button
                type="button"
                onClick={handleRemoveAvatar}
                className="mt-2 text-xs text-rose-400 hover:underline flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                <span>Remove photo</span>
              </button>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-bakwas-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-bakwas-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">About</label>
            <input
              type="text"
              maxLength={140}
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-bakwas-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Phone Number</label>
            <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-400">
              <span>{user.formattedPhone}</span>
              <span className="flex items-center gap-1 text-emerald-400 text-[11px] font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" />
                Verified
              </span>
            </div>
          </div>

          <div className="pt-3">
            <button
              type="submit"
              disabled={isSaving}
              className="w-full py-3 rounded-xl bg-bakwas-500 hover:bg-bakwas-600 text-slate-950 font-semibold text-xs shadow-lg shadow-bakwas-500/20"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
