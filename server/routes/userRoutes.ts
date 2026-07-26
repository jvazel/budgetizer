import express from 'express';
import { protect } from '../middleware/authMiddleware';
import idempotencyMiddleware from '../middleware/idempotencyMiddleware';
import validateRequest from '../middleware/validateRequest';
import { z } from 'zod';
import {
  updateProfile,
  updatePassword,
  updatePreferences,
  deleteMyAccount,
  clearMyData
} from '../controllers/userController';

const router = express.Router();

router.use(protect);

router.use((req, res, next) => {
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
    return idempotencyMiddleware(req, res, next);
  }
  next();
});

router.put(
  '/profile',
  validateRequest(z.object({ name: z.string().optional(), email: z.string().email().optional() })),
  updateProfile
);

router.put(
  '/password',
  validateRequest(z.object({ newPassword: z.string().min(6).regex(/[A-Z]/).regex(/[a-z]/).regex(/[0-9]/), oldPassword: z.string().min(1) })),
  updatePassword
);

router.put('/preferences', updatePreferences);
router.delete('/me', deleteMyAccount);
router.delete('/clear', clearMyData);

export default router;
