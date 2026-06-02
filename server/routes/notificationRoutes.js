import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  getVapidPublicKey,
  subscribe,
  unsubscribe,
  sendTestNotification
} from '../controllers/notificationController.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

router.get('/vapid-key', getVapidPublicKey);
router.post('/subscribe', subscribe);
router.post('/unsubscribe', unsubscribe);
router.post('/test', sendTestNotification);

export default router;
