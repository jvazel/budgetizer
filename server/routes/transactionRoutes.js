import express from 'express';
import { body } from 'express-validator';
import multer from 'multer';
import { protect } from '../middleware/authMiddleware.js';
import idempotencyMiddleware from '../middleware/idempotencyMiddleware.js';
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

// Appliquer l'idempotence sur POST / PUT / DELETE pour éviter les doublons lors du sync hors-ligne
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
