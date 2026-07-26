import express from 'express';
import { body } from 'express-validator';
import { protect } from '../middleware/authMiddleware';
import idempotencyMiddleware from '../middleware/idempotencyMiddleware';
import {
  getBudgets,
  createBudget,
  updateBudget,
  deleteBudget
} from '../controllers/budgetController';

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
