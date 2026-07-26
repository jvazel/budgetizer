import { vi, describe, it, expect, beforeEach } from 'vitest';
import { checkAndTriggerAlerts } from '../alertListener';
import { eventBus } from '../../utils/eventBus';
import User from '../../models/User';
import Account from '../../models/Account';
import Budget from '../../models/Budget';
import Transaction from '../../models/Transaction';
import { sendPushNotification } from '../../utils/pushNotification';

vi.mock('../../models/User', () => ({
  default: {
    findById: vi.fn()
  }
}));

vi.mock('../../models/Account', () => ({
  default: {
    findById: vi.fn(),
    find: vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue([{ _id: 'acc1' }])
    })
  }
}));

vi.mock('../../models/Budget', () => ({
  default: {
    find: vi.fn()
  }
}));

vi.mock('../../models/Transaction', () => ({
  default: {
    aggregate: vi.fn()
  }
}));

vi.mock('../../utils/pushNotification', () => ({
  sendPushNotification: vi.fn()
}));

describe('alertListener', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should ignore non-expense transactions', async () => {
    await checkAndTriggerAlerts({
      userId: 'user1',
      transaction: { type: 'income', accountId: 'acc1' },
      amount: 100
    });

    expect(User.findById).not.toHaveBeenCalled();
    expect(sendPushNotification).not.toHaveBeenCalled();
  });

  it('should trigger low balance alert if balance drops below threshold', async () => {
    const mockUser = {
      _id: 'user1',
      preferences: {
        enableLowBalanceAlerts: true,
        lowBalanceThreshold: 100
      }
    };
    const mockAccount = {
      _id: 'acc1',
      name: 'Checking Account',
      balance: 80 // below 100
    };

    User.findById.mockResolvedValue(mockUser);
    Account.findById.mockResolvedValue(mockAccount);

    // Expense of 50. Before it was 80 + 50 = 130 (above threshold)
    await checkAndTriggerAlerts({
      userId: 'user1',
      transaction: { type: 'expense', accountId: 'acc1', categoryId: 'cat1' },
      amount: 50
    });

    expect(User.findById).toHaveBeenCalledWith('user1');
    expect(Account.findById).toHaveBeenCalledWith('acc1');
    expect(sendPushNotification).toHaveBeenCalledWith('user1', expect.objectContaining({
      title: 'Alerte Solde Bas ⚠️',
      body: expect.stringContaining('Checking Account')
    }));
  });

  it('should not trigger low balance alert if balance was already below threshold', async () => {
    const mockUser = {
      _id: 'user1',
      preferences: {
        enableLowBalanceAlerts: true,
        lowBalanceThreshold: 100
      }
    };
    const mockAccount = {
      _id: 'acc1',
      name: 'Checking Account',
      balance: 80 // below 100
    };

    User.findById.mockResolvedValue(mockUser);
    Account.findById.mockResolvedValue(mockAccount);

    // Expense of 5. Before it was 80 + 5 = 85 (already below threshold)
    await checkAndTriggerAlerts({
      userId: 'user1',
      transaction: { type: 'expense', accountId: 'acc1', categoryId: 'cat1' },
      amount: 5
    });

    expect(sendPushNotification).not.toHaveBeenCalled();
  });

  it('should trigger budget warning alert when category spent exceeds alertThreshold', async () => {
    const mockUser = {
      _id: 'user1',
      preferences: {
        enableLowBalanceAlerts: false,
        enableBudgetAlerts: true
      }
    };
    const mockBudget = {
      _id: 'b1',
      name: 'Courses',
      amount: 1000,
      alertAt: 80, // 80%
      categoryId: 'cat_food',
      period: 'monthly'
    };

    User.findById.mockResolvedValue(mockUser);
    Budget.find.mockResolvedValue([mockBudget]);
    
    // Spent after transaction is 850.
    // Amount is 100, so spent before transaction was 750 (under 800 / 80% threshold).
    Transaction.aggregate.mockResolvedValue([{ totalSpent: 850 }]);

    await checkAndTriggerAlerts({
      userId: 'user1',
      transaction: { type: 'expense', accountId: 'acc1', categoryId: 'cat_food', date: new Date() },
      amount: 100
    });

    expect(sendPushNotification).toHaveBeenCalledWith('user1', expect.objectContaining({
      title: 'Alerte Budget 📊',
      body: expect.stringContaining('85%')
    }));
  });

  it('should trigger budget exceeded alert when category spent exceeds budget amount', async () => {
    const mockUser = {
      _id: 'user1',
      preferences: {
        enableLowBalanceAlerts: false,
        enableBudgetAlerts: true
      }
    };
    const mockBudget = {
      _id: 'b1',
      name: 'Courses',
      amount: 1000,
      alertAt: 80,
      categoryId: 'cat_food',
      period: 'monthly'
    };

    User.findById.mockResolvedValue(mockUser);
    Budget.find.mockResolvedValue([mockBudget]);
    
    // Spent after transaction is 1050.
    // Amount is 100, so spent before transaction was 950 (under 1000).
    Transaction.aggregate.mockResolvedValue([{ totalSpent: 1050 }]);

    await checkAndTriggerAlerts({
      userId: 'user1',
      transaction: { type: 'expense', accountId: 'acc1', categoryId: 'cat_food', date: new Date() },
      amount: 100
    });

    expect(sendPushNotification).toHaveBeenCalledWith('user1', expect.objectContaining({
      title: 'Dépassement de Budget 🚨',
      body: expect.stringContaining('dépassé')
    }));
  });

  it('should trigger predictive overrun alert when spending pace projects budget overrun', async () => {
    const mockUser = {
      _id: 'user1',
      preferences: {
        enableLowBalanceAlerts: false,
        enableBudgetAlerts: true
      }
    };
    const mockBudget = {
      _id: 'b1',
      name: 'Alimentation',
      amount: 500,
      alertAt: 95, // alertAt threshold high so only predictive alert triggers
      categoryId: 'cat_food',
      period: 'monthly'
    };

    User.findById.mockResolvedValue(mockUser);
    Budget.find.mockResolvedValue([mockBudget]);

    // On day 10 of month, total spent so far is 200 (under 500 budget and under 95% threshold).
    // Daily pace = 200 / 10 = 20 €/day.
    // Projected month total (30 days) = 600 € (+20% overrun).
    const midMonthDate = new Date();
    midMonthDate.setDate(10);

    Transaction.aggregate.mockResolvedValue([{ totalSpent: 200 }]);

    await checkAndTriggerAlerts({
      userId: 'user1',
      transaction: { type: 'expense', accountId: 'acc1', categoryId: 'cat_food', date: midMonthDate },
      amount: 50
    });

    expect(sendPushNotification).toHaveBeenCalledWith('user1', expect.objectContaining({
      title: 'Alerte Prédictive Budget 🔮',
      body: expect.stringContaining('Alimentation')
    }));
  });

  it('should be subscribed to eventBus events', () => {
    const listenersCreated = eventBus.listeners('transaction:created');
    const listenersUpdated = eventBus.listeners('transaction:updated');

    expect(listenersCreated.length).toBeGreaterThan(0);
    expect(listenersUpdated.length).toBeGreaterThan(0);
  });
});

