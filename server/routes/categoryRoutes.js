import express from 'express';
import { body } from 'express-validator';
import { protect } from '../middleware/authMiddleware.js';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory
} from '../controllers/categoryController.js';

const router = express.Router();

router.use(protect);

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
