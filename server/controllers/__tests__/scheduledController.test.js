import { vi, describe, it, expect, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import {
  getScheduledTransactions,
  getPendingTransactions,
  createScheduledTransaction,
  updateScheduledTransaction,
  deleteScheduledTransaction,
  confirmPendingTransaction,
  skipPendingTransaction,
  getUpcomingTransactions
} from '../scheduledController.js';
import ScheduledTransaction from '../../models/ScheduledTransaction.js';
import Transaction from '../../models/Transaction.js';
import Account from '../../models/Account.js';

// Session mock
const mockSession = {
  startTransaction: vi.fn(),
  commitTransaction: vi.fn(),
  abortTransaction: vi.fn(),
  endSession: vi.fn()
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

// Helper for Mongoose chain mocking
const mockChain = (value) => {
  const obj = {
    populate: vi.fn().mockImplementation(() => obj),
    sort: vi.fn().mockImplementation(() => obj),
    session: vi.fn().mockImplementation(() => obj),
    then: vi.fn().mockImplementation((resolve) => Promise.resolve(value).then(resolve))
  };
  return obj;
};

vi.mock('../../models/ScheduledTransaction.js', () => {
  const mockSave = vi.fn().mockImplementation(function() {
    return Promise.resolve({
      _id: 'st_new_id',
      ...this
    });
  });

  const MockScheduledTransaction = vi.fn().mockImplementation(function(data) {
    return {
      ...data,
      save: mockSave
    };
  });

  MockScheduledTransaction.find = vi.fn();
  MockScheduledTransaction.findById = vi.fn();
  MockScheduledTransaction.findOne = vi.fn();
  MockScheduledTransaction.findByIdAndDelete = vi.fn();

  return { default: MockScheduledTransaction };
});

vi.mock('../../models/Transaction.js', () => ({
  default: {
    find: vi.fn(),
    findOne: vi.fn(),
    deleteMany: vi.fn(),
    findByIdAndDelete: vi.fn().mockResolvedValue({})
  }
}));

vi.mock('../../models/Account.js', () => ({
  default: {
    findById: vi.fn(),
    findOneAndUpdate: vi.fn(),
    updateBalance: async function(accountId, amount, type, session = null) {
      const numericAmount = Number(amount);
      const delta = type === 'expense' ? -numericAmount : numericAmount;
      return await this.findOneAndUpdate({ _id: accountId }, { $inc: { balance: delta } }, { session, new: true });
    }
  }
}));

describe('Scheduled Controller', () => {
  let req, res;

  beforeEach(() => {
    vi.clearAllMocks();

    Transaction.deleteMany.mockReturnValue(mockChain({}));
    ScheduledTransaction.findByIdAndDelete.mockReturnValue(mockChain({}));

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

  describe('getScheduledTransactions', () => {
    it('should retrieve active scheduled transactions sorted by nextDate', async () => {
      const mockSchedules = [
        { _id: 'st1', description: 'Gym', nextDate: new Date('2026-06-05') }
      ];

      ScheduledTransaction.find.mockReturnValue(mockChain(mockSchedules));

      await getScheduledTransactions(req, res);

      expect(ScheduledTransaction.find).toHaveBeenCalledWith({
        userId: 'user_123',
        isActive: true
      });
      expect(res.json).toHaveBeenCalledWith(mockSchedules);
    });
  });

  describe('getPendingTransactions', () => {
    it('should retrieve pending transactions sorted by date', async () => {
      const mockPending = [
        { _id: 'tx1', description: 'Assurance pending', isPending: true }
      ];

      Transaction.find.mockReturnValue(mockChain(mockPending));

      await getPendingTransactions(req, res);

      expect(Transaction.find).toHaveBeenCalledWith({
        userId: 'user_123',
        isPending: true
      });
      expect(res.json).toHaveBeenCalledWith(mockPending);
    });
  });

  describe('createScheduledTransaction', () => {
    it('should create scheduled transaction setting start date and next date', async () => {
      req.body = {
        accountId: 'acc_1',
        type: 'expense',
        amount: 30,
        description: 'Internet',
        frequency: { every: 1, unit: 'month' },
        startDate: '2026-06-01'
      };

      const mockPopulated = { _id: 'st_new_id', ...req.body };
      ScheduledTransaction.findById.mockReturnValue(mockChain(mockPopulated));

      await createScheduledTransaction(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(mockPopulated);
    });
  });

  describe('updateScheduledTransaction', () => {
    it('should update and recalculate nextDate if startDate changes', async () => {
      req.params.id = 'st1';
      req.body = { startDate: '2026-07-01' };

      const mockExisting = {
        _id: 'st1',
        userId: 'user_123',
        startDate: new Date('2026-06-01'),
        nextDate: new Date('2026-06-01'),
        save: vi.fn()
      };

      ScheduledTransaction.findOne.mockResolvedValue(mockExisting);
      ScheduledTransaction.findById.mockReturnValue(mockChain(mockExisting));

      await updateScheduledTransaction(req, res);

      expect(mockExisting.startDate).toEqual(new Date('2026-07-01'));
      expect(mockExisting.nextDate).toEqual(new Date('2026-07-01'));
      expect(mockExisting.save).toHaveBeenCalled();
    });
  });

  describe('deleteScheduledTransaction', () => {
    it('should delete schedule and related pending occurrences in transaction session', async () => {
      req.params.id = 'st1';

      const mockExisting = {
        _id: 'st1',
        userId: 'user_123'
      };

      ScheduledTransaction.findOne.mockResolvedValue(mockExisting);

      await deleteScheduledTransaction(req, res);

      expect(Transaction.deleteMany).toHaveBeenCalledWith({
        scheduledTransactionId: 'st1',
        isPending: true
      });
      expect(ScheduledTransaction.findByIdAndDelete).toHaveBeenCalledWith('st1');
      expect(mockSession.commitTransaction).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ message: expect.stringContaining('removed successfully') });
    });
  });

  describe('confirmPendingTransaction', () => {
    it('should confirm pending transaction, change pending state and deduct from account balance', async () => {
      req.params.id = 'tx1';
      req.body = { amount: 35 }; // optionally updated amount

      const mockTx = {
        _id: 'tx1',
        userId: 'user_123',
        accountId: 'acc_1',
        type: 'expense',
        amount: 30,
        isPending: true,
        save: vi.fn()
      };

      const mockAcc = { _id: 'acc_1', balance: 100, save: vi.fn() };

      Transaction.findOne.mockResolvedValue(mockTx);
      Account.findOneAndUpdate.mockImplementation((filter, update) => {
        if (update && update.$inc && update.$inc.balance !== undefined) {
          mockAcc.balance += update.$inc.balance;
        }
        return mockAcc;
      });

      await confirmPendingTransaction(req, res);

      expect(mockTx.amount).toBe(35);
      expect(mockTx.isPending).toBe(false);
      expect(mockTx.save).toHaveBeenCalled();
      expect(mockAcc.balance).toBe(65); // 100 - 35
      expect(mockSession.commitTransaction).toHaveBeenCalled();
    });

    it('should correctly parse string amounts to avoid MongoDB validation errors', async () => {
      req.params.id = 'tx1';
      req.body = { amount: '45.50' }; // string amount

      const mockTx = {
        _id: 'tx1',
        userId: 'user_123',
        accountId: 'acc_1',
        type: 'income',
        amount: 30,
        isPending: true,
        save: vi.fn()
      };

      const mockAcc = { _id: 'acc_1', balance: 100, save: vi.fn() };

      Transaction.findOne.mockResolvedValue(mockTx);
      Account.findOneAndUpdate.mockImplementation((filter, update) => {
        if (update && update.$inc && update.$inc.balance !== undefined) {
          mockAcc.balance += update.$inc.balance;
        }
        return mockAcc;
      });

      await confirmPendingTransaction(req, res);

      expect(mockTx.amount).toBe('45.50');
      expect(mockAcc.balance).toBe(145.5); // 100 + 45.5
      expect(mockSession.commitTransaction).toHaveBeenCalled();
    });
  });

  describe('skipPendingTransaction', () => {
    it('should delete the pending transaction', async () => {
      req.params.id = 'tx1';

      const mockTx = {
        _id: 'tx1',
        userId: 'user_123',
        isPending: true
      };

      Transaction.findOne.mockResolvedValue(mockTx);

      await skipPendingTransaction(req, res);

      expect(Transaction.findByIdAndDelete).toHaveBeenCalledWith('tx1');
      expect(res.json).toHaveBeenCalledWith({ message: expect.stringContaining('skipped successfully') });
    });
  });

  describe('getUpcomingTransactions', () => {
    it('should project active future schedules within specified days limit', async () => {
      req.query = { days: '15' };

      const mockSchedules = [
        {
          _id: 'st1',
          userId: 'user_123',
          accountId: 'acc_1',
          type: 'expense',
          amount: 20,
          description: 'Abo',
          startDate: new Date(new Date().setDate(new Date().getDate() + 5)),
          nextDate: new Date(new Date().setDate(new Date().getDate() + 5)),
          frequency: { every: 1, unit: 'week' },
          numberOfTimes: 0,
          timesExecuted: 0
        }
      ];

      ScheduledTransaction.find.mockReturnValue(mockChain(mockSchedules));

      await getUpcomingTransactions(req, res);

      const response = res.json.mock.calls[0][0];
      // 15 days limit. Next date is in 5 days. Next occurrence after that is in 12 days.
      // So both occurrences should be in the returned list.
      expect(response.length).toBe(2);
      expect(response[0].description).toBe('Abo');
    });
  });
});
