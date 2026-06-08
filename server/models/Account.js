import mongoose from 'mongoose';

const accountSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['checking', 'savings', 'cash', 'credit', 'investment'],
    required: true
  },
  balance: {
    type: Number,
    default: 0
  },
  currency: {
    type: String,
    default: "EUR"
  },
  color: {
    type: String,
    default: "#4ade80"
  },
  icon: {
    type: String,
    default: "wallet"
  },
  includeInTotal: {
    type: Boolean,
    default: true
  },
  creditLimit: {
    type: Number,
    default: null
  },
  creditDetails: {
    initialAmount: { type: Number, default: null },
    interestRate: { type: Number, default: null },
    durationMonths: { type: Number, default: null },
    startDate: { type: Date, default: null },
    monthlyPayment: { type: Number, default: null },
    scheduledTransactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'ScheduledTransaction', default: null }
  },
  order: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for query performance optimization
accountSchema.index({ userId: 1, order: 1 });

export default mongoose.model('Account', accountSchema);
