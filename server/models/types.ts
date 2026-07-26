import mongoose, { Document, Types } from 'mongoose';

export interface IPushSubscription {
  _id?: { toString(): string };
  endpoint: string;
  keys: { p256dh: string; auth: string };
  createdAt?: Date;
}

export interface IUserPreferences {
  theme: 'dark' | 'light' | 'system';
  dateFormat: string;
  language: string;
  firstDayOfWeek: number;
  anomalyThreshold: number;
  lowBalanceThreshold: number;
  enableBudgetAlerts: boolean;
  enableScheduledAlerts: boolean;
  enableSavingsAlerts: boolean;
  enableLowBalanceAlerts: boolean;
  enableAiInsightsAlerts: boolean;
}

export interface IUserCurrency {
  code: string;
  symbol: string;
}

export interface IUserDocument extends Document {
  _id: Types.ObjectId;
  email: string;
  password: string;
  name: string;
  currency: IUserCurrency;
  preferences: IUserPreferences;
  pushSubscriptions: IPushSubscription[];
  resetPasswordToken: string | null;
  resetPasswordExpire: Date | null;
  createdAt: Date;
}

export interface IAccountCreditDetails {
  initialAmount: number | null;
  interestRate: number | null;
  durationMonths: number | null;
  startDate: Date | null;
  monthlyPayment: number | null;
  scheduledTransactionId: Types.ObjectId | null;
}

export interface IAccountDocument extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  name: string;
  type: 'checking' | 'savings' | 'cash' | 'credit' | 'investment';
  balance: number;
  currency: string;
  color: string;
  icon: string;
  includeInTotal: boolean;
  creditLimit: number | null;
  creditDetails: IAccountCreditDetails | null;
  order: number;
  createdAt: Date;
  updateBalance(amount: number, type: string): Promise<IAccountDocument>;
}

export interface IBudgetDocument extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  name: string;
  categoryId: Types.ObjectId;
  amount: number;
  period: 'weekly' | 'monthly' | 'yearly';
  startDate: Date;
  rollover: boolean;
  alertAt: number;
  color: string;
  createdAt: Date;
}

export interface ICategoryDocument extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  name: string;
  type: 'expense' | 'income' | 'both';
  icon: string;
  color: string;
  parentId: Types.ObjectId | null;
  isDefault: boolean;
  order: number;
  createdAt: Date;
}

export interface ITransactionDocument extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  accountId: Types.ObjectId;
  categoryId: Types.ObjectId | null;
  type: 'expense' | 'income' | 'transfer';
  amount: number;
  description: string;
  date: Date;
  note: string;
  tags: Types.ObjectId[];
  isScheduled: boolean;
  scheduledTransactionId: Types.ObjectId | null;
  isPending: boolean;
  toAccountId: Types.ObjectId | null;
  savingsGoalId: Types.ObjectId | null;
  createdAt: Date;
}

export interface IScheduledTransactionDocument extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  accountId: Types.ObjectId;
  categoryId: Types.ObjectId | null;
  type: 'expense' | 'income' | 'transfer';
  amount: number;
  description: string;
  note: string;
  frequency: { every: number; unit: 'day' | 'week' | 'month' | 'year' };
  startDate: Date;
  numberOfTimes: number;
  timesExecuted: number;
  nextDate: Date;
  endDate: Date | null;
  autoConfirm: boolean;
  isSubscription: boolean;
  toAccountId: Types.ObjectId | null;
  isActive: boolean;
  createdAt: Date;
}

export interface ISavingsGoalDocument extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  name: string;
  targetAmount: number;
  currentAmount: number;
  startDate: Date;
  targetDate: Date;
  icon: string;
  color: string;
  accountId: Types.ObjectId | null;
  createdAt: Date;
}

export interface ITagDocument extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  name: string;
  color: string;
  isArchived: boolean;
  createdAt: Date;
}

export interface IShareDocument extends Document {
  _id: Types.ObjectId;
  resourceType: 'account' | 'budget';
  resourceId: Types.ObjectId;
  resourceModel: 'Account' | 'Budget';
  ownerId: Types.ObjectId;
  sharedWithId: Types.ObjectId;
  permission: 'read' | 'write';
  createdAt: Date;
}

export interface ISavedFilterDocument extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  name: string;
  filters: {
    search: string;
    accountId: string;
    categoryId: string;
    type: string;
    startDate: string;
    endDate: string;
  };
  createdAt: Date;
}

export interface IUnusualTransaction {
  transactionId: Types.ObjectId;
  description: string;
  amount: number;
  date: Date;
  categoryName: string;
  ratio: number;
}

export interface IFinancialStats {
  income: number;
  expenses: number;
  net: number;
  savingsRate: number;
}

export interface IMonthlyReportDocument extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  monthKey: string;
  reportText: string;
  financialStats: IFinancialStats;
  unusualTransactions: IUnusualTransaction[];
  createdAt: Date;
}

export interface IIdempotentRequestDocument extends Document {
  _id: Types.ObjectId;
  idempotencyKey: string;
  userId: string;
  method?: string;
  path?: string;
  requestBody?: string;
  pending: boolean;
  statusCode?: number;
  result?: string;
  responseSentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IJobLockDocument extends Document {
  _id: Types.ObjectId;
  lockName: string;
  holderId: string;
  acquiredAt: Date;
}

export interface IUserCredentialDocument extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  credentialID: string;
  publicKey: Buffer;
  counter: number;
  deviceName: string;
  transports: string[];
  createdAt: Date;
}

export interface IWebauthnChallengeDocument extends Document {
  _id: Types.ObjectId;
  challenge: string;
  userId: Types.ObjectId | null;
  createdAt: Date;
}

export type AccountModel = mongoose.Model<IAccountDocument> & {
  updateBalance(accountId: unknown, amount: number, type: string, session?: unknown): Promise<IAccountDocument>;
};

export type BudgetModel = mongoose.Model<IBudgetDocument>;
export type CategoryModel = mongoose.Model<ICategoryDocument>;
export type TransactionModel = mongoose.Model<ITransactionDocument>;
export type ScheduledTransactionModel = mongoose.Model<IScheduledTransactionDocument>;
export type SavingsGoalModel = mongoose.Model<ISavingsGoalDocument>;
export type TagModel = mongoose.Model<ITagDocument>;
export type ShareModel = mongoose.Model<IShareDocument>;
export type SavedFilterModel = mongoose.Model<ISavedFilterDocument>;
export type MonthlyReportModel = mongoose.Model<IMonthlyReportDocument>;
export type UserModel = mongoose.Model<IUserDocument>;
export type UserCredentialModel = mongoose.Model<IUserCredentialDocument>;
export type WebauthnChallengeModel = mongoose.Model<IWebauthnChallengeDocument>;
export type IdempotentRequestModel = mongoose.Model<IIdempotentRequestDocument>;
export type JobLockModel = mongoose.Model<IJobLockDocument>;
