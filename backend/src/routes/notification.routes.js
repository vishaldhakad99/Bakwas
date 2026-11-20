import { Router } from 'express';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  getVapidPublicKey,
  subscribePush,
  unsubscribePush
} from '../controllers/notification.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/vapid-key', getVapidPublicKey);

router.use(verifyJWT);

router.get('/', getNotifications);
router.put('/:notificationId/read', markAsRead);
router.put('/read-all', markAllAsRead);
router.post('/subscribe', subscribePush);
router.post('/unsubscribe', unsubscribePush);

export default router;
