import { io } from 'socket.io-client';

let socket = null;

export const getSocket = () => socket;

export const initSocket = (token, deviceId) => {
  if (socket) {
    socket.disconnect();
  }

  const socketUrl = import.meta.env.VITE_SOCKET_URL || window.location.origin;

  socket = io(socketUrl, {
    auth: {
      token,
      deviceId
    },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000
  });

  socket.on('connect', () => {
    console.log('[BAKWAS Real-Time] Socket connected:', socket.id);
  });

  socket.on('connect_error', (error) => {
    console.warn('[BAKWAS Real-Time] Connection error:', error.message);
  });

  socket.on('disconnect', (reason) => {
    console.log('[BAKWAS Real-Time] Socket disconnected:', reason);
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
