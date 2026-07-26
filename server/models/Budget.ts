import mongoose from 'mongoose';
import { IBudgetDocument, BudgetModel } from './types';

const budgetSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0.01
  },
  period: {
    type: String,
    enum: ['weekly', 'monthly', 'yearly'],
    default: 'monthly'
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  rollover: {
    type: Boolean,
    default: false
  },
  alertAt: {
    type: Number,
    default: 80 // Alert at 80%
  },
  color: {
    type: String,
    default: '#8b5cf6'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for query performance optimization
budgetSchema.index({ userId: 1, categoryId: 1 });
budgetSchema.index({ userId: 1, period: 1, startDate: -1 });

export default mongoose.model<IBudgetDocument, BudgetModel>('Budget', budgetSchema);
