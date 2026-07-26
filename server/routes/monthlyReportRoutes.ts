import express from 'express';
import { protect } from '../middleware/authMiddleware';
import { getMonthlyReport } from '../controllers/monthlyReportController';

const router = express.Router();

// Toutes les routes de rapports mensuels sont sécurisées par authentification
router.get('/:monthKey', protect, getMonthlyReport);

export default router;
