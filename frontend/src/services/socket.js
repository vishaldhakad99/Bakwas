import { io } from 'socket.io-client';

let socket = null;

export const getSocket = () => socket;

export const initSocket = (token, deviceId) => {
  if (socket) {
    socket.disconnect();
  }

  const isBrowser = typeof window !== 'undefined';
  const isLocalhost = isBrowser && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const isRenderHost = isBrowser && window.location.hostname.includes('onrender.com');

  // If already on Render or Localhost, use same origin for lowest latency
  const defaultSocketUrl = isBrowser && !isLocalhost && !isRenderHost
    ? 'https://bakwas-fpfn.onrender.com'
    : window.location.origin;

  const socketUrl = isRenderHost ? window.location.origin : (import.meta.env.VITE_SOCKET_URL || defaultSocketUrl);

  socket = io(socketUrl, {
    auth: {
      token,
      deviceId
    },
    transports: ['polling', 'websocket'],
    upgrade: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 500,
    reconnectionDelayMax: 3000,
    timeout: 10000
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
