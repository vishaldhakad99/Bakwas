import axios from 'axios';

// When deployed on Vercel or any non-localhost domain, fallback to live Render backend
const isBrowser = typeof window !== 'undefined';
const isLocalhost = isBrowser && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const defaultApiUrl = isBrowser && !isLocalhost ? 'https://bakwas-fpfn.onrender.com/api' : '/api';

const API_BASE_URL = import.meta.env.VITE_API_URL || defaultApiUrl;

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to attach JWT Access Token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('bakwas_access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for automatic refresh token rotation
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (!originalRequest) return Promise.reject(error);

    // Automatic Fallback Retry: If request failed with 504, 502, 405, or ERR_NETWORK on relative path,
    // seamlessly retry directly against live Render cloud backend!
    const isNetworkOrGatewayErr =
      error.code === 'ERR_NETWORK' ||
      error.response?.status === 504 ||
      error.response?.status === 502 ||
      error.response?.status === 405;

    if (
      !originalRequest._hasFallbackRetried &&
      isNetworkOrGatewayErr &&
      (!originalRequest.baseURL || originalRequest.baseURL === '/api' || !originalRequest.baseURL.startsWith('https://bakwas-fpfn'))
    ) {
      originalRequest._hasFallbackRetried = true;
      originalRequest.baseURL = 'https://bakwas-fpfn.onrender.com/api';
      console.warn('[BAKWAS API] Network failover: retrying via direct cloud backend...');
      return api(originalRequest);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (originalRequest.url.includes('/auth/refresh-token') || originalRequest.url.includes('/auth/verify-otp')) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('bakwas_refresh_token');
      const deviceId = localStorage.getItem('bakwas_device_id');

      if (!refreshToken || !deviceId) {
        isRefreshing = false;
        localStorage.removeItem('bakwas_access_token');
        localStorage.removeItem('bakwas_refresh_token');
        localStorage.removeItem('bakwas_user');
        window.dispatchEvent(new Event('auth_logout'));
        return Promise.reject(error);
      }

      try {
        const response = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {
          refreshToken,
          deviceId
        });

        const { accessToken, refreshToken: newRefreshToken } = response.data.data;

        localStorage.setItem('bakwas_access_token', accessToken);
        localStorage.setItem('bakwas_refresh_token', newRefreshToken);

        api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;

        processQueue(null, accessToken);
        isRefreshing = false;

        return api(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        isRefreshing = false;

        localStorage.removeItem('bakwas_access_token');
        localStorage.removeItem('bakwas_refresh_token');
        localStorage.removeItem('bakwas_user');
        window.dispatchEvent(new Event('auth_logout'));

        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(error);
  }
);
