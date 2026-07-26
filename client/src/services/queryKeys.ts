/**
 * Standardized Query Key Factory for TanStack Query
 */
export const queryKeys = {
  accounts: {
    all: ['accounts'] as const,
    detail: (id: string) => ['accounts', id] as const,
  },
  transactions: {
    all: ['transactions'] as const,
    list: (filters?: Record<string, unknown>) => ['transactions', 'list', filters] as const,
    detail: (id: string) => ['transactions', id] as const,
  },
  budgets: {
    all: ['budgets'] as const,
    detail: (id: string) => ['budgets', id] as const,
  },
  savingsGoals: {
    all: ['savingsGoals'] as const,
    detail: (id: string) => ['savingsGoals', id] as const,
  },
  scheduled: {
    all: ['scheduled'] as const,
    detail: (id: string) => ['scheduled', id] as const,
  },
  categories: {
    all: ['categories'] as const,
  },
  tags: {
    all: ['tags'] as const,
  },
  dashboard: {
    summary: ['dashboard', 'summary'] as const,
  },
  monthlyReports: {
    all: ['monthlyReports'] as const,
    detail: (monthKey: string) => ['monthlyReports', monthKey] as const,
  },
  insights: {
    all: ['insights'] as const,
  },
};
