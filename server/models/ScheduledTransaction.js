import mongoose from 'mongoose';

const scheduledTransactionSchema = new mongoose.Schema({
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
    ref: 'Category'
  },
  type: {
    type: String,
    enum: ['expense', 'income', 'transfer'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  note: {
    type: String,
    default: ''
  },
  frequency: {
    every: {
      type: Number,
      required: true,
      default: 1
    },
    unit: {
      type: String,
      enum: ['day', 'week', 'month', 'year'],
      required: true
    }
  },
  startDate: {
    type: Date,
    required: true
  },
  numberOfTimes: {
    type: Number,
    default: 0 // 0 = unlimited
  },
  timesExecuted: {
    type: Number,
    default: 0
  },
  nextDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    default: null
  },
  autoConfirm: {
    type: Boolean,
    default: true
  },
  isSubscription: {
    type: Boolean,
    default: false
  },
  toAccountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('ScheduledTransaction', scheduledTransactionSchema);
