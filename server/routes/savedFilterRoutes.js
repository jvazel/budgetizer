import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  getSavedFilters,
  createSavedFilter,
  updateSavedFilter,
  deleteSavedFilter
} from '../controllers/savedFilterController.js';

const router = express.Router();

// Apply auth middleware to all routes in this file
router.use(protect);

router.route('/')
  .get(getSavedFilters)
  .post(createSavedFilter);

router.route('/:id')
  .put(updateSavedFilter)
  .delete(deleteSavedFilter);

export default router;
