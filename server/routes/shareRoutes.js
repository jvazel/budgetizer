import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import idempotencyMiddleware from '../middleware/idempotencyMiddleware.js';
import {
  getShares,
  createShare,
  updateShare,
  deleteShare
} from '../controllers/shareController.js';

const router = express.Router();

router.use(protect);

// Appliquer l'idempotence sur POST / PUT / DELETE pour éviter les doublons lors du sync hors-ligne
router.use((req, res, next) => {
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
    return idempotencyMiddleware(req, res, next);
  }
  next();
});

router.get('/', getShares);
router.post('/', createShare);
router.put('/:id', updateShare);
router.delete('/:id', deleteShare);

export default router;
