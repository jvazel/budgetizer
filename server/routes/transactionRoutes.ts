import express from 'express';
import multer from 'multer';
import { protect } from '../middleware/authMiddleware';
import idempotencyMiddleware from '../middleware/idempotencyMiddleware';
import validateRequest from '../middleware/validateRequest';
import {
  createTransactionSchema,
  updateTransactionSchema,
} from '../services/validationSchemas';
import {
  getTransactions,
  createTransaction,
  deleteTransaction,
  getCalendarTransactions,
  exportTransactions,
  importTransactions,
  updateTransaction,
  reviewTransaction
} from '../controllers/transactionController';

const router = express.Router();
const upload = multer({ limits: { fileSize: 5 * 1024 * 1024 } });

router.use(protect);

router.use((req, res, next) => {
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
    return idempotencyMiddleware(req, res, next);
  }
  next();
});

router.route('/calendar')
  .get(getCalendarTransactions);

router.get('/export', exportTransactions);
router.post('/import', upload.single('file'), importTransactions);

router.patch('/:id/review', reviewTransaction);

router.route('/')
  .get(getTransactions)
  .post(
    validateRequest(createTransactionSchema),
    createTransaction
  );

router.route('/:id')
  .put(
    validateRequest(updateTransactionSchema),
    updateTransaction
  )
  .delete(deleteTransaction);

export default router;
