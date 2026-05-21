import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
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
