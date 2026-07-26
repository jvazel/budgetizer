import express from 'express';
import { protect } from '../middleware/authMiddleware';
import idempotencyMiddleware from '../middleware/idempotencyMiddleware';
import validateRequest from '../middleware/validateRequest';
import { subscribePushSchema, unsubscribePushSchema } from '../services/validationSchemas';
import {
  getVapidPublicKey,
  subscribe,
  unsubscribe,
  sendTestNotification
} from '../controllers/notificationController';

const router = express.Router();

// All routes require authentication
router.use(protect);

router.use((req, res, next) => {
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
    return idempotencyMiddleware(req, res, next);
  }
  next();
});

router.get('/vapid-key', getVapidPublicKey);
router.post('/subscribe', validateRequest(subscribePushSchema), subscribe);
router.post('/unsubscribe', validateRequest(unsubscribePushSchema), unsubscribe);
router.post('/test', sendTestNotification);

export default router;

