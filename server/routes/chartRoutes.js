import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  getChartsByCategory,
  getFutureCharts,
  getForecastCharts,
  getNetWorthHistory,
  getCashFlowHistory,
  getExpenseRanking,
  getHistogramData,
  getBalanceHistory,
  getTagChartsData
} from '../controllers/chartController.js';

const router = express.Router();

router.use(protect);

router.get('/by-category', getChartsByCategory);
router.get('/tags', getTagChartsData);
router.get('/future', getFutureCharts);
router.get('/forecast', getForecastCharts);
router.get('/net-worth', getNetWorthHistory);
router.get('/cash-flow', getCashFlowHistory);
router.get('/ranking', getExpenseRanking);
router.get('/histogram', getHistogramData);
router.get('/balance-history', getBalanceHistory);

export default router;
