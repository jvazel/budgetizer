import express from 'express';
import { body } from 'express-validator';
import { protect } from '../middleware/authMiddleware.js';
import idempotencyMiddleware from '../middleware/idempotencyMiddleware.js';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory
} from '../controllers/categoryController.js';

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
  .get(getCategories)
  .post(
    [
      body('name', 'Name is required').not().isEmpty(),
      body('type', 'Type is required').isIn(['expense', 'income', 'both']),
      body('icon', 'Icon is required').not().isEmpty(),
      body('color', 'Color is required').not().isEmpty()
    ],
    createCategory
  );

router.route('/:id')
  .put(updateCategory)
  .delete(deleteCategory);

export default router;
