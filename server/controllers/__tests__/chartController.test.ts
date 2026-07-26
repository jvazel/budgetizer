import { vi, describe, it, expect, beforeEach } from 'vitest';
import { getChartsByCategory, getForecastCharts, getTagChartsData, getWaterfallData, getHistogramData, getNetWorthHistory, getCashFlowHistory } from '../chartController';
import Category from '../../models/Category';
import Transaction from '../../models/Transaction';
import Account from '../../models/Account';
import Tag from '../../models/Tag';

vi.mock('../../models/Category.js', () => ({
  default: {
    find: vi.fn()
  }
}));

vi.mock('../../models/Transaction.js', () => ({
  default: {
    find: vi.fn()
  }
}));

vi.mock('../../models/Account.js', () => ({
  default: {
    find: vi.fn()
  }
}));

vi.mock('../../models/Tag.js', () => ({
  default: {
    find: vi.fn()
  }
}));

describe('Chart Controller', () => {
  let req, res;

  beforeEach(() => {
    vi.clearAllMocks();
    
    req = {
      user: { id: 'user_123' },
      query: {},
      params: {}
    };

    res = {
      json: vi.fn(),
      status: vi.fn().mockReturnThis(),
      send: vi.fn()
    };
  });

  const mockQuery = (resolvedValue) => {
    const query = {
      select: vi.fn().mockReturnThis(),
      populate: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      lean: vi.fn().mockReturnThis(),
      then: vi.fn().mockImplementation((resolve) => resolve(resolvedValue))
    };
    return query;
  };

  describe('getChartsByCategory', () => {
    it('should aggregate transactions by category and calculate percentages', async () => {
      req.query = {
        startDate: '2026-06-01',
        endDate: '2026-06-30',
        type: 'expense'
      };

      const mockCategories = [
        { _id: 'cat_food', name: 'Alimentation', icon: '🍔', color: 'orange' },
        { _id: 'cat_rent', name: 'Loyer', icon: '🏠', color: 'blue' }
      ];

      const mockTransactions = [
        { categoryId: 'cat_food', amount: 150, type: 'expense', date: new Date('2026-06-05') },
        { categoryId: 'cat_food', amount: 50, type: 'expense', date: new Date('2026-06-10') },
        { categoryId: 'cat_rent', amount: 800, type: 'expense', date: new Date('2026-06-01') }
      ];

      Category.find.mockImplementation(() => mockQuery(mockCategories));
      Transaction.find.mockImplementationOnce(() => mockQuery(mockTransactions)); // current period
      Transaction.find.mockImplementationOnce(() => mockQuery([])); // previous period (variation computation)
      Transaction.find.mockImplementation(() => mockQuery([])); // 3M and 6M completed months

      await getChartsByCategory(req, res);

      // Total is 150 + 50 + 800 = 1000
      // Food should be 200 (20%)
      // Rent should be 800 (80%)
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        total: 1000,
        categories: [
          expect.objectContaining({ categoryId: 'cat_rent', amount: 800, percentage: 80 }),
          expect.objectContaining({ categoryId: 'cat_food', amount: 200, percentage: 20 })
        ]
      }));
    });
  });

  describe('getForecastCharts', () => {
    it('should calculate future cash projection using simple mean or linear regression', async () => {
      req.query = {
        months: '3',
        method: 'regression'
      };

      const mockAccounts = [
        { _id: 'acc1', balance: 2000 }
      ];

      // 12 historical months of data
      const mockHistoryTransactions = [
        { amount: 1000, type: 'income', date: new Date('2026-01-05') },
        { amount: 800, type: 'expense', date: new Date('2026-01-10') } // Net margin = +200 every month
      ];

      Account.find.mockImplementation(() => mockQuery(mockAccounts));
      Transaction.find.mockImplementation(() => mockQuery(mockHistoryTransactions));

      await getForecastCharts(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        method: 'regression',
        historicalData: expect.any(Array),
        forecast: expect.any(Array)
      }));
      
      const responseData = res.json.mock.calls[0][0];
      // Should have projected 3 months of data
      expect(responseData.forecast.length).toBe(3);
    });

    it('should anchor projection when endDate is provided', async () => {
      req.query = {
        months: '3',
        method: 'regression',
        endDate: '2026-05-15'
      };

      const mockAccounts = [
        { _id: 'acc1', balance: 2000 }
      ];

      Account.find.mockImplementation(() => mockQuery(mockAccounts));
      Transaction.find.mockImplementation(() => mockQuery([]));

      await getForecastCharts(req, res);

      expect(Transaction.find).toHaveBeenCalledWith(expect.objectContaining({
        date: expect.objectContaining({
          $lte: new Date('2026-05-15')
        })
      }));
    });
  });

  describe('getTagChartsData', () => {
    it('should aggregate tags comparison and Drilldown charts correctly', async () => {
      req.query = {
        startDate: '2026-06-01',
        endDate: '2026-06-30',
        tagId: 'tag_1',
        type: 'expense'
      };

      const mockTags = [
        { _id: 'tag_1', name: 'Vacances', color: 'blue' },
        { _id: 'tag_2', name: 'Perso', color: 'green' }
      ];

      const mockCategories = [
        { _id: 'cat_food', name: 'Alimentation', icon: '🍔', color: 'orange' }
      ];

      const mockTransactions = [
        // Transaction containing both tags
        { 
          categoryId: 'cat_food', 
          amount: 50, 
          type: 'expense', 
          date: new Date('2026-06-05'),
          tags: ['tag_1', 'tag_2']
        },
        // Transaction containing only tag_1
        { 
          categoryId: 'cat_food', 
          amount: 100, 
          type: 'expense', 
          date: new Date('2026-06-15'),
          tags: ['tag_1']
        }
      ];

      Tag.find.mockImplementation(() => mockQuery(mockTags));
      Category.find.mockImplementation(() => mockQuery(mockCategories));
      Transaction.find.mockImplementation(() => mockQuery(mockTransactions));

      await getTagChartsData(req, res);

      expect(Tag.find).toHaveBeenCalledWith({ userId: 'user_123' });
      expect(Transaction.find).toHaveBeenCalled();

      // Vacances has 50 + 100 = 150
      // Perso has 50
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        tagsComparison: [
          expect.objectContaining({ name: 'Vacances', amount: 150 }),
          expect.objectContaining({ name: 'Perso', amount: 50 })
        ],
        categoryBreakdown: [
          expect.objectContaining({ name: 'Alimentation', amount: 150 })
        ],
        cumulativeEvolution: [
          expect.objectContaining({ cumulative: 50, amount: 50 }),
          expect.objectContaining({ cumulative: 150, amount: 100 })
        ]
      }));
    });
  });

  describe('getWaterfallData', () => {
    it('should aggregate income and expenses by parent category and calculate net savings', async () => {
      req.query = {
        startDate: '2026-06-01',
        endDate: '2026-06-30'
      };

      const mockCategories = [
        { _id: 'cat_food', name: 'Alimentation', icon: '🍔', color: 'orange' },
        { _id: 'cat_rent', name: 'Loyer', icon: '🏠', color: 'blue' }
      ];

      const mockTransactions = [
        { categoryId: 'cat_food', amount: 150, type: 'expense', date: new Date('2026-06-05') },
        { categoryId: 'cat_rent', amount: 850, type: 'expense', date: new Date('2026-06-01') },
        { amount: 3000, type: 'income', date: new Date('2026-06-10') }
      ];

      Category.find.mockImplementation(() => mockQuery(mockCategories));
      Transaction.find.mockImplementation(() => mockQuery(mockTransactions));

      await getWaterfallData(req, res);

      expect(res.json).toHaveBeenCalledWith({
        totalIncome: 3000,
        totalExpenses: 1000,
        netSavings: 2000,
        categories: [
          expect.objectContaining({ categoryId: 'cat_rent', amount: 850 }),
          expect.objectContaining({ categoryId: 'cat_food', amount: 150 })
        ]
      });
    });

    it('should aggregate subcategory transactions under their parent category', async () => {
      req.query = {
        startDate: '2026-06-01',
        endDate: '2026-06-30'
      };

      const mockCategories = [
        { _id: 'cat_food', name: 'Alimentation', icon: '🍔', color: 'orange' },
        { _id: 'sub_rest', name: 'Resto', icon: '🍷', color: 'orange', parentId: 'cat_food' }
      ];

      const mockTransactions = [
        { categoryId: 'cat_food', amount: 100, type: 'expense', date: new Date('2026-06-05') },
        { categoryId: 'sub_rest', amount: 50, type: 'expense', date: new Date('2026-06-06') }
      ];

      Category.find.mockImplementation(() => mockQuery(mockCategories));
      Transaction.find.mockImplementation(() => mockQuery(mockTransactions));

      await getWaterfallData(req, res);

      expect(res.json).toHaveBeenCalledWith({
        totalIncome: 0,
        totalExpenses: 150,
        netSavings: -150,
        categories: [
          expect.objectContaining({ categoryId: 'cat_food', amount: 150 })
        ]
      });
    });
  });

  describe('getHistogramData', () => {
    it('should aggregate income, expenses and transfers in buckets', async () => {
      req.query = {
        startDate: '2026-06-01',
        endDate: '2026-06-03',
        groupBy: 'day'
      };

      const mockTransactions = [
        { type: 'income', amount: 1000, date: new Date('2026-06-01') },
        { type: 'expense', amount: 300, date: new Date('2026-06-02') },
        { type: 'transfer', amount: 150, date: new Date('2026-06-02'), toAccountId: { type: 'credit', _id: 'acc_credit' } }
      ];

      Transaction.find.mockImplementation(() => mockQuery(mockTransactions));

      await getHistogramData(req, res);

      expect(Transaction.find).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'user_123'
      }));

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        groupBy: 'day',
        metrics: expect.objectContaining({
          totalIncome: 1000,
          totalExpenses: 450, // 300 expense + 150 transfer to credit card
          netSavings: 550
        })
      }));
    });

    it('should filter correctly when accountId is specified (handling populated objects)', async () => {
      req.query = {
        startDate: '2026-06-01',
        endDate: '2026-06-03',
        accountId: 'acc_checking',
        groupBy: 'day'
      };

      const mockTransactions = [
        // Income to checking
        { 
          type: 'income', 
          amount: 2000, 
          date: new Date('2026-06-01'),
          accountId: { _id: 'acc_checking', type: 'checking' }
        },
        // Expense from checking
        { 
          type: 'expense', 
          amount: 500, 
          date: new Date('2026-06-02'),
          accountId: { _id: 'acc_checking', type: 'checking' }
        },
        // Expense from another account (should be ignored for checking stats)
        { 
          type: 'expense', 
          amount: 100, 
          date: new Date('2026-06-02'),
          accountId: { _id: 'acc_savings', type: 'savings' }
        },
        // Transfer from checking to savings
        { 
          type: 'transfer', 
          amount: 300, 
          date: new Date('2026-06-03'),
          accountId: { _id: 'acc_checking', type: 'checking' },
          toAccountId: { _id: 'acc_savings', type: 'savings' }
        }
      ];

      Transaction.find.mockImplementation(() => mockQuery(mockTransactions));

      await getHistogramData(req, res);

      // Verify the query checks $or conditions
      expect(Transaction.find).toHaveBeenCalledWith(expect.objectContaining({
        $or: [
          { accountId: 'acc_checking' },
          { toAccountId: 'acc_checking' }
        ]
      }));

      // When accountId = acc_checking:
      // - income is 2000 (checking is From)
      // - expense is 500 (checking is From) + 300 transfer (checking is From) = 800
      // - savings expense (100) is ignored because isFrom is false (acc_savings !== acc_checking) and isTo is false
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        metrics: expect.objectContaining({
          totalIncome: 2000,
          totalExpenses: 800,
          netSavings: 1200
        })
      }));
    });
  });

  describe('getNetWorthHistory', () => {
    it('should calculate net worth history and reverse balances correctly', async () => {
      req.query = {
        days: '5'
      };

      const mockAccounts = [
        { _id: 'acc1', balance: 1000, type: 'checking', includeInTotal: true },
        { _id: 'acc2', balance: 500, type: 'savings', includeInTotal: true }
      ];

      const mockTransactions = [
        { accountId: 'acc1', amount: 100, type: 'expense', date: new Date() }
      ];

      Account.find.mockImplementation(() => mockQuery(mockAccounts));
      Transaction.find.mockImplementation(() => mockQuery(mockTransactions));

      await getNetWorthHistory(req, res);

      expect(res.json).toHaveBeenCalled();
      const history = res.json.mock.calls[0][0];
      expect(history.length).toBe(6); // 5 days + today
      // The last day (today) should match initial balances: 1000 + 500 = 1500
      expect(history[5].netWorth).toBe(1500);
    });

    it('should anchor net worth history when endDate is provided', async () => {
      req.query = {
        days: '5',
        endDate: '2026-05-10'
      };

      Account.find.mockImplementation(() => mockQuery([]));
      Transaction.find.mockImplementation(() => mockQuery([]));

      await getNetWorthHistory(req, res);

      expect(Transaction.find).toHaveBeenCalledWith(expect.objectContaining({
        date: expect.objectContaining({
          $lte: new Date('2026-05-10')
        })
      }));
    });
  });

  describe('getCashFlowHistory', () => {
    it('should aggregate income and expenses into monthly cash flow buckets', async () => {
      req.query = {
        months: '3'
      };

      const mockTransactions = [
        { amount: 1200, type: 'income', date: new Date() },
        { amount: 400, type: 'expense', date: new Date() }
      ];

      Transaction.find.mockImplementation(() => mockQuery(mockTransactions));

      await getCashFlowHistory(req, res);

      expect(res.json).toHaveBeenCalled();
      const result = res.json.mock.calls[0][0];
      expect(result.history.length).toBe(3);
      expect(result.metrics.totalIncome).toBe(1200);
      expect(result.metrics.totalExpenses).toBe(400);
      expect(result.metrics.netSavings).toBe(800);
    });

    it('should anchor cash flow history when endDate is provided', async () => {
      req.query = {
        months: '3',
        endDate: '2026-05-15'
      };

      Transaction.find.mockImplementation(() => mockQuery([]));

      await getCashFlowHistory(req, res);

      expect(Transaction.find).toHaveBeenCalledWith(expect.objectContaining({
        date: expect.objectContaining({
          $lte: new Date('2026-05-15')
        })
      }));
    });
  });
});

