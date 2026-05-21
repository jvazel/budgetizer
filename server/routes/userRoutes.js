import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  updateProfile,
  updatePassword,
  updatePreferences,
  deleteMyAccount,
  clearMyData
} from '../controllers/userController.js';

const router = express.Router();

router.use(protect);

router.put('/profile', updateProfile);
router.put('/password', updatePassword);
router.put('/preferences', updatePreferences);
router.delete('/me', deleteMyAccount);
router.delete('/clear', clearMyData);

export default router;
