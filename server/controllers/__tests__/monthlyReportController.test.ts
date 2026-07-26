import { vi, describe, it, expect, beforeEach } from 'vitest';
import { getMonthlyReport } from '../monthlyReportController';
import MonthlyReport from '../../models/MonthlyReport';
import Transaction from '../../models/Transaction';
import ScheduledTransaction from '../../models/ScheduledTransaction';
import SavingsGoal from '../../models/SavingsGoal';
import Budget from '../../models/Budget';

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

  MockMonthlyReport.findOne = vi.fn().mockImplementation(() => ({
    lean: vi.fn().mockResolvedValue(null)
  }));
  
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

vi.mock('../../models/Account.js', () => ({
  default: {
    find: vi.fn().mockImplementation(() => ({
      select: vi.fn().mockImplementation(() => ({
        lean: vi.fn().mockResolvedValue([{ _id: 'acc1', type: 'checking' }])
      }))
    }))
  }
}));

// Helper to create Mongoose-like chainable thenable mock queries
const createMockQuery = (data) => {
  const query = {
    select: vi.fn().mockReturnThis(),
    populate: vi.fn().mockReturnThis(),
    sort: vi.fn().mockReturnThis(),
    lean: vi.fn().mockReturnThis(),
    then: (resolve) => resolve(data),
    catch: (_reject) => {}
  };
  return query;
};

