import { vi, describe, it, expect, beforeEach } from 'vitest';
import {
  updateProfile,
  updatePassword,
  updatePreferences,
  deleteMyAccount,
  clearMyData
} from '../userController';
import User from '../../models/User';
import Transaction from '../../models/Transaction';
import ScheduledTransaction from '../../models/ScheduledTransaction';
import Budget from '../../models/Budget';
import Category from '../../models/Category';
import Account from '../../models/Account';
import SavedFilter from '../../models/SavedFilter';
import MonthlyReport from '../../models/MonthlyReport';
import UserCredential from '../../models/UserCredential';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

const mockSession = {
  startTransaction: vi.fn(),
  commitTransaction: vi.fn(),
  abortTransaction: vi.fn(),
  endSession: vi.fn()
};

const mockChain = (val) => {
  const obj = {
    session: vi.fn().mockImplementation(() => obj),
    then: vi.fn().mockImplementation((resolve) => Promise.resolve(val).then(resolve))
  };
  return obj;
};

vi.mock('mongoose', async () => {
  const actual = await vi.importActual('mongoose');
  return {
    ...actual,
    default: {
      ...actual.default,
      startSession: vi.fn().mockImplementation(() => Promise.resolve(mockSession))
    }
  };
});

vi.mock('../../models/User.js', () => ({
  default: {
    findById: vi.fn(),
    findOne: vi.fn(),
    findByIdAndDelete: vi.fn().mockImplementation(() => mockChain({}))
  }
}));

vi.mock('../../models/Transaction.js', () => ({
  default: {
    deleteMany: vi.fn().mockImplementation(() => mockChain({}))
  }
}));

vi.mock('../../models/ScheduledTransaction.js', () => ({
  default: {
    deleteMany: vi.fn().mockImplementation(() => mockChain({}))
  }
}));

vi.mock('../../models/Budget.js', () => ({
  default: {
    deleteMany: vi.fn().mockImplementation(() => mockChain({}))
  }
}));

vi.mock('../../models/Category.js', () => ({
  default: {
    deleteMany: vi.fn().mockImplementation(() => mockChain({}))
  }
}));

vi.mock('../../models/Account.js', () => ({
  default: {
    deleteMany: vi.fn().mockImplementation(() => mockChain({}))
  }
}));

vi.mock('../../models/SavedFilter.js', () => ({
  default: {
    deleteMany: vi.fn().mockImplementation(() => mockChain({}))
  }
}));

vi.mock('../../models/MonthlyReport.js', () => ({
  default: {
    deleteMany: vi.fn().mockImplementation(() => mockChain({}))
  }
}));

vi.mock('../../models/UserCredential.js', () => ({
  default: {
    deleteMany: vi.fn().mockImplementation(() => mockChain({}))
  }
}));

vi.mock('bcryptjs', () => ({
  default: {
    compare: vi.fn(),
    genSalt: vi.fn().mockResolvedValue('salt123'),
    hash: vi.fn().mockResolvedValue('new_hashed_password')
  }
}));

vi.mock('express-validator', () => ({
  validationResult: () => ({
    isEmpty: () => true
  })
}));

