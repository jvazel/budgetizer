import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import idempotencyMiddleware from '../middleware/idempotencyMiddleware.js';
import {
  getScheduledTransactions,
  getPendingTransactions,
  createScheduledTransaction,
  updateScheduledTransaction,
  deleteScheduledTransaction,
  confirmPendingTransaction,
  skipPendingTransaction,
  getUpcomingTransactions
} from '../controllers/scheduledController.js';

const router = express.Router();

router.use(protect);

// Appliquer l'idempotence sur POST / PUT / DELETE pour éviter les doublons lors du sync hors-ligne
router.use((req, res, next) => {
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
    return idempotencyMiddleware(req, res, next);
  }
  next();
});

router.route('/')
  .get(getScheduledTransactions)
  .post(createScheduledTransaction);

router.route('/pending')
  .get(getPendingTransactions);

router.route('/upcoming')
  .get(getUpcomingTransactions);

router.route('/:id')
  .put(updateScheduledTransaction)
  .delete(deleteScheduledTransaction);

router.route('/:id/confirm')
  .post(confirmPendingTransaction);

router.route('/:id/skip')
  .post(skipPendingTransaction);

export default router;
