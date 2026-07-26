import { vi, describe, it, expect, beforeEach } from 'vitest';
import {
  getSavingsGoals,
  createSavingsGoal,
  updateSavingsGoal,
  deleteSavingsGoal
} from '../savingsGoalController';
import SavingsGoal from '../../models/SavingsGoal';
import Transaction from '../../models/Transaction';

vi.mock('../../models/SavingsGoal.js', () => {
  const mockSave = vi.fn().mockImplementation(function() {
    return Promise.resolve({
      _id: 'g3',
      userId: this.userId,
      name: this.name,
      targetAmount: this.targetAmount,
      targetDate: this.targetDate,
      icon: this.icon,
      color: this.color,
      currentAmount: 0
    });
  });

  const MockSavingsGoal = vi.fn().mockImplementation(function(data) {
    return {
      ...data,
      save: mockSave
    };
  });

  MockSavingsGoal.find = vi.fn();
  MockSavingsGoal.findById = vi.fn();
  MockSavingsGoal.findByIdAndUpdate = vi.fn();
  MockSavingsGoal.findByIdAndDelete = vi.fn();

  return { default: MockSavingsGoal };
});

vi.mock('../../models/Transaction.js', () => ({
  default: {
    updateMany: vi.fn()
  }
}));

vi.mock('express-validator', () => ({
  validationResult: () => ({
    isEmpty: () => true
  })
}));

describe('Savings Goal Controller', () => {
  let req, res;

  beforeEach(() => {
    vi.clearAllMocks();

    req = {
      user: { id: 'user_123' },
      body: {},
      params: {},
      query: {}
    };

    res = {
      json: vi.fn(),
      status: vi.fn().mockReturnThis(),
      send: vi.fn()
    };
  });

  describe('getSavingsGoals', () => {
    it('should return all savings goals for user sorted by targetDate', async () => {
      const mockGoals = [
        { _id: 'g1', name: 'Voiture', targetAmount: 10000, targetDate: new Date('2027-01-01') },
        { _id: 'g2', name: 'Vacances', targetAmount: 2000, targetDate: new Date('2026-08-01') }
      ];

      SavingsGoal.find.mockReturnValue({
        populate: vi.fn().mockReturnThis(),
        sort: vi.fn().mockResolvedValue(mockGoals)
      });

      await getSavingsGoals(req, res);

      expect(SavingsGoal.find).toHaveBeenCalledWith({ userId: 'user_123' });
      expect(res.json).toHaveBeenCalledWith(mockGoals);
    });
  });

  describe('createSavingsGoal', () => {
    it('should create a savings goal with currentAmount initialized to 0', async () => {
      req.body = {
        name: 'Appartement',
        targetAmount: 50000,
        targetDate: '2029-12-31',
        icon: '🏠',
        color: 'green'
      };

      SavingsGoal.findById.mockReturnValue({
        populate: vi.fn().mockResolvedValue({
          _id: 'g3',
          userId: 'user_123',
          name: 'Appartement',
          targetAmount: 50000,
          targetDate: '2029-12-31',
          icon: '🏠',
          color: 'green',
          currentAmount: 0
        })
      });

      await createSavingsGoal(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        _id: 'g3',
        userId: 'user_123',
        name: 'Appartement',
        targetAmount: 50000,
        currentAmount: 0
      }));
    });
  });

  describe('updateSavingsGoal', () => {
    it('should update a savings goal if owner is authorized', async () => {
      req.params.id = 'g1';
      req.body = { name: 'Nouvelle Voiture' };

      const mockExistingGoal = {
        _id: 'g1',
        userId: 'user_123',
        name: 'Voiture',
        targetAmount: 10000
      };

      const mockUpdatedGoal = {
        ...mockExistingGoal,
        name: 'Nouvelle Voiture'
      };

      SavingsGoal.findById.mockResolvedValue(mockExistingGoal);
      SavingsGoal.findByIdAndUpdate.mockReturnValue({
        populate: vi.fn().mockResolvedValue(mockUpdatedGoal)
      });

      await updateSavingsGoal(req, res);

      expect(SavingsGoal.findById).toHaveBeenCalledWith('g1');
      expect(SavingsGoal.findByIdAndUpdate).toHaveBeenCalledWith(
        'g1',
        { $set: req.body },
        { new: true }
      );
      expect(res.json).toHaveBeenCalledWith(mockUpdatedGoal);
    });

    it('should reject update with 401 if user is not authorized', async () => {
      req.params.id = 'g1';
      req.body = { name: 'Nouvelle Voiture' };

      const mockExistingGoal = {
        _id: 'g1',
        userId: 'user_other',
        name: 'Voiture'
      };

      SavingsGoal.findById.mockResolvedValue(mockExistingGoal);

      await updateSavingsGoal(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Not authorized' });
    });
  });

  describe('deleteSavingsGoal', () => {
    it('should delete a savings goal and nullify associated transactions', async () => {
      req.params.id = 'g1';

      const mockExistingGoal = {
        _id: 'g1',
        userId: 'user_123',
        name: 'Voiture'
      };

      SavingsGoal.findById.mockResolvedValue(mockExistingGoal);

      await deleteSavingsGoal(req, res);

      expect(Transaction.updateMany).toHaveBeenCalledWith(
        { savingsGoalId: 'g1' },
        { $set: { savingsGoalId: null } }
      );
      expect(SavingsGoal.findByIdAndDelete).toHaveBeenCalledWith('g1');
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('removed and associated transactions unlinked')
      }));
    });

    it('should reject delete with 401 if user is not authorized', async () => {
      req.params.id = 'g1';

      const mockExistingGoal = {
        _id: 'g1',
        userId: 'user_other',
        name: 'Voiture'
      };

      SavingsGoal.findById.mockResolvedValue(mockExistingGoal);

      await deleteSavingsGoal(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Not authorized' });
    });
  });
});
