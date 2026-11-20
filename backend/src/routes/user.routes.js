import { Router } from 'express';
import {
  getMe,
  updateProfile,
  updateAvatar,
  removeAvatar,
  updatePrivacySettings,
  getSessions,
  revokeSessionById,
  searchUsers
} from '../controllers/user.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { upload } from '../middlewares/upload.middleware.js';
import { validate } from '../middlewares/validation.middleware.js';
import { updateProfileSchema, updatePrivacySchema } from '../utils/validators.js';

const router = Router();

router.use(verifyJWT);

router.get('/me', getMe);
router.put('/profile', validate(updateProfileSchema), updateProfile);
router.post('/avatar', upload.single('avatar'), updateAvatar);
router.delete('/avatar', removeAvatar);
router.put('/privacy', validate(updatePrivacySchema), updatePrivacySettings);
router.get('/sessions', getSessions);
router.delete('/sessions/:deviceId', revokeSessionById);
router.get('/search', searchUsers);

export default router;
