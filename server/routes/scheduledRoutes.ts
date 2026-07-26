import express from 'express';
import { protect } from '../middleware/authMiddleware';
import idempotencyMiddleware from '../middleware/idempotencyMiddleware';
import validateRequest from '../middleware/validateRequest';
import {
  createScheduledSchema,
  updateScheduledSchema,
} from '../services/validationSchemas';
import {
  getScheduledTransactions,
  getPendingTransactions,
  createScheduledTransaction,
  updateScheduledTransaction,
  deleteScheduledTransaction,
  confirmPendingTransaction,
  skipPendingTransaction,
  getUpcomingTransactions
} from '../controllers/scheduledController';

const router = express.Router();

router.use(protect);

router.use((req, res, next) => {
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
    return idempotencyMiddleware(req, res, next);
  }
  next();
});

router.route('/')
  .get(getScheduledTransactions)
  .post(validateRequest(createScheduledSchema), createScheduledTransaction);

router.route('/pending')
  .get(getPendingTransactions);

router.route('/upcoming')
  .get(getUpcomingTransactions);

router.route('/:id')
  .put(validateRequest(updateScheduledSchema), updateScheduledTransaction)
  .delete(deleteScheduledTransaction);

router.route('/:id/confirm')
  .post(confirmPendingTransaction);

router.route('/:id/skip')
  .post(skipPendingTransaction);

export default router;
