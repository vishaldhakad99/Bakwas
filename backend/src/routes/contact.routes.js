import { Router } from 'express';
import {
  getContacts,
  addContact,
  blockContact,
  unblockContact,
  getBlockedContacts,
  reportUser
} from '../controllers/contact.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(verifyJWT);

router.get('/', getContacts);
router.post('/', addContact);
router.post('/block', blockContact);
router.post('/unblock', unblockContact);
router.get('/blocked', getBlockedContacts);
router.post('/report', reportUser);

export default router;
