/**
 * Core financial types used across the application
 */

export type AccountType = 'checking' | 'savings' | 'cash' | 'credit' | 'investment';

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

export interface AccountCreditDetails {
  initialAmount: number | null;
  interestRate: number | null;
  durationMonths: number | null;
  startDate: string | null;
  monthlyPayment: number | null;
  scheduledTransactionId: string | null;
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

export interface SavedFilter {
  _id: string;
  name: string;
  filters: {
    search: string;
    accountId: string;
    categoryId: string;
    type: string;
    startDate: string;
    endDate: string;
  };
}

export interface SavingsGoal {
  _id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  startDate: string;
  targetDate: string;
  icon?: string;
  color?: string;
  accountId?: string | null;
}

export interface UnusualTransaction {
  transactionId: string;
  description: string;
  amount: number;
  date: string;
  categoryName: string;
  ratio: number;
}

export interface FinancialStats {
  income: number;
  expenses: number;
  net: number;
  savingsRate: number;
}

export interface MonthlyReport {
  _id: string;
  monthKey: string;
  reportText: string;
  financialStats: FinancialStats;
  unusualTransactions: UnusualTransaction[];
}

export interface DashboardSummary {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  netFlow: number;
  savingsRate: number;
  accounts: Account[];
  transactions: Transaction[];
  budgets: BudgetWithSpending[];
  unusualTransactions: UnusualTransaction[];
  topCategories: CategorySpend[];
}

export interface BudgetWithSpending {
  _id: string;
  name: string;
  categoryId: string;
  amount: number;
  period: 'weekly' | 'monthly' | 'yearly';
  color: string;
  spent: number;
  percentage: number;
}

export interface CategorySpend {
  _id: string;
  name: string;
  amount: number;
  percentage: number;
  icon?: string;
  color?: string;
}

export interface MonthlySummary {
  monthKey: string;
  income: number;
  expenses: number;
  net: number;
  savingsRate: number;
}

export interface FinancialScoreData {
  score: number;
  category: string;
  breakdown: ScoreCategory[];
}

export interface ScoreCategory {
  name: string;
  score: number;
  maxScore: number;
  label: string;
  color: string;
  tip: string;
}

export interface ChartDataPoint {
  label: string;
  value: number;
  date?: string;
}

export interface CategoryChartData {
  name: string;
  value: number;
  percentage: number;
  color?: string;
}

export interface BalanceHistoryPoint {
  date: string;
  balance: number;
  accountId: string;
  accountName?: string;
}

export interface CashFlowDataPoint {
  date: string;
  income: number;
  expenses: number;
}

export interface BudgetComparisonData {
  name: string;
  budgeted: number;
  actual: number;
  color?: string;
}

export interface FormTransaction {
  accountId: string;
  type: TransactionType;
  amount: number;
  date: string;
  description: string;
  categoryId?: string;
  note?: string;
  tags?: string[];
  toAccountId?: string;
}

export interface FormBudget {
  name: string;
  categoryId: string;
  amount: number;
  period: 'weekly' | 'monthly' | 'yearly';
  startDate: string;
  rollover: boolean;
  alertAt: number;
  color?: string;
}

export interface FormSavingsGoal {
  name: string;
  targetAmount: number;
  currentAmount: number;
  startDate: string;
  targetDate: string;
  icon?: string;
  color?: string;
  accountId?: string;
}

export interface TransactionFilters {
  search: string;
  accountId: string;
  categoryId: string;
  type: string;
  startDate: string;
  endDate: string;
}

export interface NotificationItem {
  id: string;
  type: 'budget' | 'scheduled' | 'savings' | 'lowBalance' | 'aiInsight';
  message: string;
  date: string;
  read: boolean;
}
