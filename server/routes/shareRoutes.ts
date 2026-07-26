import express from 'express';
import { protect } from '../middleware/authMiddleware';
import idempotencyMiddleware from '../middleware/idempotencyMiddleware';
import validateRequest from '../middleware/validateRequest';
import { createShareSchema } from '../services/validationSchemas';
import {
  getShares,
  createShare,
  updateShare,
  deleteShare
} from '../controllers/shareController';

const router = express.Router();

router.use(protect);

router.use((req, res, next) => {
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
    return idempotencyMiddleware(req, res, next);
  }
  next();
});

router.get('/', getShares);
router.post('/', validateRequest(createShareSchema), createShare);
router.put('/:id', updateShare);
router.delete('/:id', deleteShare);

export default router;
