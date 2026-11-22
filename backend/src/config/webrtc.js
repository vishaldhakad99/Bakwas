import { ENV } from './env.js';
import { logger } from '../utils/logger.js';

let cachedIceServers = null;
let cacheExpiry = 0;

export const getIceServers = async () => {
  const defaultStun = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' }
  ];

  if (ENV.TURN_URL) {
    defaultStun.push({
      urls: ENV.TURN_URL,
      username: ENV.TURN_USERNAME,
      credential: ENV.TURN_CREDENTIAL
    });
  }

  // If Twilio Account SID and Auth Token are provided, obtain ephemeral TURN credentials for global NAT traversal
  if (ENV.TWILIO_ACCOUNT_SID && ENV.TWILIO_AUTH_TOKEN) {
    const now = Date.now();
    if (cachedIceServers && now < cacheExpiry) {
      return cachedIceServers;
    }

    try {
      const auth = Buffer.from(`${ENV.TWILIO_ACCOUNT_SID}:${ENV.TWILIO_AUTH_TOKEN}`).toString('base64');
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${ENV.TWILIO_ACCOUNT_SID}/Tokens.json`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${auth}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.ice_servers && Array.isArray(data.ice_servers)) {
          const twilioServers = data.ice_servers.map((s) => ({
            urls: s.urls || s.url,
            ...(s.username ? { username: s.username } : {}),
            ...(s.credential ? { credential: s.credential } : {})
          }));
          cachedIceServers = [...defaultStun, ...twilioServers];
          cacheExpiry = now + (data.ttl ? Math.max(300, data.ttl - 300) * 1000 : 3600 * 1000);
          logger.info('Twilio Network Traversal Service TURN servers fetched successfully');
          return cachedIceServers;
        }
      } else {
        logger.warn(`Twilio NTS returned HTTP ${response.status}`);
      }
    } catch (err) {
      logger.warn('Failed to fetch Twilio TURN credentials:', err.message);
    }
  }

  return defaultStun;
};
