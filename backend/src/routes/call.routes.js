import { Router } from 'express';
import {
  getCallHistory,
  initiateCall,
  updateCallStatus
} from '../controllers/call.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(verifyJWT);

router.get('/history', getCallHistory);
router.post('/initiate', initiateCall);
router.put('/:callId/status', updateCallStatus);

export default router;
