import express from 'express';
import { body } from 'express-validator';
import multer from 'multer';
import { protect } from '../middleware/authMiddleware.js';
import {
  getTransactions,
  createTransaction,
  deleteTransaction,
  getCalendarTransactions,
  exportTransactions,
  importTransactions,
  updateTransaction
} from '../controllers/transactionController.js';

const router = express.Router();
const upload = multer({ limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB max

router.use(protect);

router.route('/calendar')
  .get(getCalendarTransactions);

router.get('/export', exportTransactions);
router.post('/import', upload.single('file'), importTransactions);

router.route('/')
  .get(getTransactions)
  .post(
    [
      body('accountId', 'Account ID is required').not().isEmpty(),
      body('type', 'Type is required').isIn(['expense', 'income', 'transfer']),
      body('amount', 'Amount must be greater than 0').isFloat({ min: 0.01 }),
    ],
    createTransaction
  );

router.route('/:id')
  .put(updateTransaction)
  .delete(deleteTransaction);

export default router;
