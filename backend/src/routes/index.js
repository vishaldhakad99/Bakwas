import { Router } from 'express';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import chatRoutes from './chat.routes.js';
import groupRoutes from './group.routes.js';
import contactRoutes from './contact.routes.js';
import callRoutes from './call.routes.js';
import notificationRoutes from './notification.routes.js';
import mediaRoutes from './media.routes.js';
import { getE2EEStatus } from '../services/encryption.service.js';

const router = Router();

// Health Check Endpoint for Cloud Hosting (Render, Railway, Kubernetes)
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'BAKWAS Messaging Backend',
    uptime: process.uptime(),
    encryption: getE2EEStatus()
  });
});

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/chat', chatRoutes);
router.use('/groups', groupRoutes);
router.use('/contacts', contactRoutes);
router.use('/calls', callRoutes);
router.use('/notifications', notificationRoutes);
router.use('/media', mediaRoutes);

export default router;
