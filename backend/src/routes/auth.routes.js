import { Router } from 'express';
import {
  requestOTP,
  verifyAndAuthenticate,
  refreshAccessToken,
  logout,
  logoutAllDevices,
  changePhoneNumber,
  deleteAccount
} from '../controllers/auth.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { authLimiter, otpLimiter } from '../middlewares/rateLimiter.middleware.js';
import { validate } from '../middlewares/validation.middleware.js';
import {
  requestOtpSchema,
  verifyOtpSchema,
  refreshTokenSchema,
  changePhoneSchema
} from '../utils/validators.js';

const router = Router();

router.post('/request-otp', otpLimiter, validate(requestOtpSchema), requestOTP);
router.post('/verify-otp', authLimiter, validate(verifyOtpSchema), verifyAndAuthenticate);
router.post('/refresh-token', validate(refreshTokenSchema), refreshAccessToken);
router.post('/logout', verifyJWT, logout);
router.post('/logout-all', verifyJWT, logoutAllDevices);
router.post('/change-phone', verifyJWT, validate(changePhoneSchema), changePhoneNumber);
router.delete('/delete-account', verifyJWT, deleteAccount);

export default router;
