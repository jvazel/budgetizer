/**
 * Core domain types shared between server and client
 */

export type AccountType = 'checking' | 'savings' | 'cash' | 'credit' | 'investment';

export interface AccountCreditDetails {
  initialAmount: number | null;
  interestRate: number | null;
  durationMonths: number | null;
  startDate: string | null;
  monthlyPayment: number | null;
  scheduledTransactionId: string | null;
}

export interface Account {
  _id: string;
  name: string;
  balance: number;
  currency: string;
  type: AccountType;
  color?: string;
  icon?: string;
  permission?: 'owner' | 'write' | 'read';
  includeInTotal?: boolean;
  creditLimit?: number | null;
  creditDetails?: AccountCreditDetails | null;
  order?: number;
}

export type TransactionType = 'income' | 'expense' | 'transfer';

export interface Transaction {
  _id: string;
  accountId: string;
  toAccountId?: string | null;
  type: TransactionType;
  amount: number;
  date: string;
  description?: string;
  note?: string;
  categoryId?: string | null;
  categoryIdName?: string;
  tags?: string[];
  isScheduled?: boolean;
  scheduledTransactionId?: string | null;
  isPending?: boolean;
  status?: 'pending' | 'completed';
  savingsGoalId?: string | null;
}

export interface Budget {
  _id: string;
  name: string;
  categoryId: string;
  amount: number;
  period: 'weekly' | 'monthly' | 'yearly';
  startDate: string;
  rollover: boolean;
  alertAt: number;
  color: string;
}

export interface ScheduledTransaction {
  _id: string;
  accountId: string;
  categoryId?: string | null;
  type: TransactionType;
  amount: number;
  description: string;
  note?: string;
  frequency: { every: number; unit: 'day' | 'week' | 'month' | 'year' };
  startDate: string;
  numberOfTimes: number;
  timesExecuted: number;
  nextDate: string;
  endDate?: string | null;
  autoConfirm: boolean;
  isSubscription: boolean;
  toAccountId?: string | null;
  isActive: boolean;
}

export interface Tag {
  _id: string;
  name: string;
  color: string;
  isArchived: boolean;
}

export interface Share {
  _id: string;
  resourceType: 'account' | 'budget';
  resourceId: string;
  resourceModel: 'Account' | 'Budget';
  ownerId: string;
  sharedWithId: string;
  permission: 'read' | 'write';
}

export interface UserPreferences {
  theme: string;
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

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  currency: { code: string; symbol: string };
  preferences: UserPreferences;
}

export interface KpiSparklinePoint {
  monthKey: string;
  label: string;
  value: number;
}

export interface KpiMetricItem {
  currentValue: number;
  previousValue: number;
  changePercentage: number | null;
  sparkline: KpiSparklinePoint[];
}

export interface KpiSummaryResponse {
  income: KpiMetricItem;
  expenses: KpiMetricItem;
  net: KpiMetricItem;
  savingsRate: KpiMetricItem;
}

export interface SafeToSpendSummary {
  totalSafeToSpend: number;
  dailyBudgetRemaining: number;
  daysLeftInMonth: number;
  upcomingExpenses: number;
  upcomingIncome: number;
  allocatedToSavings: number;
  spentThisMonth: number;
  status: 'healthy' | 'warning' | 'critical';
}

export interface SankeyNode {
  id: string;
  name: string;
  category: 'income' | 'account' | 'expense' | 'savings';
}

export interface SankeyLink {
  source: string;
  target: string;
  value: number;
}

export interface SankeyFlowResponse {
  nodes: SankeyNode[];
  links: SankeyLink[];
}



