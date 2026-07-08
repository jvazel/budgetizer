import express from 'express';
import { body } from 'express-validator';
import { protect } from '../middleware/authMiddleware.js';
import idempotencyMiddleware from '../middleware/idempotencyMiddleware.js';
import {
  getTags,
  createTag,
  updateTag,
  deleteTag
} from '../controllers/tagController.js';

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
  .get(getTags)
  .post(
    [
      body('name', 'Le nom du tag est obligatoire.').not().isEmpty(),
      body('isArchived', 'isArchived doit être un booléen.').optional().isBoolean()
    ],
    createTag
  );

router.route('/:id')
  .put(
    [
      body('name', 'Le nom du tag ne peut pas être vide si fourni.').optional().not().isEmpty(),
      body('isArchived', 'isArchived doit être un booléen.').optional().isBoolean()
    ],
    updateTag
  )
  .delete(deleteTag);

export default router;
