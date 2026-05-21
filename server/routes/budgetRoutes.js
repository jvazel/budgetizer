import express from 'express';
import { body } from 'express-validator';
import { protect } from '../middleware/authMiddleware.js';
import {
  getBudgets,
  createBudget,
  updateBudget,
  deleteBudget
} from '../controllers/budgetController.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getBudgets)
  .post(
    [
      body('name', 'Name is required').not().isEmpty(),
      body('categoryId', 'Category is required').not().isEmpty(),
      body('amount', 'Amount is required and must be a number').isNumeric()
    ],
    createBudget
  );

router.route('/:id')
  .put(updateBudget)
  .delete(deleteBudget);

export default router;
