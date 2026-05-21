import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  getChartsByCategory,
  getFutureCharts,
  getForecastCharts
} from '../controllers/chartController.js';

const router = express.Router();

router.use(protect);

router.get('/by-category', getChartsByCategory);
router.get('/future', getFutureCharts);
router.get('/forecast', getForecastCharts);

export default router;
