import webpush from 'web-push';
import { ENV } from './env.js';
import { logger } from '../utils/logger.js';

let isPushConfigured = false;

if (ENV.VAPID_PUBLIC_KEY && ENV.VAPID_PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(
      ENV.VAPID_SUBJECT,
      ENV.VAPID_PUBLIC_KEY,
      ENV.VAPID_PRIVATE_KEY
    );
    isPushConfigured = true;
    logger.info('WebPush VAPID configured successfully.');
  } catch (err) {
    logger.warn('Failed to configure WebPush VAPID:', err.message);
  }
} else {
  logger.info('WebPush VAPID keys not set. Push notifications will run in in-app/simulated mode until keys are provided.');
}

export { webpush, isPushConfigured };
