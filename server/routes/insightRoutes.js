import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { getInsights } from '../controllers/insightController.js';

const router = express.Router();

// All insight routes are protected
router.use(protect);

router.get('/', getInsights);

export default router;
