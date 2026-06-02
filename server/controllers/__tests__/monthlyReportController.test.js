import { vi, describe, it, expect, beforeEach } from 'vitest';
import { getMonthlyReport } from '../monthlyReportController.js';
import MonthlyReport from '../../models/MonthlyReport.js';
import Transaction from '../../models/Transaction.js';
import ScheduledTransaction from '../../models/ScheduledTransaction.js';
import SavingsGoal from '../../models/SavingsGoal.js';
import Budget from '../../models/Budget.js';

// Setup Mock for Save function on MonthlyReport
const mockSaveReport = vi.fn();

vi.mock('../../models/MonthlyReport.js', () => {
  const MockMonthlyReport = vi.fn().mockImplementation(function(data) {
    return {
      ...data,
      save: () => mockSaveReport(data),
      toObject: function() { return this; }
    };
  });

  MockMonthlyReport.findOne = vi.fn();
  
  return { default: MockMonthlyReport };
});

vi.mock('../../models/Transaction.js', () => ({
  default: {
    find: vi.fn(),
    findOne: vi.fn()
  }
}));

vi.mock('../../models/ScheduledTransaction.js', () => ({
  default: {
    find: vi.fn()
  }
}));

vi.mock('../../models/SavingsGoal.js', () => ({
  default: {
    find: vi.fn()
  }
}));

vi.mock('../../models/Budget.js', () => ({
  default: {
    find: vi.fn()
  }
}));

// Helper to create Mongoose-like chainable thenable mock queries
const createMockQuery = (data) => {
  const query = {
    select: vi.fn().mockReturnThis(),
    populate: vi.fn().mockReturnThis(),
    sort: vi.fn().mockReturnThis(),
    then: (resolve) => resolve(data),
    catch: (reject) => {}
  };
  return query;
};

