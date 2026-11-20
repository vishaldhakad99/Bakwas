import { Notification } from '../models/Notification.js';
import { PushSubscription } from '../models/PushSubscription.js';
import { ENV } from '../config/env.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';

export const getNotifications = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const notifications = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .limit(50);

    return res.status(200).json(new ApiResponse(200, notifications));
  } catch (error) {
    next(error);
  }
};

export const markAsRead = async (req, res, next) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user._id;

    await Notification.updateOne({ _id: notificationId, userId }, { isRead: true });

    return res.status(200).json(new ApiResponse(200, null, 'Notification marked as read'));
  } catch (error) {
    next(error);
  }
};

export const markAllAsRead = async (req, res, next) => {
  try {
    const userId = req.user._id;

    await Notification.updateMany({ userId, isRead: false }, { isRead: true });

    return res.status(200).json(new ApiResponse(200, null, 'All notifications marked as read'));
  } catch (error) {
    next(error);
  }
};

export const getVapidPublicKey = async (req, res, next) => {
  try {
    return res.status(200).json(
      new ApiResponse(200, { publicKey: ENV.VAPID_PUBLIC_KEY || '' })
    );
  } catch (error) {
    next(error);
  }
};

export const subscribePush = async (req, res, next) => {
  try {
    const { subscription } = req.body;
    const userId = req.user._id;

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      throw new ApiError(400, 'Invalid push subscription payload');
    }

    await PushSubscription.findOneAndUpdate(
      { endpoint: subscription.endpoint },
      {
        userId,
        deviceId: req.deviceId || '',
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        userAgent: req.headers['user-agent'] || ''
      },
      { upsert: true, new: true }
    );

    return res.status(200).json(new ApiResponse(200, null, 'Push subscription registered successfully'));
  } catch (error) {
    next(error);
  }
};

export const unsubscribePush = async (req, res, next) => {
  try {
    const { endpoint } = req.body;
    if (endpoint) {
      await PushSubscription.deleteOne({ endpoint });
    }
    return res.status(200).json(new ApiResponse(200, null, 'Unsubscribed from push notifications'));
  } catch (error) {
    next(error);
  }
};
