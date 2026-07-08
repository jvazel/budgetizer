import express from 'express';
import { body } from 'express-validator';
import { protect } from '../middleware/authMiddleware.js';
import idempotencyMiddleware from '../middleware/idempotencyMiddleware.js';
import {
  getSavingsGoals,
  createSavingsGoal,
  updateSavingsGoal,
  deleteSavingsGoal
} from '../controllers/savingsGoalController.js';

const router = express.Router();

// All routes are protected
router.use(protect);

// Appliquer l'idempotence sur POST / PUT / DELETE pour éviter les doublons lors du sync hors-ligne
router.use((req, res, next) => {
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
    return idempotencyMiddleware(req, res, next);
  }
  next();
});

router.route('/')
  .get(getSavingsGoals)
  .post(
    [
      body('name', 'Le nom est requis').not().isEmpty().trim(),
      body('targetAmount', 'Le montant cible doit être un nombre valide supérieur à 0').isFloat({ min: 0.01 }),
      body('targetDate', 'La date cible doit être une date valide').isISO8601(),
      body('accountId', 'Le compte doit être un identifiant valide').optional({ checkFalsy: true }).isMongoId()
    ],
    createSavingsGoal
  );

router.route('/:id')
  .put(
    [
      body('name', 'Le nom ne peut pas être vide').optional().not().isEmpty().trim(),
      body('targetAmount', 'Le montant cible doit être un nombre valide supérieur à 0').optional().isFloat({ min: 0.01 }),
      body('targetDate', 'La date cible doit être une date valide').optional().isISO8601(),
      body('accountId', 'Le compte doit être un identifiant valide').optional({ checkFalsy: true }).isMongoId()
    ],
    updateSavingsGoal
  )
  .delete(deleteSavingsGoal);

export default router;
