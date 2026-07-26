import express from 'express';
import { protect } from '../middleware/authMiddleware';
import idempotencyMiddleware from '../middleware/idempotencyMiddleware';
import validateRequest from '../middleware/validateRequest';
import {
  createSavingsGoalSchema,
  updateSavingsGoalSchema,
} from '../services/validationSchemas';
import {
  getSavingsGoals,
  createSavingsGoal,
  updateSavingsGoal,
  deleteSavingsGoal
} from '../controllers/savingsGoalController';

const router = express.Router();

router.use(protect);

router.use((req, res, next) => {
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
    return idempotencyMiddleware(req, res, next);
  }
  next();
});

router.route('/')
  .get(getSavingsGoals)
  .post(validateRequest(createSavingsGoalSchema), createSavingsGoal);

router.route('/:id')
  .put(validateRequest(updateSavingsGoalSchema), updateSavingsGoal)
  .delete(deleteSavingsGoal);

export default router;
