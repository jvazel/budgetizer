import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  accountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: true
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: false
  },
  type: {
    type: String,
    enum: ['expense', 'income', 'transfer'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0.01
  },
  description: {
    type: String,
    default: ""
  },
  date: {
    type: Date,
    default: Date.now,
    required: true
  },
  note: {
    type: String,
    default: ""
  },
  tags: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tag'
  }],
  // Transactions planifiées
  isScheduled: {
    type: Boolean,
    default: false
  },
  scheduledTransactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ScheduledTransaction',
    default: null
  },
  isPending: {
    type: Boolean,
    default: false
  },
  // Virement
  toAccountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    default: null
  },
  savingsGoalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SavingsGoal',
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for query performance optimization
transactionSchema.index({ userId: 1, date: -1 });
transactionSchema.index({ userId: 1, accountId: 1 });
transactionSchema.index({ userId: 1, toAccountId: 1 });
transactionSchema.index({ userId: 1, savingsGoalId: 1 });
transactionSchema.index({ userId: 1, categoryId: 1, date: -1 });
transactionSchema.index({ userId: 1, date: -1, createdAt: -1 });

export default mongoose.model('Transaction', transactionSchema);
