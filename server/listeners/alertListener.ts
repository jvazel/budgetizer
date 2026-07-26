import { eventBus } from '../utils/eventBus';
import User from '../models/User';
import Account from '../models/Account';
import Budget from '../models/Budget';
import Transaction from '../models/Transaction';
import { ITransactionDocument } from '../models/types';
import { sendPushNotification } from '../utils/pushNotification';
import mongoose from 'mongoose';
import { logger } from '../utils/logger';

// Helper for budget dates (UTC)
const getBudgetPeriodDates = (period: 'weekly' | 'monthly' | 'yearly', referenceDate = new Date()) => {
  let start, end;
  const ref = new Date(referenceDate);
  if (period === 'weekly') {
    const day = ref.getUTCDay();
    const diff = ref.getUTCDate() - day + (day === 0 ? -6 : 1);
    start = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), diff, 0, 0, 0, 0));
    end = new Date(start.getTime());
    end.setUTCDate(end.getUTCDate() + 6);
    end.setUTCHours(23, 59, 59, 999);
  } else if (period === 'yearly') {
    start = new Date(Date.UTC(ref.getUTCFullYear(), 0, 1, 0, 0, 0, 0));
    end = new Date(Date.UTC(ref.getUTCFullYear(), 11, 31, 23, 59, 59, 999));
  } else { // monthly
    start = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), 1, 0, 0, 0, 0));
    end = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth() + 1, 0, 23, 59, 59, 999));
  }
  return { start, end };
};

export const checkAndTriggerAlerts = async ({ userId, transaction, amount, oldTransaction }: { userId: string; transaction: ITransactionDocument; amount: number; oldTransaction?: ITransactionDocument | null }) => {
  try {
    if (transaction.type !== 'expense') return;

    const user = await User.findById(userId);
    if (!user) return;

    // 1. Low Balance Alert
    if (user.preferences.enableLowBalanceAlerts) {
      const account = await Account.findById(transaction.accountId);
      if (account) {
        const threshold = user.preferences.lowBalanceThreshold;
        const balanceAfter = account.balance;
        
        let balanceBefore = balanceAfter + amount;
        if (oldTransaction && oldTransaction.accountId.toString() === transaction.accountId.toString() && oldTransaction.type === 'expense') {
          balanceBefore = balanceAfter + amount - oldTransaction.amount;
        }
        
        if (balanceBefore >= threshold && balanceAfter < threshold) {
          sendPushNotification(userId, {
            title: 'Alerte Solde Bas ⚠️',
            body: `Le solde de votre compte "${account.name}" est passé à ${balanceAfter.toFixed(2)} € (sous le seuil de ${threshold.toFixed(2)} €).`,
            url: '/accounts'
          });
        }
      }
    }

    // 2. Budget Alert
    if (user.preferences.enableBudgetAlerts && transaction.categoryId) {
      const budgets = await Budget.find({ userId, categoryId: transaction.categoryId });
      if (budgets.length > 0) {
        const includedAccounts = await Account.find({ userId, includeInTotal: { $ne: false } }).select('_id');
        const includedAccountIds = includedAccounts.map(acc => acc._id);

        for (const budget of budgets) {
          const { start, end } = getBudgetPeriodDates(budget.period, transaction.date || new Date());

          // Sum expenses for this category in the period using MongoDB aggregation for efficiency (only for included accounts)
          const spentResult = await Transaction.aggregate([
            {
              $match: {
                userId: mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId,
                type: 'expense',
                accountId: { $in: includedAccountIds },
                isPending: { $ne: true },
                categoryId: mongoose.Types.ObjectId.isValid(budget.categoryId) ? new mongoose.Types.ObjectId(budget.categoryId) : budget.categoryId,
                date: { $gte: start, $lte: end }
              }
            },
            {
              $group: {
                _id: null,
                totalSpent: { $sum: '$amount' }
              }
            }
          ]);
          const spentAfter = spentResult[0]?.totalSpent || 0;
          
          let spentBefore = spentAfter - amount;

          if (oldTransaction && oldTransaction.categoryId && oldTransaction.categoryId.toString() === transaction.categoryId.toString() && oldTransaction.type === 'expense') {
            spentBefore = spentAfter - amount + oldTransaction.amount;
          }

          const alertThreshold = budget.amount * ((budget.alertAt || 80) / 100);

          if (spentBefore < alertThreshold && spentAfter >= alertThreshold && spentAfter < budget.amount) {
            sendPushNotification(userId, {
              title: 'Alerte Budget 📊',
              body: `Attention : vous avez consommé ${Math.round((spentAfter / budget.amount) * 100)}% de votre budget "${budget.name}" (${spentAfter.toFixed(2)} € / ${budget.amount.toFixed(2)} €).`,
              url: '/budgets'
            });
          } else if (spentBefore < budget.amount && spentAfter >= budget.amount) {
            sendPushNotification(userId, {
              title: 'Dépassement de Budget 🚨',
              body: `Alerte : votre budget "${budget.name}" est dépassé ! (${spentAfter.toFixed(2)} € dépensés sur ${budget.amount.toFixed(2)} € alloués).`,
              url: '/budgets'
            });
          }

          // 3. Predictive Overrun Alert (Run Rate Projection)
          if (spentAfter < budget.amount) {
            const refDate = new Date(transaction.date || new Date());
            const totalDaysInPeriod = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
            const daysElapsed = Math.max(1, Math.ceil((refDate.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));

            if (daysElapsed >= 3) {
              const dailyPace = spentAfter / daysElapsed;
              const projectedTotal = dailyPace * totalDaysInPeriod;
              const overrunRatio = (projectedTotal - budget.amount) / budget.amount;

              if (overrunRatio >= 0.05) {
                const overrunPercent = Math.round(overrunRatio * 100);
                sendPushNotification(userId, {
                  title: 'Alerte Prédictive Budget 🔮',
                  body: `À ce rythme (${dailyPace.toFixed(2)} €/j), vous allez dépasser votre budget "${budget.name}" de ${overrunPercent}% d'ici la fin de la période (projection : ${projectedTotal.toFixed(2)} € sur ${budget.amount.toFixed(2)} €).`,
                  url: '/budgets'
                });
              }
            }
          }
        }
      }
    }
  } catch (err) {
    logger.error('Error triggering alerts in event bus listener:', { error: (err as Error).message });
  }
};


// Subscribe to eventBus events
eventBus.on('transaction:created', checkAndTriggerAlerts);
eventBus.on('transaction:updated', checkAndTriggerAlerts);
