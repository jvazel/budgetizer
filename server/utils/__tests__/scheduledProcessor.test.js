import { vi, describe, it, expect, beforeEach } from 'vitest';
import { processScheduledTransactions } from '../scheduledProcessor.js';
import ScheduledTransaction from '../../models/ScheduledTransaction.js';
import Transaction from '../../models/Transaction.js';
import Account from '../../models/Account.js';
import mongoose from 'mongoose';

// Mock mongoose startSession
const mockSession = {
  startTransaction: vi.fn(),
  commitTransaction: vi.fn(),
  abortTransaction: vi.fn(),
  endSession: vi.fn()
};
mongoose.startSession = vi.fn().mockResolvedValue(mockSession);

// Mock models
vi.mock('../../models/ScheduledTransaction.js', () => ({
  default: {
    find: vi.fn()
  }
}));

vi.mock('../../models/Transaction.js', () => {
  const mockSave = vi.fn().mockResolvedValue({});
  const MockTx = vi.fn().mockImplementation(function(data) {
    return {
      ...data,
      save: mockSave
    };
  });
  MockTx.save = mockSave;
  return { default: MockTx };
});

vi.mock('../../models/Account.js', () => ({
  default: {
    findById: vi.fn(),
    findOneAndUpdate: vi.fn()
  }
}));

describe('Scheduled Processor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should process active schedules, create transactions, and update account balances if autoConfirm is true', async () => {
    const mockSaveSchedule = vi.fn().mockResolvedValue({});
    const mockSchedule = {
      _id: 'sched_123',
      userId: 'user_777',
      accountId: 'acc_checking',
      categoryId: 'cat_rent',
      type: 'expense',
      amount: 600,
      description: 'Loyer mensuel',
      note: '',
      nextDate: new Date('2026-06-01T00:00:00.000Z'),
      frequency: { every: 1, unit: 'month' },
      autoConfirm: true,
      timesExecuted: 0,
      numberOfTimes: 12,
      isActive: true,
      save: mockSaveSchedule
    };

    // Chain mocks
    ScheduledTransaction.find.mockReturnValue({
      session: vi.fn().mockResolvedValue([mockSchedule])
    });

    const mockSaveAccount = vi.fn().mockResolvedValue({});
    const mockAccount = {
      _id: 'acc_checking',
      balance: 1500,
      save: mockSaveAccount
    };

    Account.findOneAndUpdate.mockImplementation((filter, update) => {
      if (update && update.$inc && update.$inc.balance !== undefined) {
        mockAccount.balance += update.$inc.balance;
      }
      return Promise.resolve(mockAccount);
    });

    await processScheduledTransactions();

    expect(mongoose.startSession).toHaveBeenCalled();
    expect(mockSession.startTransaction).toHaveBeenCalled();

    // Check if new transaction is saved
    expect(Transaction.save).toHaveBeenCalled();
    
    // Check if account balance is updated (expense 600 subtracted from 1500 = 900)
    expect(mockAccount.balance).toBe(900);

    // Check schedule timesExecuted is incremented
    expect(mockSchedule.timesExecuted).toBe(1);
    
    // Check nextDate is advanced by 1 month
    const expectedNextDate = new Date('2026-07-01T00:00:00.000Z');
    expect(mockSchedule.nextDate.getTime()).toBe(expectedNextDate.getTime());
    expect(mockSaveSchedule).toHaveBeenCalled();

    expect(mockSession.commitTransaction).toHaveBeenCalled();
  });

  it('should process schedules but NOT update balances if autoConfirm is false', async () => {
    const mockSaveSchedule = vi.fn().mockResolvedValue({});
    const mockSchedule = {
      _id: 'sched_123',
      userId: 'user_777',
      accountId: 'acc_checking',
      categoryId: 'cat_phone',
      type: 'expense',
      amount: 30,
      description: 'Abonnement Mobile',
      nextDate: new Date('2026-06-01T00:00:00.000Z'),
      frequency: { every: 1, unit: 'month' },
      autoConfirm: false, // requires manual confirmation
      timesExecuted: 0,
      numberOfTimes: 0,
      isActive: true,
      save: mockSaveSchedule
    };

    ScheduledTransaction.find.mockReturnValue({
      session: vi.fn().mockResolvedValue([mockSchedule])
    });

    await processScheduledTransactions();

    // Transaction is created but isPending is true
    // Account.findOneAndUpdate should not be called since autoConfirm is false
    expect(Account.findOneAndUpdate).not.toHaveBeenCalled();
    expect(mockSchedule.timesExecuted).toBe(1);
    expect(mockSession.commitTransaction).toHaveBeenCalled();
  });
});
