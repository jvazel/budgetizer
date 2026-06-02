import { vi, describe, it, expect, beforeEach } from 'vitest';
import { getDashboardSummary, getMonthlySummaries } from '../dashboardController.js';
import Account from '../../models/Account.js';
import Transaction from '../../models/Transaction.js';
import Budget from '../../models/Budget.js';
import SavingsGoal from '../../models/SavingsGoal.js';
import ScheduledTransaction from '../../models/ScheduledTransaction.js';

vi.mock('../../models/Account.js', () => ({
  default: {
    find: vi.fn()
  }
}));

vi.mock('../../models/Transaction.js', () => ({
  default: {
    find: vi.fn(),
    findOne: vi.fn(),
    aggregate: vi.fn()
  }
}));

vi.mock('../../models/Budget.js', () => ({
  default: {
    find: vi.fn()
  }
}));

vi.mock('../../models/SavingsGoal.js', () => ({
  default: {
    find: vi.fn()
  }
}));

vi.mock('../../models/ScheduledTransaction.js', () => ({
  default: {
    find: vi.fn()
  }
}));

// Helper for Mongoose chain mocking
const mockChain = (value) => {
  const obj = {
    select: vi.fn().mockImplementation(() => obj),
    populate: vi.fn().mockImplementation(() => obj),
    sort: vi.fn().mockImplementation(() => obj),
    then: vi.fn().mockImplementation((resolve) => Promise.resolve(value).then(resolve))
  };
  return obj;
};

