import express from 'express';
import { protect } from '../middleware/authMiddleware';
import {
  getChartsByCategory,
  getFutureCharts,
  getForecastCharts,
  getNetWorthHistory,
  getCashFlowHistory,
  getExpenseRanking,
  getHistogramData,
  getBalanceHistory,
  getTagChartsData,
  getFixedVsVariableData,
  getWaterfallData
} from '../controllers/chartController';

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
router.get('/fixed-vs-variable', getFixedVsVariableData);
router.get('/waterfall', getWaterfallData);


export default router;