describe('User Controller', () => {
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

  describe('updateProfile', () => {
    it('should update name and email if no duplicates exist', async () => {
      req.body = { name: 'New Name', email: 'new@email.com' };

      const mockUser = {
        _id: 'user_123',
        name: 'Old Name',
        email: 'old@email.com',
        save: vi.fn().mockResolvedValue(this)
      };

      User.findById.mockResolvedValue(mockUser);
      User.findOne.mockResolvedValue(null); // No email exists

      await updateProfile(req, res);

      expect(User.findById).toHaveBeenCalledWith('user_123');
      expect(User.findOne).toHaveBeenCalledWith({ email: 'new@email.com' });
      expect(mockUser.name).toBe('New Name');
      expect(mockUser.email).toBe('new@email.com');
      expect(mockUser.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        name: 'New Name',
        email: 'new@email.com'
      }));
    });

    it('should return 400 if email is already taken by another user', async () => {
      req.body = { name: 'New Name', email: 'taken@email.com' };

      const mockUser = {
        _id: 'user_123',
        name: 'Old Name',
        email: 'old@email.com'
      };

      User.findById.mockResolvedValue(mockUser);
      User.findOne.mockResolvedValue({ _id: 'user_other' });

      await updateProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Cet email est déjà utilisé' });
    });
  });

  describe('updatePassword', () => {
    it('should hash and save new password if old password matches', async () => {
      req.body = { oldPassword: 'old_plain_password', newPassword: 'new_plain_password' };

      const mockUser = {
        _id: 'user_123',
        password: 'hashed_old_password',
        save: vi.fn()
      };

      User.findById.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true); // passwords match

      await updatePassword(req, res);

      expect(bcrypt.compare).toHaveBeenCalledWith('old_plain_password', 'hashed_old_password');
      expect(bcrypt.genSalt).toHaveBeenCalledWith(10);
      expect(bcrypt.hash).toHaveBeenCalledWith('new_plain_password', 'salt123');
      expect(mockUser.password).toBe('new_hashed_password');
      expect(mockUser.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ message: 'Mot de passe modifié avec succès' });
    });

    it('should return 400 if old password does not match', async () => {
      req.body = { oldPassword: 'wrong_password', newPassword: 'new_plain_password' };

      const mockUser = {
        _id: 'user_123',
        password: 'hashed_old_password'
      };

      User.findById.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(false);

      await updatePassword(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: expect.stringContaining('incorrect') });
    });
  });

  describe('updatePreferences', () => {
    it('should update theme and specific alerts thresholds', async () => {
      req.body = {
        theme: 'light',
        anomalyThreshold: 45,
        currency: { code: 'USD', symbol: '$' }
      };

      const mockUser = {
        _id: 'user_123',
        currency: { code: 'EUR', symbol: '€' },
        preferences: {
          theme: 'dark',
          anomalyThreshold: 30
        },
        save: vi.fn()
      };

      User.findById.mockResolvedValue(mockUser);

      await updatePreferences(req, res);

      expect(mockUser.preferences.theme).toBe('light');
      expect(mockUser.preferences.anomalyThreshold).toBe(45);
      expect(mockUser.currency.code).toBe('USD');
      expect(mockUser.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        preferences: expect.objectContaining({
          theme: 'light',
          anomalyThreshold: 45
        })
      }));
    });
  });

  describe('deleteMyAccount', () => {
    it('should delete user and all financial models in cascade', async () => {
      await deleteMyAccount(req, res);

      expect(Transaction.deleteMany).toHaveBeenCalledWith({ userId: 'user_123' });
      expect(ScheduledTransaction.deleteMany).toHaveBeenCalledWith({ userId: 'user_123' });
      expect(Budget.deleteMany).toHaveBeenCalledWith({ userId: 'user_123' });
      expect(Category.deleteMany).toHaveBeenCalledWith({ userId: 'user_123' });
      expect(Account.deleteMany).toHaveBeenCalledWith({ userId: 'user_123' });
      expect(SavedFilter.deleteMany).toHaveBeenCalledWith({ userId: 'user_123' });
      expect(MonthlyReport.deleteMany).toHaveBeenCalledWith({ userId: 'user_123' });
      expect(UserCredential.deleteMany).toHaveBeenCalledWith({ userId: 'user_123' });
      expect(User.findByIdAndDelete).toHaveBeenCalledWith('user_123');
      expect(res.json).toHaveBeenCalledWith({ message: expect.stringContaining('cascade') });
    });
  });

  describe('clearMyData', () => {
    it('should delete financial data but retain the user profile', async () => {
      await clearMyData(req, res);

      expect(Transaction.deleteMany).toHaveBeenCalledWith({ userId: 'user_123' });
      expect(ScheduledTransaction.deleteMany).toHaveBeenCalledWith({ userId: 'user_123' });
      expect(Budget.deleteMany).toHaveBeenCalledWith({ userId: 'user_123' });
      expect(Category.deleteMany).toHaveBeenCalledWith({ userId: 'user_123' });
      expect(Account.deleteMany).toHaveBeenCalledWith({ userId: 'user_123' });
      expect(SavedFilter.deleteMany).toHaveBeenCalledWith({ userId: 'user_123' });
      expect(MonthlyReport.deleteMany).toHaveBeenCalledWith({ userId: 'user_123' });
      expect(UserCredential.deleteMany).toHaveBeenCalledWith({ userId: 'user_123' });
      expect(User.findByIdAndDelete).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ message: expect.stringContaining('financières ont été effacées') });
    });
  });
});
