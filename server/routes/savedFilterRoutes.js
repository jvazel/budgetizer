import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import idempotencyMiddleware from '../middleware/idempotencyMiddleware.js';
import {
  getSavedFilters,
  createSavedFilter,
  updateSavedFilter,
  deleteSavedFilter
} from '../controllers/savedFilterController.js';

const router = express.Router();

// Apply auth middleware to all routes in this file
router.use(protect);

// Appliquer l'idempotence sur POST / PUT / DELETE pour éviter les doublons lors du sync hors-ligne
router.use((req, res, next) => {
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
    return idempotencyMiddleware(req, res, next);
  }
  next();
});

router.route('/')
  .get(getSavedFilters)
  .post(createSavedFilter);

router.route('/:id')
  .put(updateSavedFilter)
  .delete(deleteSavedFilter);

export default router;
