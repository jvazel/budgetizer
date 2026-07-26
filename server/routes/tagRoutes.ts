import express from 'express';
import { protect } from '../middleware/authMiddleware';
import idempotencyMiddleware from '../middleware/idempotencyMiddleware';
import validateRequest from '../middleware/validateRequest';
import { createTagSchema } from '../services/validationSchemas';
import {
  getTags,
  createTag,
  updateTag,
  deleteTag
} from '../controllers/tagController';

const router = express.Router();

router.use(protect);

router.use((req, res, next) => {
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
    return idempotencyMiddleware(req, res, next);
  }
  next();
});

router.route('/')
  .get(getTags)
  .post(validateRequest(createTagSchema), createTag);

router.route('/:id')
  .put(updateTag)
  .delete(deleteTag);

export default router;
