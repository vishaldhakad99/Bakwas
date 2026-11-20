import React, { useState, useEffect } from 'react';
import {
  X,
  Moon,
  Sun,
  Laptop,
  Shield,
  Eye,
  Smartphone,
  UserX,
  LogOut,
  Trash2,
  Check
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useThemeStore } from '../../store/useThemeStore';
import { api } from '../../services/api';

export const SettingsModal = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('privacy'); // 'privacy' | 'theme' | 'devices' | 'blocked' | 'account'
  const [sessions, setSessions] = useState([]);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const { user, setUser, logout, deleteAccount } = useAuthStore();
  const { theme, setTheme } = useThemeStore();

  const [privacy, setPrivacy] = useState({
    lastSeen: user?.privacySettings?.lastSeen || 'everyone',
    online: user?.privacySettings?.online || 'everyone',
    avatar: user?.privacySettings?.avatar || 'everyone',
    about: user?.privacySettings?.about || 'everyone',
    readReceipts: user?.privacySettings?.readReceipts ?? true
  });

  useEffect(() => {
    if (isOpen) {
      if (activeTab === 'devices') fetchSessions();
      if (activeTab === 'blocked') fetchBlocked();
    }
  }, [isOpen, activeTab]);

  const fetchSessions = async () => {
    try {
      const res = await api.get('/users/sessions');
      setSessions(res.data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchBlocked = async () => {
    try {
      const res = await api.get('/contacts/blocked');
      setBlockedUsers(res.data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdatePrivacy = async (key, val) => {
    const updated = { ...privacy, [key]: val };
    setPrivacy(updated);
    try {
      const res = await api.put('/users/privacy', { [key]: val });
      setUser({ ...user, privacySettings: res.data.data });
    } catch (err) {
      alert('Failed to update privacy setting');
    }
  };

  const handleRevokeSession = async (deviceId) => {
    try {
      await api.delete(`/users/sessions/${deviceId}`);
      setSessions(sessions.filter((s) => s.deviceId !== deviceId));
    } catch (err) {
      alert('Failed to revoke session');
    }
  };

  const handleUnblock = async (blockedUserId) => {
    try {
      await api.post('/contacts/unblock', { targetUserId: blockedUserId });
      setBlockedUsers(blockedUsers.filter((b) => b.blockedUserId?._id !== blockedUserId));
    } catch (err) {
      console.error(err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-xl bg-bakwas-panel border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-bakwas-400" />
            <span>Settings & Privacy</span>
          </h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 py-3 border-b border-slate-800/80 overflow-x-auto text-xs font-medium">
          {[
            { id: 'privacy', label: 'Privacy', icon: Eye },
            { id: 'theme', label: 'Theme', icon: Moon },
            { id: 'devices', label: 'Devices', icon: Smartphone },
            { id: 'blocked', label: 'Blocked', icon: UserX },
            { id: 'account', label: 'Account', icon: LogOut }
          ].map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                  activeTab === t.id
                    ? 'bg-bakwas-500/20 text-bakwas-400 border border-bakwas-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {/* Privacy Settings */}
          {activeTab === 'privacy' && (
            <div className="space-y-4 text-xs">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
                <div>
                  <label className="block font-semibold text-slate-200 mb-1">Last Seen & Online</label>
                  <p className="text-[11px] text-slate-400 mb-2">Who can see when you were last online</p>
                  <select
                    value={privacy.lastSeen}
                    onChange={(e) => handleUpdatePrivacy('lastSeen', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="everyone">Everyone</option>
                    <option value="contacts">My Contacts</option>
                    <option value="nobody">Nobody</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-200 mb-1">Profile Photo</label>
                  <p className="text-[11px] text-slate-400 mb-2">Who can view your profile picture</p>
                  <select
                    value={privacy.avatar}
                    onChange={(e) => handleUpdatePrivacy('avatar', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="everyone">Everyone</option>
                    <option value="contacts">My Contacts</option>
                    <option value="nobody">Nobody</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-200 mb-1">About Info</label>
                  <p className="text-[11px] text-slate-400 mb-2">Who can read your about text</p>
                  <select
                    value={privacy.about}
                    onChange={(e) => handleUpdatePrivacy('about', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="everyone">Everyone</option>
                    <option value="contacts">My Contacts</option>
                    <option value="nobody">Nobody</option>
                  </select>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                  <div>
                    <h5 className="font-semibold text-slate-200">Read Receipts</h5>
                    <p className="text-[11px] text-slate-400">Show blue checkmarks when you have read messages</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={privacy.readReceipts}
                    onChange={(e) => handleUpdatePrivacy('readReceipts', e.target.checked)}
                    className="w-5 h-5 accent-bakwas-500 rounded"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Theme Settings */}
          {activeTab === 'theme' && (
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'dark', label: 'Dark Mode', icon: Moon },
                { id: 'light', label: 'Light Mode', icon: Sun },
                { id: 'system', label: 'System Default', icon: Laptop }
              ].map((t) => {
                const Icon = t.icon;
                const isSelected = theme === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTheme(t.id)}
                    className={`p-4 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all ${
                      isSelected
                        ? 'bg-bakwas-500/20 border-bakwas-500 text-bakwas-400 shadow-lg'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Icon className="w-6 h-6" />
                    <span className="text-xs font-semibold">{t.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Devices / Sessions */}
          {activeTab === 'devices' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400">All browser and mobile sessions logged in to your account.</p>
              {sessions.map((s) => (
                <div
                  key={s._id}
                  className="p-3 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <h5 className="font-semibold text-white">{s.deviceName}</h5>
                      {s.isCurrent && (
                        <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                          Current Device
                        </span>
                      )}
                    </div>
                    <p className="text-slate-400 text-[11px] mt-0.5">
                      {s.browser} on {s.os} • IP: {s.ip || 'Local'}
                    </p>
                  </div>
                  {!s.isCurrent && (
                    <button
                      onClick={() => handleRevokeSession(s.deviceId)}
                      className="px-2.5 py-1 text-xs text-rose-400 hover:bg-rose-500/10 rounded-lg"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Blocked Contacts */}
          {activeTab === 'blocked' && (
            <div className="space-y-3">
              {blockedUsers.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">No blocked contacts</div>
              ) : (
                blockedUsers.map((b) => (
                  <div
                    key={b._id}
                    className="p-3 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between text-xs"
                  >
                    <div>
                      <h5 className="font-semibold text-white">{b.blockedUserId?.fullName || 'User'}</h5>
                      <p className="text-slate-400 text-[11px]">{b.blockedUserId?.formattedPhone}</p>
                    </div>
                    <button
                      onClick={() => handleUnblock(b.blockedUserId?._id)}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl"
                    >
                      Unblock
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Account Actions */}
          {activeTab === 'account' && (
            <div className="space-y-3 pt-2">
              <button
                onClick={() => { logout(); onClose(); }}
                className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <LogOut className="w-4 h-4 text-amber-400" />
                <span>Log Out of This Device</span>
              </button>

              <button
                onClick={async () => {
                  if (window.confirm('Log out from ALL devices?')) {
                    await api.post('/auth/logout-all');
                    logout();
                    onClose();
                  }
                }}
                className="w-full py-3 px-4 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <Smartphone className="w-4 h-4 text-cyan-400" />
                <span>Log Out from All Devices</span>
              </button>

              <div className="pt-4 border-t border-slate-800">
                <button
                  onClick={async () => {
                    if (window.confirm('CAUTION: Are you sure you want to PERMANENTLY delete your BAKWAS account? This action cannot be undone.')) {
                      await deleteAccount();
                      onClose();
                    }
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-rose-600/10 border border-rose-600/30 hover:bg-rose-600/20 text-rose-400 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete My Account</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
