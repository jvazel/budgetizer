import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { getDashboardSummary, getMonthlySummaries } from '../controllers/dashboardController.js';

const router = express.Router();

router.use(protect);

router.route('/summary').get(getDashboardSummary);
router.route('/monthly-summaries').get(getMonthlySummaries);

export default router;
