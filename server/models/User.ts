import mongoose from 'mongoose';
import { IUserDocument, UserModel } from './types';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    unique: true,
    required: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  currency: {
    code: { type: String, default: 'EUR' },
    symbol: { type: String, default: '€' }
  },
  preferences: {
    theme: { type: String, enum: ['dark', 'light', 'system'], default: 'dark' },
    dateFormat: { type: String, default: 'DD/MM/YYYY' },
    language: { type: String, default: 'fr' },
    firstDayOfWeek: { type: Number, default: 1 },
    anomalyThreshold: { type: Number, default: 30 },
    lowBalanceThreshold: { type: Number, default: 100 },
    enableBudgetAlerts: { type: Boolean, default: true },
    enableScheduledAlerts: { type: Boolean, default: true },
    enableSavingsAlerts: { type: Boolean, default: true },
    enableLowBalanceAlerts: { type: Boolean, default: true },
    enableAiInsightsAlerts: { type: Boolean, default: true }
  },
  pushSubscriptions: [
    {
      endpoint: { type: String, required: true },
      keys: {
        p256dh: { type: String, required: true },
        auth: { type: String, required: true }
      },
      createdAt: { type: Date, default: Date.now }
    }
  ],
  resetPasswordToken: {
    type: String,
    default: null
  },
  resetPasswordExpire: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model<IUserDocument, UserModel>('User', userSchema);
