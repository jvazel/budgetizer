import mongoose from 'mongoose';
import { ISavingsGoalDocument, SavingsGoalModel } from './types';

const savingsGoalSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  targetAmount: {
    type: Number,
    required: true,
    min: 0.01
  },
  currentAmount: {
    type: Number,
    default: 0
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  targetDate: {
    type: Date,
    required: true
  },
  icon: {
    type: String,
    default: "💰"
  },
  color: {
    type: String,
    default: "#3b82f6"
  },
  accountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for query performance optimization
savingsGoalSchema.index({ userId: 1 });

export default mongoose.model<ISavingsGoalDocument, SavingsGoalModel>('SavingsGoal', savingsGoalSchema);