describe('Monthly Report Controller', () => {
  let req, res;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSaveReport.mockReset();

    MonthlyReport.findOne.mockImplementation(() => ({
      lean: vi.fn().mockResolvedValue(null)
    }));

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

      MonthlyReport.findOne.mockImplementationOnce(() => ({
        lean: vi.fn().mockResolvedValue(mockCachedReport)
      }));

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

      // Mock transactions for current month M (provisional)
      const mockTxs = [
        { type: 'income', amount: 3000, date: now, accountId: 'acc1' },
        { type: 'expense', amount: 1200, date: now, accountId: 'acc1', categoryId: { _id: 'cat_1', name: 'Alimentation' } }
      ];

      Transaction.find.mockImplementation((query) => {
        if (query.date && query.date.$gte && query.date.$gte.getUTCMonth() === now.getMonth()) {
          // Current month
          return createMockQuery(mockTxs);
        }
        return createMockQuery([]);
      });

      Transaction.findOne.mockResolvedValue(null);
      SavingsGoal.find.mockReturnValue(createMockQuery([]));
      ScheduledTransaction.find.mockReturnValue(createMockQuery([]));
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

      // Mock current month transactions (has a big expense outlier of 350 € in Transports)
      const mockTxs = [
        { 
          _id: 'tx_123',
          type: 'income', 
          amount: 2000, 
          accountId: 'acc1',
          date: new Date(Date.UTC(2026, 4, 15)) 
        },
        { 
          _id: 'tx_456',
          type: 'expense', 
          amount: 350, 
          accountId: 'acc1',
          description: 'Billet de train',
          date: new Date(Date.UTC(2026, 4, 10)), 
          categoryId: { _id: 'cat_transports', name: 'Transports' } 
        }
      ];

      // Mock historical transactions (3-month reference window average for Transports is 40 €)
      const mockHistoryTxs = [
        { type: 'expense', amount: 40, accountId: 'acc1', categoryId: 'cat_transports', date: new Date(Date.UTC(2026, 2, 10)) }
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
      SavingsGoal.find.mockReturnValue(createMockQuery([]));
      ScheduledTransaction.find.mockReturnValue(createMockQuery([]));
      Budget.find.mockReturnValue(createMockQuery([]));

      await getMonthlyReport(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      const responseData = res.json.mock.calls[0][0];
      
      expect(responseData.reportText).toContain('Billet de train');
      expect(responseData.reportText).toContain('Transports');
      expect(responseData.reportText).toContain('350.00');

      expect(responseData.unusualTransactions).toBeDefined();
      expect(responseData.unusualTransactions.length).toBe(1);
      expect(responseData.unusualTransactions[0]).toEqual(expect.objectContaining({
        transactionId: 'tx_456',
        description: 'Billet de train',
        amount: 350,
        categoryName: 'Transports',
        ratio: 8.8
      }));
    });

    it('should detect multiple outlier transactions and sort them by ratio descending', async () => {
      req.params.monthKey = '2026-05';

      // Mock current month transactions: two outliers (amount >= 50 and ratio >= 3)
      const mockTxs = [
        { 
          _id: 'tx_income',
          type: 'income', 
          amount: 2000, 
          accountId: 'acc1',
          date: new Date(Date.UTC(2026, 4, 15)) 
        },
        { 
          _id: 'tx_train',
          type: 'expense', 
          amount: 350, 
          accountId: 'acc1',
          description: 'Billet de train',
          date: new Date(Date.UTC(2026, 4, 10)), 
          categoryId: { _id: 'cat_transports', name: 'Transports' } 
        },
        { 
          _id: 'tx_dinner',
          type: 'expense', 
          amount: 160, 
          accountId: 'acc1',
          description: 'Dîner gastronomique',
          date: new Date(Date.UTC(2026, 4, 12)), 
          categoryId: { _id: 'cat_resto', name: 'Restaurant' } 
        }
      ];

      // Mock historical transactions reference
      const mockHistoryTxs = [
        { type: 'expense', amount: 40, accountId: 'acc1', categoryId: 'cat_transports', date: new Date(Date.UTC(2026, 2, 10)) },
        { type: 'expense', amount: 40, accountId: 'acc1', categoryId: 'cat_resto', date: new Date(Date.UTC(2026, 2, 11)) }
      ];

      Transaction.find.mockImplementation((query) => {
        if (query.date && query.date.$gte) {
          const startMonth = new Date(query.date.$gte).getUTCMonth();
          if (startMonth === 4) {
            return createMockQuery(mockTxs);
          } else if (startMonth === 1) {
            return createMockQuery(mockHistoryTxs);
          }
        }
        return createMockQuery([]);
      });

      Transaction.findOne.mockResolvedValue(null);
      SavingsGoal.find.mockReturnValue(createMockQuery([]));
      ScheduledTransaction.find.mockReturnValue(createMockQuery([]));
      Budget.find.mockReturnValue(createMockQuery([]));

      await getMonthlyReport(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      const responseData = res.json.mock.calls[0][0];

      expect(responseData.unusualTransactions).toBeDefined();
      expect(responseData.unusualTransactions.length).toBe(2);
      
      // Sorted by ratio descending: ratio 8.8 (Billet de train) then ratio 4.0 (Dîner gastronomique)
      expect(responseData.unusualTransactions[0].description).toBe('Billet de train');
      expect(responseData.unusualTransactions[0].ratio).toBe(8.8);
      expect(responseData.unusualTransactions[1].description).toBe('Dîner gastronomique');
      expect(responseData.unusualTransactions[1].ratio).toBe(4.0);
    });

    it('should detect completed savings goals and highlight them in successes paragraph', async () => {
      req.params.monthKey = '2026-05';

      // Current month transactions
      const mockTxs = [
        { type: 'income', amount: 2000, date: new Date(Date.UTC(2026, 4, 15)), accountId: 'acc1' },
        { type: 'expense', amount: 500, date: new Date(Date.UTC(2026, 4, 10)), accountId: 'acc1', categoryId: { _id: 'cat_1', name: 'Loisirs' } }
      ];

      Transaction.find.mockImplementation((query) => {
        if (query.savingsGoalId) {
          if (query.date && query.date.$gt) {
            // Transfers after M
            return createMockQuery([]);
          }
          // Transfers during M (and from M onwards)
          return createMockQuery([
            { type: 'transfer', amount: 300, date: new Date(Date.UTC(2026, 4, 2)), savingsGoalId: 'goal_japon', accountId: 'acc1', toAccountId: 'acc2' }
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

      SavingsGoal.find.mockReturnValue(createMockQuery(mockGoals));
      Transaction.findOne.mockResolvedValue(null);
      ScheduledTransaction.find.mockReturnValue(createMockQuery([]));
      Budget.find.mockReturnValue(createMockQuery([]));

      await getMonthlyReport(req, res);

      const responseData = res.json.mock.calls[0][0];
      expect(responseData.reportText).toContain('Voyage au Japon');
      expect(responseData.reportText).toContain('victoire');
    });

    it('should fallback to transaction note in alert text and data when description is empty', async () => {
      req.params.monthKey = '2026-05';

      // Mock current month transactions (has a big expense outlier of 350 € with empty description but a note)
      const mockTxs = [
        { 
          _id: 'tx_789',
          type: 'expense', 
          amount: 350, 
          accountId: 'acc1',
          description: '',
          note: 'Courses de Noel',
          date: new Date(Date.UTC(2026, 4, 10)), 
          categoryId: { _id: 'cat_courses', name: 'Courses' } 
        }
      ];

      // Mock historical transactions reference
      const mockHistoryTxs = [
        { type: 'expense', amount: 40, accountId: 'acc1', categoryId: 'cat_courses', date: new Date(Date.UTC(2026, 2, 10)) }
      ];

      Transaction.find.mockImplementation((query) => {
        if (query.date && query.date.$gte) {
          const startMonth = new Date(query.date.$gte).getUTCMonth();
          if (startMonth === 4) {
            return createMockQuery(mockTxs);
          } else if (startMonth === 1) {
            return createMockQuery(mockHistoryTxs);
          }
        }
        return createMockQuery([]);
      });

      Transaction.findOne.mockResolvedValue(null);
      SavingsGoal.find.mockReturnValue(createMockQuery([]));
      ScheduledTransaction.find.mockReturnValue(createMockQuery([]));
      Budget.find.mockReturnValue(createMockQuery([]));

      await getMonthlyReport(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      const responseData = res.json.mock.calls[0][0];
      
      expect(responseData.reportText).toContain('Courses de Noel');
      expect(responseData.reportText).not.toContain('sans description');

      expect(responseData.unusualTransactions).toBeDefined();
      expect(responseData.unusualTransactions[0]).toEqual(expect.objectContaining({
        transactionId: 'tx_789',
        description: '',
        note: 'Courses de Noel',
        amount: 350,
        categoryName: 'Courses',
        ratio: 8.8
      }));
    });
  });
});
