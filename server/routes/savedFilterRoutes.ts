import express from 'express';
import { protect } from '../middleware/authMiddleware';
import idempotencyMiddleware from '../middleware/idempotencyMiddleware';
import validateRequest from '../middleware/validateRequest';
import { z } from 'zod';
import {
  getSavedFilters,
  createSavedFilter,
  updateSavedFilter,
  deleteSavedFilter
} from '../controllers/savedFilterController';

const router = express.Router();

// Apply auth middleware to all routes in this file
router.use(protect);

router.use((req, res, next) => {
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
    return idempotencyMiddleware(req, res, next);
  }
  next();
});

const savedFilterSchema = z.object({
  name: z.string().min(1).max(100),
  filters: z.object({
    search: z.string().optional().default(''),
    accountId: z.string().optional().default(''),
    categoryId: z.string().optional().default(''),
    type: z.string().optional().default(''),
    startDate: z.string().optional().default(''),
    endDate: z.string().optional().default(''),
  }),
});

router.route('/')
  .get(getSavedFilters)
  .post(validateRequest(savedFilterSchema), createSavedFilter);

router.route('/:id')
  .put(validateRequest(savedFilterSchema.partial()), updateSavedFilter)
  .delete(deleteSavedFilter);

export default router;
