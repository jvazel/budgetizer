import express from 'express';
import { protect } from '../middleware/authMiddleware';
import { getInsights } from '../controllers/insightController';

const router = express.Router();

// All insight routes are protected
router.use(protect);

router.get('/', getInsights);

export default router;
