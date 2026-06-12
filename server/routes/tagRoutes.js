import express from 'express';
import { body } from 'express-validator';
import { protect } from '../middleware/authMiddleware.js';
import {
  getTags,
  createTag,
  updateTag,
  deleteTag
} from '../controllers/tagController.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getTags)
  .post(
    [
      body('name', 'Le nom du tag est obligatoire.').not().isEmpty()
    ],
    createTag
  );

router.route('/:id')
  .put(
    [
      body('name', 'Le nom du tag ne peut pas être vide si fourni.').optional().not().isEmpty()
    ],
    updateTag
  )
  .delete(deleteTag);

export default router;
