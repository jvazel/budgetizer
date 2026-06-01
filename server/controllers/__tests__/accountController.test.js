import { vi, describe, it, expect, beforeEach } from 'vitest';
import { getAccounts, createAccount, deleteAccount } from '../accountController.js';
import Account from '../../models/Account.js';
import Transaction from '../../models/Transaction.js';
import ScheduledTransaction from '../../models/ScheduledTransaction.js';

// Setup mocks for models
vi.mock('../../models/Account.js', () => {
  const mockSave = vi.fn().mockImplementation(function() {
    return Promise.resolve({
      _id: 'new_acc_123',
      name: this.name,
      userId: this.userId,
      order: this.order
    });
  });

  const MockAccount = vi.fn().mockImplementation(function(data) {
    return {
      ...data,
      save: mockSave
    };
  });

  MockAccount.find = vi.fn();
  MockAccount.countDocuments = vi.fn();
  MockAccount.findById = vi.fn();
  MockAccount.findByIdAndUpdate = vi.fn();
  MockAccount.findByIdAndDelete = vi.fn();
  
  return { default: MockAccount };
});

vi.mock('../../models/Transaction.js', () => ({
  default: {
    deleteMany: vi.fn().mockResolvedValue({ deletedCount: 5 })
  }
}));

vi.mock('../../models/ScheduledTransaction.js', () => ({
  default: {
    deleteMany: vi.fn().mockResolvedValue({ deletedCount: 2 })
  }
}));

describe('Account Controller', () => {
  let req, res;

  beforeEach(() => {
    vi.clearAllMocks();
    
    req = {
      user: { id: 'user_999' },
      params: {},
      body: {}
    };

    res = {
      json: vi.fn(),
      status: vi.fn().mockReturnThis(),
      send: vi.fn()
    };
  });

  describe('getAccounts', () => {
    it('should retrieve and return accounts sorted by order/createdAt', async () => {
      const mockAccounts = [
        { name: 'Compte Courant', userId: 'user_999', order: 0 },
        { name: 'Livret A', userId: 'user_999', order: 1 }
      ];

      // Mock find chain
      Account.find.mockReturnValue({
        sort: vi.fn().mockResolvedValue(mockAccounts)
      });

      await getAccounts(req, res);

      expect(Account.find).toHaveBeenCalledWith({ userId: 'user_999' });
      expect(res.json).toHaveBeenCalledWith(mockAccounts);
    });

    it('should handle errors and return 500 status', async () => {
      Account.find.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      await getAccounts(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith('Server Error');
    });
  });

  describe('createAccount', () => {
    it('should create a new account with the order value set to total account count', async () => {
      req.body = {
        name: 'Mon Compte Cash',
        type: 'cash',
        balance: 100
      };

      Account.countDocuments.mockResolvedValue(2); // Two accounts already exist

      await createAccount(req, res);

      expect(Account.countDocuments).toHaveBeenCalledWith({ userId: 'user_999' });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Mon Compte Cash',
        userId: 'user_999',
        order: 2 // Total count was 2, so order is 2
      }));
    });
  });

  describe('deleteAccount', () => {
    it('should delete account and cascade deletions of associated transactions', async () => {
      req.params.id = 'acc_delete_456';
      
      const mockAccountToDelete = {
        _id: 'acc_delete_456',
        userId: { toString: () => 'user_999' },
        name: 'Compte Pro'
      };

      Account.findById.mockResolvedValue(mockAccountToDelete);

      await deleteAccount(req, res);

      expect(Account.findById).toHaveBeenCalledWith('acc_delete_456');
      expect(Account.findByIdAndDelete).toHaveBeenCalledWith('acc_delete_456');
      
      // Cascade checks
      expect(Transaction.deleteMany).toHaveBeenCalled();
      expect(ScheduledTransaction.deleteMany).toHaveBeenCalled();
      
      expect(res.json).toHaveBeenCalledWith({ message: 'Account removed' });
    });

    it('should reject deletion if account is owned by a different user', async () => {
      req.params.id = 'acc_delete_456';
      
      const mockAccountToDelete = {
        _id: 'acc_delete_456',
        userId: { toString: () => 'user_other' }, // different owner
        name: 'Compte Autre'
      };

      Account.findById.mockResolvedValue(mockAccountToDelete);

      await deleteAccount(req, res);

      expect(Account.findById).toHaveBeenCalledWith('acc_delete_456');
      expect(Account.findByIdAndDelete).not.toHaveBeenCalled();
      
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Not authorized' });
    });
  });
});
