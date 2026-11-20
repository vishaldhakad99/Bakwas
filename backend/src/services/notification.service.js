import { webpush, isPushConfigured } from '../config/webpush.js';
import { PushSubscription } from '../models/PushSubscription.js';
import { Notification } from '../models/Notification.js';
import { logger } from '../utils/logger.js';

export const sendPushToUser = async (userId, payload) => {
  try {
    // 1. Save in-app notification in MongoDB
    await Notification.create({
      userId,
      type: payload.type || 'message',
      title: payload.title,
      body: payload.body,
      data: payload.data || {}
    });

    // 2. Dispatch Web Push if configured
    if (!isPushConfigured) {
      return;
    }

    const subscriptions = await PushSubscription.find({ userId });
    if (!subscriptions || subscriptions.length === 0) return;

    const notificationPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      data: payload.data || {}
    });

    const sendPromises = subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.keys.p256dh,
              auth: sub.keys.auth
            }
          },
          notificationPayload
        );
      } catch (err) {
        // If subscription is 404 or 410, delete obsolete subscription
        if (err.statusCode === 404 || err.statusCode === 410) {
          logger.info(`Pruning expired push subscription: ${sub._id}`);
          await PushSubscription.deleteOne({ _id: sub._id });
        } else {
          logger.warn(`Push dispatch failed for endpoint: ${sub.endpoint}`, err.message);
        }
      }
    });

    await Promise.allSettled(sendPromises);
  } catch (error) {
    logger.error('Failed to dispatch notification:', error.message);
  }
};
