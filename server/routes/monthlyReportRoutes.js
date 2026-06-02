import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { getMonthlyReport } from '../controllers/monthlyReportController.js';

const router = express.Router();

// Toutes les routes de rapports mensuels sont sécurisées par authentification
router.get('/:monthKey', protect, getMonthlyReport);

export default router;
