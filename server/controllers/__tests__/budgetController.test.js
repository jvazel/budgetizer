import { vi, describe, it, expect, beforeEach } from 'vitest';
import { getBudgets, createBudget, deleteBudget } from '../budgetController.js';
import Budget from '../../models/Budget.js';
import Transaction from '../../models/Transaction.js';

vi.mock('../../models/Budget.js', () => {
  const mockSave = vi.fn().mockImplementation(function() {
    return Promise.resolve({
      _id: 'new_budget_123',
      userId: this.userId,
      amount: this.amount,
      period: this.period,
      categoryId: this.categoryId
    });
  });

  const MockBudget = vi.fn().mockImplementation(function(data) {
    return {
      ...data,
      save: mockSave
    };
  });

  MockBudget.find = vi.fn();
  MockBudget.findById = vi.fn();
  MockBudget.findByIdAndDelete = vi.fn();
  
  return { default: MockBudget };
});

vi.mock('../../models/Transaction.js', () => ({
  default: {
    find: vi.fn()
  }
}));

vi.mock('../../models/Account.js', () => ({
  default: {
    find: vi.fn().mockImplementation(() => ({
      select: vi.fn().mockResolvedValue([{ _id: 'acc1' }])
    }))
  }
}));

describe('Budget Controller', () => {
  let req, res;

  beforeEach(() => {
    vi.clearAllMocks();
    
    req = {
      user: { id: 'user_123' },
      query: {},
      params: {},
      body: {}
    };

    res = {
      json: vi.fn(),
      status: vi.fn().mockReturnThis(),
      send: vi.fn()
    };
  });

  describe('getBudgets', () => {
    it('should retrieve budgets, compute spent/remaining amounts', async () => {
      const mockBudgets = [
        {
          _id: 'b1',
          amount: 200,
          period: 'monthly',
          categoryId: { _id: 'cat_food', name: 'Alimentation' },
          toObject: function() { return this; }
        }
      ];

      const mockTransactions = [
        { categoryId: 'cat_food', amount: 50, type: 'expense', date: new Date() },
        { categoryId: 'cat_food', amount: 30, type: 'expense', date: new Date() }
      ];

      // Mock chain for populate
      Budget.find.mockReturnValue({
        populate: vi.fn().mockResolvedValue(mockBudgets)
      });

      Transaction.find.mockResolvedValue(mockTransactions);

      // Request monthly budgets for current month
      req.query = { month: '2026-06' };

      await getBudgets(req, res);

      expect(Budget.find).toHaveBeenCalledWith({ userId: 'user_123' });
      expect(Transaction.find).toHaveBeenCalled();
      
      // spent should be 50 + 30 = 80
      // remaining should be 200 - 80 = 120
      // percentage should be (80 / 200) * 100 = 40%
      expect(res.json).toHaveBeenCalledWith([
        expect.objectContaining({
          _id: 'b1',
          amount: 200,
          spent: 80,
          remaining: 120,
          percentage: 40
        })
      ]);
    });
  });

  describe('deleteBudget', () => {
    it('should allow deletion of own budgets', async () => {
      req.params.id = 'budget_123';
      
      const mockBudget = {
        _id: 'budget_123',
        userId: { toString: () => 'user_123' }
      };

      Budget.findById.mockResolvedValue(mockBudget);

      await deleteBudget(req, res);

      expect(Budget.findByIdAndDelete).toHaveBeenCalledWith('budget_123');
      expect(res.json).toHaveBeenCalledWith({ message: 'Budget removed' });
    });

    it('should reject deletion of other user budgets', async () => {
      req.params.id = 'budget_123';
      
      const mockBudget = {
        _id: 'budget_123',
        userId: { toString: () => 'user_other' }
      };

      Budget.findById.mockResolvedValue(mockBudget);

      await deleteBudget(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Not authorized' });
      expect(Budget.findByIdAndDelete).not.toHaveBeenCalled();
    });
  });
});
