import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import idempotencyMiddleware from '../middleware/idempotencyMiddleware.js';
import {
  getVapidPublicKey,
  subscribe,
  unsubscribe,
  sendTestNotification
} from '../controllers/notificationController.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Appliquer l'idempotence sur POST / PUT / DELETE pour éviter les doublons lors du sync hors-ligne
router.use((req, res, next) => {
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
    return idempotencyMiddleware(req, res, next);
  }
  next();
});

router.get('/vapid-key', getVapidPublicKey);
router.post('/subscribe', subscribe);
router.post('/unsubscribe', unsubscribe);
router.post('/test', sendTestNotification);

export default router;
