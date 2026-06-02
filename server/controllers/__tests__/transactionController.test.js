import { vi, describe, it, expect, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import {
  getTransactions,
  createTransaction,
  deleteTransaction,
  updateTransaction,
  getCalendarTransactions,
  exportTransactions,
  importTransactions
} from '../transactionController.js';
import Transaction from '../../models/Transaction.js';
import Account from '../../models/Account.js';
import Category from '../../models/Category.js';
import SavingsGoal from '../../models/SavingsGoal.js';
import ScheduledTransaction from '../../models/ScheduledTransaction.js';

// Mongoose session mock
const mockSession = {
  startTransaction: vi.fn(),
  commitTransaction: vi.fn(),
  abortTransaction: vi.fn(),
  endSession: vi.fn()
};

vi.mock('mongoose', () => ({
  default: {
    startSession: vi.fn().mockImplementation(() => Promise.resolve(mockSession))
  }
}));

// Helper for Mongoose chain mocking
const mockChain = (value) => {
  const obj = {
    populate: vi.fn().mockImplementation(() => obj),
    sort: vi.fn().mockImplementation(() => obj),
    skip: vi.fn().mockImplementation(() => obj),
    limit: vi.fn().mockImplementation(() => obj),
    session: vi.fn().mockImplementation(() => obj),
    then: vi.fn().mockImplementation((resolve) => Promise.resolve(value).then(resolve))
  };
  return obj;
};

vi.mock('../../models/Transaction.js', () => {
  const mockSave = vi.fn().mockImplementation(function() {
    return Promise.resolve({
      _id: 'tx_new_id',
      ...this
    });
  });

  const MockTransaction = vi.fn().mockImplementation(function(data) {
    return {
      ...data,
      save: mockSave
    };
  });

  MockTransaction.find = vi.fn();
  MockTransaction.findById = vi.fn();
  MockTransaction.findByIdAndDelete = vi.fn();
  MockTransaction.countDocuments = vi.fn();
  MockTransaction.insertMany = vi.fn();

  return { default: MockTransaction };
});

vi.mock('../../models/Account.js', () => {
  const mockSave = vi.fn().mockImplementation(function() {
    return Promise.resolve(this);
  });

  const MockAccount = vi.fn().mockImplementation(function(data) {
    return {
      ...data,
      save: mockSave
    };
  });

  MockAccount.find = vi.fn();
  MockAccount.findById = vi.fn();
  MockAccount.findOne = vi.fn();

  return { default: MockAccount };
});

vi.mock('../../models/Category.js', () => {
  const mockSave = vi.fn().mockImplementation(function() {
    return Promise.resolve(this);
  });

  const MockCategory = vi.fn().mockImplementation(function(data) {
    return {
      ...data,
      save: mockSave
    };
  });

  MockCategory.find = vi.fn();
  MockCategory.findOne = vi.fn();

  return { default: MockCategory };
});

vi.mock('../../models/SavingsGoal.js', () => {
  const mockSave = vi.fn().mockImplementation(function() {
    return Promise.resolve(this);
  });

  const MockSavingsGoal = vi.fn().mockImplementation(function(data) {
    return {
      ...data,
      save: mockSave
    };
  });

  MockSavingsGoal.findById = vi.fn();

  return { default: MockSavingsGoal };
});

vi.mock('../../models/ScheduledTransaction.js', () => ({
  default: {
    find: vi.fn()
  }
}));

vi.mock('../../models/User.js', () => ({
  default: {
    findById: vi.fn().mockResolvedValue({
      preferences: {
        enableLowBalanceAlerts: true,
        lowBalanceThreshold: 100,
        enableBudgetAlerts: true
      }
    })
  }
}));

vi.mock('../../models/Budget.js', () => ({
  default: {
    find: vi.fn().mockResolvedValue([])
  }
}));

vi.mock('../../utils/pushNotification.js', () => ({
  sendPushNotification: vi.fn().mockResolvedValue(true)
}));

describe('Transaction Controller', () => {
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
      send: vi.fn(),
      setHeader: vi.fn()
    };
  });

  describe('getTransactions', () => {
    it('should query transactions with filters and pagination', async () => {
      req.query = {
        accountId: 'acc_1',
        type: 'expense',
        page: '2',
        limit: '10'
      };

      const mockTxs = [{ _id: 'tx1', description: 'Boulangerie', amount: 5 }];
      Transaction.find.mockReturnValue(mockChain(mockTxs));
      Transaction.countDocuments.mockResolvedValue(25);

      await getTransactions(req, res);

      expect(Transaction.find).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'user_123',
        accountId: 'acc_1',
        type: 'expense'
      }));
      expect(res.json).toHaveBeenCalledWith({
        transactions: mockTxs,
        page: 2,
        pages: 3,
        total: 25
      });
    });
  });

  describe('createTransaction', () => {
    it('should create an expense and deduct from account balance', async () => {
      req.body = {
        accountId: 'acc_1',
        type: 'expense',
        amount: 50,
        description: 'Course alimentaire',
        date: '2026-06-01'
      };

      const mockAcc = { _id: 'acc_1', balance: 200, save: vi.fn() };
      Account.findById.mockReturnValue(mockChain(mockAcc));

      const populatedTx = { _id: 'tx_new_id', ...req.body };
      Transaction.findById.mockReturnValue(mockChain(populatedTx));

      await createTransaction(req, res);

      expect(Account.findById).toHaveBeenCalledWith('acc_1');
      expect(mockAcc.balance).toBe(150); // 200 - 50
      expect(mockAcc.save).toHaveBeenCalled();
      expect(mockSession.commitTransaction).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(populatedTx);
    });

    it('should support transfer between two accounts', async () => {
      req.body = {
        accountId: 'acc_1',
        toAccountId: 'acc_2',
        type: 'transfer',
        amount: 100,
        description: 'Virement interne',
        date: '2026-06-01'
      };

      const mockAccSource = { _id: 'acc_1', balance: 500, save: vi.fn() };
      const mockAccDest = { _id: 'acc_2', balance: 50, save: vi.fn() };

      Account.findById.mockImplementation((id) => {
        if (id === 'acc_1') return mockChain(mockAccSource);
        if (id === 'acc_2') return mockChain(mockAccDest);
        return mockChain(null);
      });

      const populatedTx = { _id: 'tx_new_id', ...req.body };
      Transaction.findById.mockReturnValue(mockChain(populatedTx));

      await createTransaction(req, res);

      expect(mockAccSource.balance).toBe(400); // 500 - 100
      expect(mockAccDest.balance).toBe(150); // 50 + 100
      expect(mockAccSource.save).toHaveBeenCalled();
      expect(mockAccDest.save).toHaveBeenCalled();
      expect(mockSession.commitTransaction).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('deleteTransaction', () => {
    it('should delete a transaction and revert account balance impact', async () => {
      req.params.id = 'tx1';

      const mockTx = {
        _id: 'tx1',
        userId: 'user_123',
        accountId: 'acc_1',
        type: 'expense',
        amount: 25
      };

      const mockAcc = { _id: 'acc_1', balance: 100, save: vi.fn() };

      Transaction.findById.mockResolvedValue(mockTx);
      Account.findById.mockReturnValue(mockChain(mockAcc));

      await deleteTransaction(req, res);

      // Reverting an expense of 25 means balance goes from 100 to 125
      expect(mockAcc.balance).toBe(125);
      expect(mockAcc.save).toHaveBeenCalled();
      expect(Transaction.findByIdAndDelete).toHaveBeenCalledWith('tx1', expect.any(Object));
      expect(mockSession.commitTransaction).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ message: 'Transaction removed' });
    });
  });

  describe('getCalendarTransactions', () => {
    it('should aggregate actual and projected scheduled occurrences', async () => {
      req.query = { month: '2026-06' };

      const mockRealTxs = [
        { _id: 'tx1', date: new Date('2026-06-05'), amount: 10, type: 'expense' }
      ];

      const mockSchedules = [
        {
          _id: 'st1',
          userId: 'user_123',
          accountId: 'acc_1',
          type: 'expense',
          amount: 15,
          description: 'Abo',
          nextDate: new Date('2026-06-15'),
          frequency: { every: 1, unit: 'month' },
          numberOfTimes: 0,
          timesExecuted: 0
        }
      ];

      Transaction.find.mockReturnValue(mockChain(mockRealTxs));
      ScheduledTransaction.find.mockReturnValue(mockChain(mockSchedules));

      await getCalendarTransactions(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.arrayContaining([
        expect.objectContaining({ _id: 'tx1' }),
        expect.objectContaining({ description: 'Abo', isPlanned: true })
      ]));
    });
  });

  describe('exportTransactions', () => {
    it('should export transactions in CSV format with appropriate headers', async () => {
      const mockTxs = [
        {
          date: new Date('2026-06-01'),
          description: 'Courses',
          amount: 85.5,
          type: 'expense',
          categoryId: { name: 'Alimentation' },
          accountId: { name: 'Compte Courant' }
        }
      ];

      Transaction.find.mockReturnValue(mockChain(mockTxs));

      await exportTransactions(req, res);

      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
      expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', expect.stringContaining('transactions_export.csv'));
      expect(res.send).toHaveBeenCalledWith(expect.stringContaining('date,description,amount,type,category,account\n2026-06-01,"Courses",85.5,expense,"Alimentation","Compte Courant"\n'));
    });
  });

  describe('importTransactions', () => {
    it('should import transactions from a CSV file buffer and create account/category if needed', async () => {
      const csvData = `date,description,amount,type,category,account
2026-06-01,Test CSV Import,30,expense,Loisirs,ImportedAcc`;

      req.file = {
        buffer: Buffer.from(csvData, 'utf-8')
      };

      // Resolve existing account and category as null to test creation
      Account.find.mockReturnValue(mockChain([]));
      Category.find.mockReturnValue(mockChain([]));
      Transaction.insertMany.mockResolvedValue([]);

      await importTransactions(req, res);

      expect(Account).toHaveBeenCalled();
      expect(Category).toHaveBeenCalled();
      expect(mockSession.commitTransaction).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        importedCount: 1,
        failedCount: 0
      }));
    });
  });

  describe('updateTransaction', () => {
    it('should update a transaction and recalculate balance impact correctly', async () => {
      req.params.id = 'tx1';
      req.body = {
        amount: 60, // Changed from 50 to 60
        description: 'Courses updated'
      };

      const mockExistingTx = {
        _id: 'tx1',
        userId: 'user_123',
        accountId: 'acc_1',
        type: 'expense',
        amount: 50,
        description: 'Courses',
        save: vi.fn()
      };

      const mockAcc = { _id: 'acc_1', balance: 150, save: vi.fn() };

      Transaction.findById.mockImplementation((id) => {
        if (id === 'tx1') return mockChain(mockExistingTx);
        return mockChain(null);
      });
      Account.findById.mockReturnValue(mockChain(mockAcc));

      await updateTransaction(req, res);

      // Revert old expense of 50 -> balance becomes 200
      // Apply new expense of 60 -> balance becomes 140
      expect(mockAcc.balance).toBe(140);
      expect(mockAcc.save).toHaveBeenCalled();
      expect(mockExistingTx.save).toHaveBeenCalled();
      expect(mockSession.commitTransaction).toHaveBeenCalled();
    });
  });
});
