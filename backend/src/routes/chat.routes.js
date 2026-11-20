import { Router } from 'express';
import {
  getConversations,
  getOrCreateConversation,
  getMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  reactToMessage,
  toggleStarMessage,
  togglePinConversation,
  toggleArchiveConversation,
  clearChatHistory,
  searchMessages
} from '../controllers/chat.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { messageLimiter } from '../middlewares/rateLimiter.middleware.js';
import { validate } from '../middlewares/validation.middleware.js';
import { sendMessageSchema, messageActionSchema } from '../utils/validators.js';

const router = Router();

router.use(verifyJWT);

router.get('/conversations', getConversations);
router.post('/conversations', getOrCreateConversation);
router.get('/conversations/:conversationId/messages', getMessages);
router.post('/messages', messageLimiter, validate(sendMessageSchema), sendMessage);
router.put('/messages/:messageId', validate(messageActionSchema), editMessage);
router.delete('/messages/:messageId', deleteMessage);
router.post('/messages/:messageId/reaction', validate(messageActionSchema), reactToMessage);
router.post('/messages/:messageId/star', toggleStarMessage);
router.post('/conversations/:conversationId/pin', togglePinConversation);
router.post('/conversations/:conversationId/archive', toggleArchiveConversation);
router.post('/conversations/:conversationId/clear', clearChatHistory);
router.get('/messages/search', searchMessages);

export default router;