describe('Dashboard Controller', () => {
  let req, res;

  beforeEach(() => {
    vi.clearAllMocks();
    Transaction.aggregate.mockResolvedValue([]);

    req = {
      user: {
        id: 'user_123',
        preferences: {
          enableBudgetAlerts: true,
          enableScheduledAlerts: true,
          enableSavingsAlerts: true,
          enableLowBalanceAlerts: true,
          enableAiInsightsAlerts: true,
          lowBalanceThreshold: 100,
          anomalyThreshold: 30
        }
      },
      query: {}
    };

    res = {
      json: vi.fn(),
      status: vi.fn().mockReturnThis(),
      send: vi.fn()
    };
  });

  describe('getDashboardSummary', () => {
    it('should aggregate accounts, transaction metrics, charts, and notifications', async () => {
      const mockAccounts = [
        { _id: 'acc1', name: 'Compte Courant', balance: 500, type: 'checking', includeInTotal: true, toObject: function() { return this; } },
        { _id: 'acc2', name: 'Livret A', balance: 2000, type: 'savings', includeInTotal: true, toObject: function() { return this; } }
      ];

      const mockCategoryFood = { _id: 'cat_food', name: 'Alimentation', icon: '🍔', color: 'orange' };

      const mockCurrentMonthTxs = [
        { _id: 'tx1', type: 'expense', amount: 50, categoryId: mockCategoryFood, accountId: 'acc1', date: new Date() },
        { _id: 'tx2', type: 'income', amount: 1500, categoryId: null, accountId: 'acc1', date: new Date() }
      ];

      const mockLastMonthTxs = [
        { _id: 'tx3', type: 'expense', amount: 100, date: new Date(new Date().setMonth(new Date().getMonth() - 1)) }
      ];

      Account.find.mockResolvedValue(mockAccounts);
      
      // Setup findOne mock to handle lastTx sorting per account and oldestTx date
      Transaction.findOne.mockImplementation((query) => {
        if (query.$or) {
          return {
            sort: vi.fn().mockResolvedValue({ date: new Date('2026-06-01') })
          };
        }
        return {
          sort: vi.fn().mockResolvedValue({ date: new Date('2026-01-01') }) // Oldest transaction
        };
      });

      // Setup find mock implementation for various calls based on query keys
      Transaction.find.mockImplementation((query) => {
        if (query.isPending === true) {
          return mockChain([]); // No pending transactions
        }
        if (query.date && query.date.$gte && query.date.$lte) {
          const lte = query.date.$lte;
          const oneMonthAgo = new Date();
          oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
          
          if (new Date(lte).getMonth() === oneMonthAgo.getMonth()) {
            return mockChain(mockLastMonthTxs);
          }
          return mockChain(mockCurrentMonthTxs);
        }
        // Historical or 7 days
        return mockChain([]);
      });

      Budget.find.mockReturnValue(mockChain([]));
      SavingsGoal.find.mockResolvedValue([]);
      ScheduledTransaction.find.mockReturnValue(mockChain([]));

      await getDashboardSummary(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        totalBalance: 2500,
        totalAvailable: 2500,
        month: expect.objectContaining({
          income: 1500,
          expenses: 50,
          net: 1450
        })
      }));
    });

    it('should generate notifications when thresholds are crossed', async () => {
      // Low balance account
      const mockAccounts = [
        { _id: 'acc1', name: 'Compte Courant', balance: 40, type: 'checking', includeInTotal: true, toObject: function() { return this; } }
      ];

      // Budget limit exceeded
      const mockCategoryFood = { _id: 'cat_food', name: 'Alimentation', icon: '🍔', color: 'orange' };
      const mockBudgets = [
        { _id: 'b1', name: 'Alimentation', amount: 100, alertAt: 80, categoryId: mockCategoryFood }
      ];

      // Current month spend 120 (exceeds budget 100)
      const mockCurrentMonthTxs = [
        { _id: 'tx1', type: 'expense', amount: 120, categoryId: mockCategoryFood, accountId: 'acc1', date: new Date() }
      ];

      Account.find.mockResolvedValue(mockAccounts);
      Transaction.findOne.mockImplementation(() => ({
        sort: vi.fn().mockResolvedValue({ date: new Date('2026-01-01') })
      }));

      Transaction.find.mockImplementation((query) => {
        if (query.isPending === true) return mockChain([]);
        if (query.date && query.date.$gte && query.date.$lte) {
          return mockChain(mockCurrentMonthTxs);
        }
        return mockChain([]);
      });

      Budget.find.mockReturnValue(mockChain(mockBudgets));
      SavingsGoal.find.mockResolvedValue([]);
      ScheduledTransaction.find.mockReturnValue(mockChain([]));

      await getDashboardSummary(req, res);

      const response = res.json.mock.calls[0][0];

      // Should trigger low balance notification (balance 40 < threshold 100)
      const lowBalanceAlert = response.notifications.find(n => n.type === 'balance');
      expect(lowBalanceAlert).toBeDefined();
      expect(lowBalanceAlert.title).toBe('Solde bas sur Compte Courant');

      // Should trigger budget exceeded notification
      const budgetAlert = response.notifications.find(n => n.type === 'budget');
      expect(budgetAlert).toBeDefined();
      expect(budgetAlert.title).toContain('dépassé');
    });

    it('should handle budgets with null/undefined categoryId safely', async () => {
      const mockAccounts = [
        { _id: 'acc1', name: 'Compte Courant', balance: 500, type: 'checking', includeInTotal: true, toObject: function() { return this; } }
      ];

      const mockBudgets = [
        { _id: 'b1', name: 'Alimentation', amount: 100, alertAt: 80, categoryId: null }
      ];

      Account.find.mockResolvedValue(mockAccounts);
      Transaction.findOne.mockImplementation(() => ({
        sort: vi.fn().mockResolvedValue({ date: new Date('2026-01-01') })
      }));

      Transaction.find.mockImplementation((query) => {
        if (query.isPending === true) return mockChain([]);
        return mockChain([]);
      });

      Budget.find.mockReturnValue(mockChain(mockBudgets));
      SavingsGoal.find.mockResolvedValue([]);
      ScheduledTransaction.find.mockReturnValue(mockChain([]));

      await getDashboardSummary(req, res);

      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.budgetAlerts).toEqual([]);
    });
  });

  describe('getMonthlySummaries', () => {
    it('should aggregate income/expenses by month indices', async () => {
      req.query.year = '2026';

      const mockTxs = [
        { type: 'income', amount: 2000, date: new Date('2026-01-15') },
        { type: 'expense', amount: 500, date: new Date('2026-01-20') },
        { type: 'expense', amount: 300, date: new Date('2026-02-10') }
      ];

      // Oldest and newest tx for availableYears computation
      Transaction.findOne.mockImplementation((query) => {
        return {
          sort: vi.fn().mockResolvedValue({ date: new Date('2025-05-01') })
        };
      });

      Transaction.find.mockResolvedValue(mockTxs);

      await getMonthlySummaries(req, res);

      const response = res.json.mock.calls[0][0];
      expect(response.year).toBe(2026);
      
      // Jan (index 0) should have income 2000, expenses 500, net 1500
      const jan = response.summaries.find(s => s.monthIndex === 0);
      expect(jan.income).toBe(2000);
      expect(jan.expenses).toBe(500);
      expect(jan.net).toBe(1500);

      // Available years should include 2025, 2026
      expect(response.availableYears).toContain(2025);
      expect(response.availableYears).toContain(2026);
    });
  });
});
