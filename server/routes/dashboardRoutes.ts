import express from 'express';
import { protect } from '../middleware/authMiddleware';
import { getDashboardSummary, getMonthlySummaries, getMonthlyScore, getMonthlyScoreHistory, getKpiSummary, getSafeToSpend } from '../controllers/dashboardController';

const router = express.Router();

router.use(protect);

router.route('/summary').get(getDashboardSummary);
router.route('/monthly-summaries').get(getMonthlySummaries);
router.route('/score').get(getMonthlyScore);
router.route('/score-history').get(getMonthlyScoreHistory);
router.route('/kpi-summary').get(getKpiSummary);
router.route('/safe-to-spend').get(getSafeToSpend);

export default router;


