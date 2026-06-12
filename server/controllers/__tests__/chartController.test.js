import { vi, describe, it, expect, beforeEach } from 'vitest';
import { getChartsByCategory, getForecastCharts, getTagChartsData } from '../chartController.js';
import Category from '../../models/Category.js';
import Transaction from '../../models/Transaction.js';
import Account from '../../models/Account.js';
import Tag from '../../models/Tag.js';

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
});
