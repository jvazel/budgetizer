import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { getDashboardSummary, getMonthlySummaries, getMonthlyScore, getMonthlyScoreHistory } from '../controllers/dashboardController.js';

const router = express.Router();

router.use(protect);

router.route('/summary').get(getDashboardSummary);
router.route('/monthly-summaries').get(getMonthlySummaries);
router.route('/score').get(getMonthlyScore);
router.route('/score-history').get(getMonthlyScoreHistory);

export default router;
