import { Router } from 'express';
import { uploadMedia, getIceServersConfig } from '../controllers/media.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { upload } from '../middlewares/upload.middleware.js';

const router = Router();

router.use(verifyJWT);

router.post('/upload', upload.single('file'), uploadMedia);
router.get('/ice-servers', getIceServersConfig);

export default router;
