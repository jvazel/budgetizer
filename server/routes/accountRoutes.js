import express from 'express';
import { body } from 'express-validator';
import { protect } from '../middleware/authMiddleware.js';
import {
  getAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
  reorderAccounts,
  getCreditSummary
} from '../controllers/accountController.js';

const router = express.Router();

router.use(protect); // Protect all account routes

router.get('/:id/credit-summary', getCreditSummary);

router.route('/')
  .get(getAccounts)
  .post(
    [
      body('name', 'Name is required').not().isEmpty(),
      body('type', 'Type is required').isIn(['checking', 'savings', 'cash', 'credit', 'investment'])
    ],
    createAccount
  );

router.patch('/reorder', reorderAccounts);

router.route('/:id')
  .put(updateAccount)
  .delete(deleteAccount);

export default router;
