import { Router } from 'express';
import {
  createGroup,
  addGroupMembers,
  removeGroupMember,
  updateGroup,
  updateGroupAvatar,
  getGroupMembers
} from '../controllers/group.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { upload } from '../middlewares/upload.middleware.js';
import { validate } from '../middlewares/validation.middleware.js';
import { createGroupSchema } from '../utils/validators.js';

const router = Router();

router.use(verifyJWT);

router.post('/', validate(createGroupSchema), createGroup);
router.get('/:groupId/members', getGroupMembers);
router.post('/:groupId/members', addGroupMembers);
router.delete('/:groupId/members/:memberId', removeGroupMember);
router.put('/:groupId', updateGroup);
router.post('/:groupId/avatar', upload.single('avatar'), updateGroupAvatar);

export default router;
