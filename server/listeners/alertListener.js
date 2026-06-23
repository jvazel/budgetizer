import { eventBus } from '../utils/eventBus.js';
import User from '../models/User.js';
import Account from '../models/Account.js';
import Budget from '../models/Budget.js';
import Transaction from '../models/Transaction.js';
import { sendPushNotification } from '../utils/pushNotification.js';
import mongoose from 'mongoose';

// Helper for budget dates (UTC)
const getBudgetPeriodDates = (period, referenceDate = new Date()) => {
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

export const checkAndTriggerAlerts = async ({ userId, transaction, amount, oldTransaction = null }) => {
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

          // Proactive Velocity Alert
          if (budget.period === 'monthly' || !budget.period) {
            const today = transaction.date || new Date();
            const currentDay = today.getDate();

            if (currentDay < 20) {
              const daysCount = currentDay >= 7 ? 7 : currentDay;
              const startOfRecentPeriod = new Date(today.getFullYear(), today.getMonth(), today.getDate() - daysCount + 1, 0, 0, 0, 0);

              const recentSpentResult = await Transaction.aggregate([
                {
                  $match: {
                    userId: mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId,
                    type: 'expense',
                    accountId: { $in: includedAccountIds },
                    isPending: { $ne: true },
                    categoryId: mongoose.Types.ObjectId.isValid(budget.categoryId) ? new mongoose.Types.ObjectId(budget.categoryId) : budget.categoryId,
                    date: { $gte: startOfRecentPeriod, $lte: end }
                  }
                },
                {
                  $group: {
                    _id: null,
                    totalSpent: { $sum: '$amount' }
                  }
                }
              ]);
              const recentSpent = recentSpentResult[0]?.totalSpent || 0;
              const actualVelocity = recentSpent / daysCount;

              const remainingBudget = budget.amount - spentAfter;
              const totalDaysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
              const daysRemaining = totalDaysInMonth - currentDay + 1;
              const targetVelocity = remainingBudget > 0 && daysRemaining > 0 ? remainingBudget / daysRemaining : 0;

              if (actualVelocity > targetVelocity && remainingBudget > 0) {
                const daysToDepletion = remainingBudget / actualVelocity;
                const depletionDate = new Date(today);
                depletionDate.setDate(today.getDate() + Math.ceil(daysToDepletion));

                if (depletionDate.getMonth() === today.getMonth() &&
                    depletionDate.getFullYear() === today.getFullYear() &&
                    depletionDate.getDate() < 20) {
                  
                  sendPushNotification(userId, {
                    title: 'Alerte Vélocité Proactive ⚠️',
                    body: `Attention : au rythme actuel de dépenses (${actualVelocity.toFixed(2)} €/j au lieu de ${targetVelocity.toFixed(2)} €/j), votre budget "${budget.name}" sera épuisé le ${depletionDate.toLocaleDateString('fr-FR')}, soit avant le 20 du mois.`,
                    url: '/charts'
                  });
                }
              }
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('Error triggering alerts in event bus listener:', err);
  }
};

// Subscribe to eventBus events
eventBus.on('transaction:created', checkAndTriggerAlerts);
eventBus.on('transaction:updated', checkAndTriggerAlerts);
