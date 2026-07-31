import mongoose from 'mongoose';
import { IMonthlyReportDocument, MonthlyReportModel } from './types';

const monthlyReportSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  monthKey: {
    type: String, // Format: "YYYY-MM" (ex: "2026-05")
    required: true
  },
  reportText: {
    type: String, // Contenu Markdown rédigé par l'algorithme
    required: true
  },
  financialStats: {
    income: { type: Number, default: 0 },
    expenses: { type: Number, default: 0 },
    net: { type: Number, default: 0 },
    savingsRate: { type: Number, default: 0 }
  },
  unusualTransactions: [{
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction'
    },
    description: { type: String, default: '' },
    amount: { type: Number, required: true },
    date: { type: Date, required: true },
    categoryName: { type: String, required: true },
    ratio: { type: Number, required: true }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Assure l'unicité du rapport pour un utilisateur et un mois donnés
monthlyReportSchema.index({ userId: 1, monthKey: 1 }, { unique: true });

export default mongoose.model<IMonthlyReportDocument, MonthlyReportModel>('MonthlyReport', monthlyReportSchema);
