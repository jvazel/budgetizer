import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getInsights } from '../insightController';
import Transaction from '../../models/Transaction';
import ScheduledTransaction from '../../models/ScheduledTransaction';

vi.mock('../../models/Transaction.js', () => ({
  default: {
    findOne: vi.fn(),
    find: vi.fn(),
    aggregate: vi.fn()
  }
}));

vi.mock('../../models/ScheduledTransaction.js', () => ({
  default: {
    find: vi.fn().mockImplementation(() => ({
      lean: vi.fn().mockResolvedValue([])
    }))
  }
}));

vi.mock('../../models/Account.js', () => ({
  default: {
    find: vi.fn().mockImplementation(() => ({
      select: vi.fn().mockImplementation(() => ({
        lean: vi.fn().mockResolvedValue([{ _id: 'acc1' }])
      }))
    }))
  }
}));

describe('Insight Controller', () => {
  let req, res;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-05T00:00:00.000Z'));

    req = {
      user: {
        id: 'user_123',
        preferences: {
          anomalyThreshold: 30
        }
      },
      query: {},
      params: {}
    };

    res = {
      json: vi.fn(),
      status: vi.fn().mockReturnThis(),
      send: vi.fn()
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return empty lists and a message if no transactions are found', async () => {
    Transaction.findOne.mockReturnValue({
      sort: vi.fn().mockImplementation(() => ({
        lean: vi.fn().mockResolvedValue(null)
      }))
    });

    await getInsights(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      anomalies: [],
      suggestions: [],
      message: 'Aucune donnée de transaction trouvée.'
    });
  });

  it('should return a message if history is less than 2 full months', async () => {
    const mockOldestTx = { date: new Date('2026-05-15') };
    Transaction.findOne.mockReturnValue({
      sort: vi.fn().mockImplementation(() => ({
        lean: vi.fn().mockResolvedValue(mockOldestTx)
      }))
    });

    await getInsights(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      anomalies: [],
      suggestions: [],
      message: expect.stringContaining('Pas assez d\'historique')
    }));
  });

  it('should calculate anomalies and suggestions when history is sufficient', async () => {
    const mockOldestTx = { date: new Date('2026-01-10') };
    Transaction.findOne.mockReturnValue({
      sort: vi.fn().mockImplementation(() => ({
        lean: vi.fn().mockResolvedValue(mockOldestTx)
      }))
    });

    const mockCategoryFood = { _id: 'cat_food', name: 'Alimentation', icon: '🍔', color: 'orange' };
    const mockCategoryRent = { _id: 'cat_rent', name: 'Loyer', icon: '🏠', color: 'blue' };

    let aggregateCallCount = 0;
    Transaction.aggregate.mockImplementation((_pipeline) => {
      const isFirst = aggregateCallCount === 0;
      aggregateCallCount++;
      if (isFirst) {
        // historyAggregated
        return Promise.resolve([
          {
            _id: 'cat_food',
            total: 300,
            months: ['2026-04', '2026-05'],
            hasSubscription: false,
            categoryInfo: mockCategoryFood
          },
          {
            _id: 'cat_rent',
            total: 3000,
            months: ['2026-04', '2026-05'],
            hasSubscription: false,
            categoryInfo: mockCategoryRent
          }
        ]);
      } else {
        // currentMonthAggregated
        return Promise.resolve([
          {
            _id: 'cat_food',
            totalAmount: 250,
            hasSubscription: false
          }
        ]);
      }
    });

    ScheduledTransaction.find.mockReturnValue({
      lean: vi.fn().mockResolvedValue([])
    });

    await getInsights(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      anomalies: expect.any(Array),
      suggestions: expect.any(Array)
    }));

    const response = res.json.mock.calls[0][0];

    expect(response.anomalies.length).toBe(1);
    expect(response.anomalies[0]).toEqual(expect.objectContaining({
      name: 'Alimentation',
      severity: 'red',
      differencePercentage: 150
    }));

    expect(response.suggestions.length).toBe(2);
    expect(response.suggestions[0].name).toBe('Loyer');
    expect(response.suggestions[0].savings10).toBe(1200);
    expect(response.suggestions[1].name).toBe('Alimentation');
  });

  it('should handle custom anomaly threshold from query parameters', async () => {
    const mockOldestTx = { date: new Date('2026-01-10') };
    Transaction.findOne.mockReturnValue({
      sort: vi.fn().mockImplementation(() => ({
        lean: vi.fn().mockResolvedValue(mockOldestTx)
      }))
    });

    req.query.threshold = '50';

    const mockCategoryFood = { _id: 'cat_food', name: 'Alimentation', icon: '🍔', color: 'orange' };

    let aggregateCallCount = 0;
    Transaction.aggregate.mockImplementation((_pipeline) => {
      const isFirst = aggregateCallCount === 0;
      aggregateCallCount++;
      if (isFirst) {
        return Promise.resolve([
          {
            _id: 'cat_food',
            total: 300,
            months: ['2026-04', '2026-05'],
            hasSubscription: false,
            categoryInfo: mockCategoryFood
          }
        ]);
      } else {
        return Promise.resolve([
          {
            _id: 'cat_food',
            totalAmount: 140,
            hasSubscription: false
          }
        ]);
      }
    });

    ScheduledTransaction.find.mockReturnValue({
      lean: vi.fn().mockResolvedValue([])
    });

    await getInsights(req, res);

    const response = res.json.mock.calls[0][0];
    expect(response.anomalies.length).toBe(0);
  });
});
