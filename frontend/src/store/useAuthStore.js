import { create } from 'zustand';
import { api } from '../services/api';
import { initSocket, disconnectSocket } from '../services/socket';

const getInitialDeviceId = () => {
  let id = localStorage.getItem('bakwas_device_id');
  if (!id) {
    id = 'dev_' + Math.random().toString(36).substring(2, 12) + '_' + Date.now();
    localStorage.setItem('bakwas_device_id', id);
  }
  return id;
};

export const useAuthStore = create((set, get) => ({
  user: JSON.parse(localStorage.getItem('bakwas_user') || 'null'),
  accessToken: localStorage.getItem('bakwas_access_token') || null,
  refreshToken: localStorage.getItem('bakwas_refresh_token') || null,
  deviceId: getInitialDeviceId(),
  isAuthenticated: !!localStorage.getItem('bakwas_access_token'),
  isLoading: false,
  error: null,

  setAuthData: (user, accessToken, refreshToken) => {
    localStorage.setItem('bakwas_user', JSON.stringify(user));
    localStorage.setItem('bakwas_access_token', accessToken);
    localStorage.setItem('bakwas_refresh_token', refreshToken);

    const deviceId = get().deviceId;
    initSocket(accessToken, deviceId);

    set({
      user,
      accessToken,
      refreshToken,
      isAuthenticated: true,
      error: null
    });
  },

  setUser: (updatedUser) => {
    localStorage.setItem('bakwas_user', JSON.stringify(updatedUser));
    set({ user: updatedUser });
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem('bakwas_user');
      localStorage.removeItem('bakwas_access_token');
      localStorage.removeItem('bakwas_refresh_token');
      disconnectSocket();

      set({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false
      });
    }
  },

  deleteAccount: async () => {
    await api.delete('/auth/delete-account');
    get().logout();
  }
}));