describe('Monthly Report Controller', () => {
  let req, res;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSaveReport.mockReset();

    req = {
      user: { id: 'user_reports_123' },
      params: { monthKey: '2026-05' },
      query: {}
    };

    res = {
      json: vi.fn(),
      status: vi.fn().mockReturnThis(),
      send: vi.fn()
    };
  });

  describe('getMonthlyReport', () => {
    it('should return 400 if monthKey is in an invalid format', async () => {
      req.params.monthKey = 'invalid-date';

      await getMonthlyReport(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Format de mois invalide. Attendu: YYYY-MM' });
    });

    it('should return a cached report if it exists for a completed month', async () => {
      const mockCachedReport = {
        userId: 'user_reports_123',
        monthKey: '2026-05',
        reportText: 'Cached report text',
        financialStats: { income: 2000, expenses: 1500, net: 500, savingsRate: 25 },
        toObject: function() { return this; }
      };

      MonthlyReport.findOne.mockResolvedValue(mockCachedReport);

      await getMonthlyReport(req, res);

      expect(MonthlyReport.findOne).toHaveBeenCalledWith({ userId: 'user_reports_123', monthKey: '2026-05' });
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        monthKey: '2026-05',
        reportText: 'Cached report text',
        isProvisional: false
      }));
    });

    it('should calculate and return a provisional report for the current month without saving in DB', async () => {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonthStr = String(now.getMonth() + 1).padStart(2, '0');
      const currentMonthKey = `${currentYear}-${currentMonthStr}`;

      req.params.monthKey = currentMonthKey;
      MonthlyReport.findOne.mockResolvedValue(null);

      // Mock transactions for current month M (provisional)
      const mockTxs = [
        { type: 'income', amount: 3000, date: now },
        { type: 'expense', amount: 1200, date: now, categoryId: { _id: 'cat_1', name: 'Alimentation' } }
      ];

      Transaction.find.mockImplementation((query) => {
        if (query.date && query.date.$gte && query.date.$gte.getUTCMonth() === now.getMonth()) {
          // Current month
          return createMockQuery(mockTxs);
        }
        return createMockQuery([]);
      });

      Transaction.findOne.mockResolvedValue(null);
      SavingsGoal.find.mockResolvedValue([]);
      ScheduledTransaction.find.mockResolvedValue([]);
      Budget.find.mockReturnValue(createMockQuery([]));

      await getMonthlyReport(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        monthKey: currentMonthKey,
        isProvisional: true,
        financialStats: expect.objectContaining({
          income: 3000,
          expenses: 1200,
          net: 1800,
          savingsRate: 60
        })
      }));
      expect(mockSaveReport).not.toHaveBeenCalled();
    });

    it('should detect outlier transactions and add them to warnings paragraph', async () => {
      req.params.monthKey = '2026-05';
      MonthlyReport.findOne.mockResolvedValue(null);

      // Mock current month transactions (has a big expense outlier of 350 € in Transports)
      const mockTxs = [
        { type: 'income', amount: 2000, date: new Date(Date.UTC(2026, 4, 15)) },
        { 
          type: 'expense', 
          amount: 350, 
          description: 'Billet de train',
          date: new Date(Date.UTC(2026, 4, 10)), 
          categoryId: { _id: 'cat_transports', name: 'Transports' } 
        }
      ];

      // Mock historical transactions (3-month reference window average for Transports is 40 €)
      const mockHistoryTxs = [
        { type: 'expense', amount: 40, categoryId: 'cat_transports', date: new Date(Date.UTC(2026, 2, 10)) }
      ];

      Transaction.find.mockImplementation((query) => {
        if (query.date && query.date.$gte) {
          const startMonth = new Date(query.date.$gte).getUTCMonth();
          if (startMonth === 4) {
            // Month M (May)
            return createMockQuery(mockTxs);
          } else if (startMonth === 1) {
            // History (M-4 starts in Jan, month index 0 or 1 depending on calculations)
            return createMockQuery(mockHistoryTxs);
          }
        }
        return createMockQuery([]);
      });

      Transaction.findOne.mockResolvedValue(null);
      SavingsGoal.find.mockResolvedValue([]);
      ScheduledTransaction.find.mockResolvedValue([]);
      Budget.find.mockReturnValue(createMockQuery([]));

      await getMonthlyReport(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      const responseData = res.json.mock.calls[0][0];
      
      expect(responseData.reportText).toContain('Billet de train');
      expect(responseData.reportText).toContain('Transports');
      expect(responseData.reportText).toContain('350.00');
    });

    it('should detect completed savings goals and highlight them in successes paragraph', async () => {
      req.params.monthKey = '2026-05';
      MonthlyReport.findOne.mockResolvedValue(null);

      // Current month transactions
      const mockTxs = [
        { type: 'income', amount: 2000, date: new Date(Date.UTC(2026, 4, 15)) },
        { type: 'expense', amount: 500, date: new Date(Date.UTC(2026, 4, 10)), categoryId: { _id: 'cat_1', name: 'Loisirs' } }
      ];

      Transaction.find.mockImplementation((query) => {
        if (query.savingsGoalId) {
          if (query.date && query.date.$gt) {
            // Transfers after M
            return createMockQuery([]);
          }
          // Transfers during M (and from M onwards)
          return createMockQuery([
            { type: 'transfer', amount: 300, date: new Date(Date.UTC(2026, 4, 2)), savingsGoalId: 'goal_japon' }
          ]);
        }
        if (query.date && query.date.$gte) {
          const startMonth = new Date(query.date.$gte).getUTCMonth();
          if (startMonth === 4) {
            return createMockQuery(mockTxs);
          }
        }
        return createMockQuery([]);
      });

      // Mock savings goals: one completed this month
      const mockGoals = [
        {
          _id: 'goal_japon',
          name: 'Voyage au Japon',
          targetAmount: 1000,
          currentAmount: 1100, // completed now
        }
      ];

      SavingsGoal.find.mockResolvedValue(mockGoals);
      Transaction.findOne.mockResolvedValue(null);
      ScheduledTransaction.find.mockResolvedValue([]);
      Budget.find.mockReturnValue(createMockQuery([]));

      await getMonthlyReport(req, res);

      const responseData = res.json.mock.calls[0][0];
      expect(responseData.reportText).toContain('Voyage au Japon');
      expect(responseData.reportText).toContain('victoire');
    });
  });
});
