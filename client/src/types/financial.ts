export * from '../../../shared/types/index';

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
