import Account from '../models/Account.js';
import Transaction from '../models/Transaction.js';
import Budget from '../models/Budget.js';
import SavingsGoal from '../models/SavingsGoal.js';
import ScheduledTransaction from '../models/ScheduledTransaction.js';
import mongoose from 'mongoose';
import { TtlCache } from '../utils/ttlCache.js';
import { logger } from '../utils/logger';

// Leak-Safe In-Memory Cache for User Dashboards
const dashboardCache = new TtlCache(120000, 1000); // 2 minutes TTL, 1000 users max limit

export const invalidateDashboardCache = (userId) => {
  if (userId) {
    dashboardCache.delete(userId.toString());
  }
};

const toObjectId = (id) => {
  if (mongoose.Types.ObjectId.isValid(id)) {
    return new mongoose.Types.ObjectId(id);
  }
  return id;
};

const aggregatePeriodStats = async (userId, checkingAccountIds, startDate, endDate) => {
  if (checkingAccountIds.length === 0) return { income: 0, expenses: 0 };
  const checkingAccountObjectIds = checkingAccountIds.map(toObjectId);
  const result = await Transaction.aggregate([
    {
      $match: {
        userId: toObjectId(userId),
        isPending: { $ne: true },
        date: { $gte: startDate, $lte: endDate },
        $or: [
          { accountId: { $in: checkingAccountObjectIds } },
          { toAccountId: { $in: checkingAccountObjectIds } }
        ]
      }
    },
    {
      $project: {
        type: 1,
        amount: 1,
        accountId: 1,
        toAccountId: 1,
        isSourceChecking: { $in: ["$accountId", checkingAccountObjectIds] },
        isDestChecking: {
          $cond: {
            if: { $ne: ["$toAccountId", null] },
            then: { $in: ["$toAccountId", checkingAccountObjectIds] },
            else: false
          }
        }
      }
    },
    {
      $group: {
        _id: null,
        income: {
          $sum: {
            $cond: [
              {
                $or: [
                  { $and: [{ $eq: ["$type", "income"] }, "$isSourceChecking"] },
                  { $and: [{ $eq: ["$type", "transfer"] }, { $not: ["$isSourceChecking"] }, "$isDestChecking"] }
                ]
              },
              "$amount",
              0
            ]
          }
        },
        expenses: {
          $sum: {
            $cond: [
              {
                $or: [
                  { $and: [{ $eq: ["$type", "expense"] }, "$isSourceChecking"] },
                  { $and: [{ $eq: ["$type", "transfer"] }, "$isSourceChecking", { $not: ["$isDestChecking"] }] }
                ]
              },
              "$amount",
              0
            ]
          }
        }
      }
    }
  ]);
  
  return result[0] || { income: 0, expenses: 0 };
};

const getDailyExpensesMap = async (userId, checkingAccountIds, startDate, endDate) => {
  if (checkingAccountIds.length === 0) return {};
  const checkingAccountObjectIds = checkingAccountIds.map(toObjectId);
  const result = await Transaction.aggregate([
    {
      $match: {
        userId: toObjectId(userId),
        isPending: { $ne: true },
        date: { $gte: startDate, $lte: endDate },
        $or: [
          { accountId: { $in: checkingAccountObjectIds } },
          { toAccountId: { $in: checkingAccountObjectIds } }
        ]
      }
    },
    {
      $project: {
        type: 1,
        amount: 1,
        accountId: 1,
        toAccountId: 1,
        date: 1,
        isSourceChecking: { $in: ["$accountId", checkingAccountObjectIds] },
        isDestChecking: {
          $cond: {
            if: { $ne: ["$toAccountId", null] },
            then: { $in: ["$toAccountId", checkingAccountObjectIds] },
            else: false
          }
        }
      }
    },
    {
      $match: {
        $or: [
          { type: "expense", isSourceChecking: true },
          { type: "transfer", isSourceChecking: true, isDestChecking: false }
        ]
      }
    },
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$date" }
        },
        amount: { $sum: "$amount" }
      }
    }
  ]);

  const map = {};
  result.forEach(item => {
    map[item._id] = item.amount;
  });
  return map;
};

const aggregateExpensesByCategory = async (userId, checkingAccountIds, startDate, endDate) => {
  if (checkingAccountIds.length === 0) return [];
  const checkingAccountObjectIds = checkingAccountIds.map(toObjectId);
  return await Transaction.aggregate([
    {
      $match: {
        userId: toObjectId(userId),
        isPending: { $ne: true },
        type: 'expense',
        date: { $gte: startDate, $lte: endDate },
        accountId: { $in: checkingAccountObjectIds }
      }
    },
    {
      $group: {
        _id: '$categoryId',
        amount: { $sum: '$amount' }
      }
    },
    {
      $lookup: {
        from: 'categories',
        localField: '_id',
        foreignField: '_id',
        as: 'categoryInfo'
      }
    },
    { $unwind: '$categoryInfo' },
    {
      $project: {
        id: '$_id',
        name: '$categoryInfo.name',
        icon: '$categoryInfo.icon',
        color: '$categoryInfo.color',
        amount: 1
      }
    },
    { $sort: { amount: -1 } }
  ]);
};

export const getDashboardSummary = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Check cache first (2 minutes TTL)
    const cached = dashboardCache.get(userId);
    if (cached) {
      return res.json(cached);
    }

    const now = new Date();
    
    // Dates for current month (UTC)
    const startOfCurrentMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
    const endOfCurrentMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));
    
    // Dates for previous month (UTC)
    const startOfLastMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1, 0, 0, 0, 0));
    const endOfLastMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0, 23, 59, 59, 999));

    // Dates for 7 days ago (UTC)
    const startOf7DaysAgo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 6, 0, 0, 0, 0));

    // Dates for 180 days history (UTC)
    const startOfHistory = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 180, 0, 0, 0, 0));

    // Future limit for upcoming scheduled transactions (3 days) (UTC)
    const futureLimit = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 3, 23, 59, 59, 999));

    // 1. Fetch accounts first to extract included and checking account IDs
    const rawAccounts = await Account.find({ userId }).lean();
    const includedAccountIds = rawAccounts.filter(acc => acc.includeInTotal !== false).map(acc => acc._id);
    const checkingAccountIds = rawAccounts.filter(acc => acc.type === 'checking').map(acc => acc._id);

    // Days count and start of period for velocity calculation
    const currentDay = now.getDate();
    const daysCount = currentDay >= 7 ? 7 : currentDay;
    const startOfRecentPeriod = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() - daysCount + 1, 0, 0, 0, 0));

    // Weekly range for budgets (Monday to Sunday) (UTC)
    const day = now.getUTCDay();
    const diff = now.getUTCDate() - day + (day === 0 ? -6 : 1);
    const wStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), diff, 0, 0, 0, 0));
    const wEnd = new Date(wStart.getTime());
    wEnd.setUTCDate(wEnd.getUTCDate() + 6);
    wEnd.setUTCHours(23, 59, 59, 999);

    // Yearly range for budgets (Jan 1st to Dec 31st) (UTC)
    const yStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1, 0, 0, 0, 0));
    const yEnd = new Date(Date.UTC(now.getUTCFullYear(), 11, 31, 23, 59, 59, 999));

    // 2. Fetch other collections and perform database-level calculations in parallel
    const [
      currentMonthStats,
      lastMonthStats,
      currentMonthDailyMap,
      last7DaysDailyMap,
      expensesByCategory,
      dailyAccountDeltas,
      rawBudgets,
      pendingTxs,
      upcomingSchedules,
      savingsGoals,
      oldestTx,
      recentTransactions,
      recentExpensesByCategory,
      budgetTransactions
    ] = await Promise.all([
      aggregatePeriodStats(userId, checkingAccountIds, startOfCurrentMonth, endOfCurrentMonth),
      aggregatePeriodStats(userId, checkingAccountIds, startOfLastMonth, endOfLastMonth),
      getDailyExpensesMap(userId, checkingAccountIds, startOfCurrentMonth, endOfCurrentMonth),
      getDailyExpensesMap(userId, checkingAccountIds, startOf7DaysAgo, now),
      aggregateExpensesByCategory(userId, checkingAccountIds, startOfCurrentMonth, endOfCurrentMonth),
      Transaction.aggregate([
        {
          $match: {
            userId: toObjectId(userId),
            isPending: { $ne: true },
            date: { $gte: startOfHistory, $lte: now }
          }
        },
        {
          $facet: {
            sourceDeltas: [
              {
                $match: {
                  accountId: { $in: includedAccountIds.map(toObjectId) }
                }
              },
              {
                $group: {
                  _id: {
                    date: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
                    accountId: "$accountId"
                  },
                  delta: {
                    $sum: {
                      $cond: [
                        { $eq: ["$type", "income"] },
                        "$amount",
                        { $multiply: ["$amount", -1] }
                      ]
                    }
                  }
                }
              }
            ],
            destDeltas: [
              {
                $match: {
                  type: "transfer",
                  toAccountId: { $in: includedAccountIds.map(toObjectId) }
                }
              },
              {
                $group: {
                  _id: {
                    date: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
                    accountId: "$toAccountId"
                  },
                  delta: { $sum: "$amount" }
                }
              }
            ]
          }
        },
        {
          $project: {
            allDeltas: { $concatArrays: ["$sourceDeltas", "$destDeltas"] }
          }
        },
        { $unwind: "$allDeltas" },
        {
          $group: {
            _id: {
              date: "$allDeltas._id.date",
              accountId: "$allDeltas._id.accountId"
            },
            totalDelta: { $sum: "$allDeltas.delta" }
          }
        }
      ]),
      Budget.find({ userId }).populate('categoryId', 'name icon').lean(),
      Transaction.find({ userId, isPending: true }).populate('categoryId', 'name icon').lean(),
      ScheduledTransaction.find({
        userId,
        isActive: true,
        nextDate: { $gte: now, $lte: futureLimit }
      }).populate('categoryId', 'name icon').populate('toAccountId', 'type').lean(),
      SavingsGoal.find({ userId }).lean(),
      Transaction.findOne({ userId, isPending: { $ne: true } }).sort({ date: 1 }).lean(),
      Transaction.find({
        userId,
        isPending: { $ne: true },
        $or: [
          { accountId: { $in: checkingAccountIds } },
          { toAccountId: { $in: checkingAccountIds } }
        ],
        date: { $gte: startOfCurrentMonth, $lte: endOfCurrentMonth }
      })
      .populate('categoryId', 'name icon color type')
      .sort({ date: -1 })
      .limit(5)
      .lean(),
      // 13. Recent expenses by category for proactive velocity alert
      Transaction.aggregate([
        {
          $match: {
            userId: toObjectId(userId),
            type: 'expense',
            accountId: { $in: includedAccountIds.map(toObjectId) },
            isPending: { $ne: true },
            date: { $gte: startOfRecentPeriod, $lte: now }
          }
        },
        {
          $group: {
            _id: '$categoryId',
            totalSpent: { $sum: '$amount' }
          }
        }
      ]),
      Transaction.find({
        userId,
        type: 'expense',
        accountId: { $in: includedAccountIds },
        isPending: { $ne: true },
        $or: [
          { date: { $gte: wStart, $lte: wEnd } },
          { date: { $gte: startOfCurrentMonth, $lte: endOfCurrentMonth } },
          { date: { $gte: yStart, $lte: yEnd } }
        ]
      }).lean()
    ]);

    // Enrich budgets with spent, remaining and percentage calculations
    const budgets = rawBudgets.map(budget => {
      const period = budget.period || 'monthly';
      let start, end;
      if (period === 'weekly') {
        start = wStart;
        end = wEnd;
      } else if (period === 'yearly') {
        start = yStart;
        end = yEnd;
      } else {
        start = startOfCurrentMonth;
        end = endOfCurrentMonth;
      }

      const catId = budget.categoryId?._id?.toString() || budget.categoryId?.toString();
      const spent = budgetTransactions
        .filter(t => 
          t.categoryId && 
          catId &&
          t.categoryId.toString() === catId &&
          t.date >= start &&
          t.date <= end
        )
        .reduce((sum, t) => sum + t.amount, 0);

      const remaining = budget.amount - spent;
      const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;

      return {
        ...budget,
        spent: parseFloat(spent.toFixed(2)),
        remaining: parseFloat(remaining.toFixed(2)),
        percentage: parseFloat(percentage.toFixed(2))
      };
    });

    // 3. Fetch latest transaction date per account in a single aggregation query
    const latestTxDates = await Transaction.aggregate([
      {
        $match: {
          userId: toObjectId(userId),
          isPending: { $ne: true }
        }
      },
      {
        $project: {
          accountId: 1,
          toAccountId: 1,
          date: 1
        }
      },
      {
        $project: {
          accounts: {
            $filter: {
              input: ["$accountId", "$toAccountId"],
              as: "acc",
              cond: { $ne: ["$$acc", null] }
            }
          },
          date: 1
        }
      },
      { $unwind: "$accounts" },
      {
        $group: {
          _id: "$accounts",
          lastTransactionDate: { $max: "$date" }
        }
      }
    ]);

    const lastTxMap = {};
    latestTxDates.forEach(item => {
      if (item._id) {
        lastTxMap[item._id.toString()] = item.lastTransactionDate;
      }
    });

    const accounts = rawAccounts.map(account => {
      const accId = account._id.toString();
      return {
        ...account,
        lastTransactionDate: lastTxMap[accId] || null
      };
    });

    const totalBalance = rawAccounts.reduce((acc, account) => acc + account.balance, 0);
    const totalAvailable = rawAccounts.filter(acc => acc.type !== 'credit').reduce((sum, acc) => sum + acc.balance, 0);
    const totalCredit = rawAccounts.filter(acc => acc.type === 'credit').reduce((sum, acc) => sum + acc.balance, 0);

    // 4. Monthly totals and variations
    const currentIncome = currentMonthStats.income;
    const currentExpenses = currentMonthStats.expenses;
    const lastIncome = lastMonthStats.income;
    const lastExpenses = lastMonthStats.expenses;

    const calcChange = (current, last) => {
      if (last === 0) return current > 0 ? 100 : 0;
      return ((current - last) / last) * 100;
    };
    
    const incomeChange = calcChange(currentIncome, lastIncome);
    const expenseChange = calcChange(currentExpenses, lastExpenses);

    // 5. Daily Expenses list
    const daysInMonth = now.getUTCDate(); // Only up to today (UTC)
    const dailyExpenses = [];
    const yearStr = now.getUTCFullYear();
    const monthStr = String(now.getUTCMonth() + 1).padStart(2, '0');

    for (let i = 1; i <= daysInMonth; i++) {
      const dateKey = `${yearStr}-${monthStr}-${String(i).padStart(2, '0')}`;
      dailyExpenses.push({
        date: String(i).padStart(2, '0'),
        amount: currentMonthDailyMap[dateKey] || 0
      });
    }

    // 6. Last 7 Days Expenses list
    const last7DaysExpenses = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i));
      const dateKey = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
      const dayLabel = `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
      last7DaysExpenses.push({
        date: dayLabel,
        amount: parseFloat((last7DaysDailyMap[dateKey] || 0).toFixed(2))
      });
    }

    // 7. Balance History backwards sweep
    const accountBalances = {};
    rawAccounts.forEach(acc => {
      accountBalances[acc._id.toString()] = acc.balance;
    });

    const deltaMap = {};
    dailyAccountDeltas.forEach(item => {
      const dateKey = item._id.date;
      const accId = item._id.accountId.toString();
      if (!deltaMap[dateKey]) {
        deltaMap[dateKey] = {};
      }
      deltaMap[dateKey][accId] = item.totalDelta;
    });

    const balanceHistory = [];
    const runningBalances = { ...accountBalances };

    const formatDateKey = (date) => {
      const d = new Date(date);
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
    };

    for (let i = 0; i <= 180; i++) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i, 0, 0, 0, 0));
      const dateKey = formatDateKey(d);
      
      const dayLabel = `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
      const monthYearLabel = `${String(d.getUTCMonth() + 1).padStart(2, '0')}/${String(d.getUTCFullYear()).substring(2)}`;
      
      let totalAvailableVal = 0;
      let totalCreditVal = 0;

      rawAccounts.forEach(acc => {
        const bal = runningBalances[acc._id.toString()] || 0;
        if (acc.includeInTotal !== false) {
          if (acc.type === 'credit') {
            totalCreditVal += bal;
          } else {
            totalAvailableVal += bal;
          }
        }
      });

      balanceHistory.push({
        dayIndex: i,
        date: dayLabel,
        monthYear: monthYearLabel,
        available: parseFloat(totalAvailableVal.toFixed(2)),
        credit: parseFloat(totalCreditVal.toFixed(2)),
        total: parseFloat((totalAvailableVal + totalCreditVal).toFixed(2))
      });

      // Apply deltas in reverse (subtract delta to go backward)
      const dayDeltas = deltaMap[dateKey] || {};
      for (const [accId, delta] of Object.entries(dayDeltas)) {
        if (runningBalances[accId] !== undefined) {
          runningBalances[accId] -= delta;
        }
      }
    }

    balanceHistory.reverse();

    // 8. Category spending map for budgets & insights
    const categoryMap = {};
    expensesByCategory.forEach(cat => {
      categoryMap[cat.id.toString()] = {
        amount: cat.amount,
        name: cat.name,
        icon: cat.icon,
        color: cat.color
      };
    });

    const recentCategoryMap = {};
    if (recentExpensesByCategory && Array.isArray(recentExpensesByCategory)) {
      recentExpensesByCategory.forEach(item => {
        if (item._id) {
          recentCategoryMap[item._id.toString()] = item.totalSpent;
        }
      });
    }

    // 9. Notifications Aggregation
    const prefs = req.user.preferences || {};
    const enableBudgetAlerts = prefs.enableBudgetAlerts !== false;
    const enableScheduledAlerts = prefs.enableScheduledAlerts !== false;
    const enableSavingsAlerts = prefs.enableSavingsAlerts !== false;
    const enableLowBalanceAlerts = prefs.enableLowBalanceAlerts !== false;
    const enableAiInsightsAlerts = prefs.enableAiInsightsAlerts !== false;
    const lowBalanceThreshold = prefs.lowBalanceThreshold !== undefined ? prefs.lowBalanceThreshold : 100;
    const anomalyThreshold = prefs.anomalyThreshold !== undefined ? prefs.anomalyThreshold : 30;

    const notifications = [];
    const budgetAlerts = [];

    // a. Budgets
    budgets.forEach(budget => {
      const catId = budget.categoryId?._id?.toString() || budget.categoryId?.toString();
      const spent = budget.spent;
      const percentage = budget.percentage;
      
      if (percentage >= budget.alertAt) {
        const alertItem = {
          id: budget._id,
          name: budget.name,
          categoryName: budget.categoryId?.name,
          icon: budget.categoryId?.icon,
          percentage: percentage,
          spent: spent,
          amount: budget.amount
        };
        budgetAlerts.push(alertItem);

        if (enableBudgetAlerts) {
          notifications.push({
            id: `budget-${budget._id}-${percentage >= 100 ? 'exceeded' : 'warning'}`,
            type: 'budget',
            title: percentage >= 100 ? `Budget ${budget.name} dépassé !` : `Budget ${budget.name} presque atteint`,
            message: `Vous avez dépensé ${spent.toFixed(2)} € sur les ${budget.amount.toFixed(2)} € alloués (${Math.round(percentage)}%).`,
            icon: budget.categoryId?.icon || 'AlertTriangle',
            color: percentage >= 100 ? 'danger' : 'warning',
            percentage: percentage,
            action: { label: 'Gérer les budgets', path: '/budgets' }
          });
        }
      }

      // Proactive Velocity Alert
      if (budget.period === 'monthly' || !budget.period) {
        if (catId && currentDay < 20) {
          const remainingBudget = budget.amount - spent;
          const recentSpent = recentCategoryMap[catId] || 0;
          const actualVelocity = recentSpent / daysCount;
          
          const totalDaysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
          const daysRemaining = totalDaysInMonth - currentDay + 1;
          const targetVelocity = remainingBudget > 0 && daysRemaining > 0 ? remainingBudget / daysRemaining : 0;

          if (actualVelocity > targetVelocity && remainingBudget > 0) {
            const daysToDepletion = remainingBudget / actualVelocity;
            const depletionDate = new Date(now);
            depletionDate.setDate(now.getDate() + Math.ceil(daysToDepletion));

            if (depletionDate.getMonth() === now.getMonth() &&
                depletionDate.getFullYear() === now.getFullYear() &&
                depletionDate.getDate() < 20) {
              
              if (enableBudgetAlerts) {
                notifications.push({
                  id: `velocity-${budget._id}`,
                  type: 'budget',
                  title: `Alerte Vélocité Proactive ⚠️`,
                  message: `Au rythme actuel de dépenses (${actualVelocity.toFixed(2)} €/j au lieu de ${targetVelocity.toFixed(2)} €/j), votre budget "${budget.name}" sera épuisé le ${depletionDate.toLocaleDateString('fr-FR')}, soit avant le 20 du mois.`,
                  icon: 'Flame',
                  color: 'danger',
                  action: { label: 'Voir le rythme', path: '/charts' }
                });
              }
            }
          }
        }
      }
    });

    // b. Scheduled & Pending Transactions
    if (enableScheduledAlerts) {
      pendingTxs.forEach(tx => {
        notifications.push({
          id: `pending-${tx._id}`,
          type: 'scheduled',
          title: 'Transaction en attente',
          message: `La transaction planifiée '${tx.description}' (${tx.amount.toFixed(2)} €) attend votre confirmation.`,
          icon: tx.categoryId?.icon || 'Clock',
          color: 'info',
          action: { label: 'Valider', path: '/scheduled' }
        });
      });

      upcomingSchedules.forEach(st => {
        notifications.push({
          id: `upcoming-${st._id}-${st.nextDate.getTime()}`,
          type: 'scheduled',
          title: st.isSubscription ? 'Abonnement à venir' : 'Prélèvement à venir',
          message: `La planification '${st.description}' (${st.amount.toFixed(2)} €) est prévue pour le ${new Date(st.nextDate).toLocaleDateString('fr-FR')}.`,
          icon: st.categoryId?.icon || 'Calendar',
          color: 'info',
          action: { label: 'Voir l\'agenda', path: '/scheduled' }
        });
      });
    }

    // c. Savings Goals
    if (enableSavingsAlerts) {
      const weekFromNow = new Date();
      weekFromNow.setDate(now.getDate() + 7);

      savingsGoals.forEach(goal => {
        const percentage = (goal.currentAmount / goal.targetAmount) * 100;
        if (goal.currentAmount >= goal.targetAmount) {
          notifications.push({
            id: `savings-completed-${goal._id}`,
            type: 'savings',
            title: 'Objectif atteint ! 🎉',
            message: `Félicitations ! Votre objectif d'épargne '${goal.name}' est entièrement financé (${goal.targetAmount.toFixed(2)} €).`,
            icon: goal.icon || '💰',
            color: 'success',
            percentage: percentage,
            action: { label: 'Voir l\'épargne', path: '/savings' }
          });
        } else if (goal.targetDate && goal.targetDate > now && goal.targetDate <= weekFromNow) {
          const diff = goal.targetAmount - goal.currentAmount;
          notifications.push({
            id: `savings-deadline-${goal._id}`,
            type: 'savings',
            title: 'Échéance d\'épargne proche',
            message: `L'échéance de l'objectif '${goal.name}' est le ${new Date(goal.targetDate).toLocaleDateString('fr-FR')}. Il vous manque encore ${diff.toFixed(2)} € (${Math.round(percentage)}% complété).`,
            icon: goal.icon || '💰',
            color: 'warning',
            percentage: percentage,
            action: { label: 'Épargner', path: '/savings' }
          });
        }
      });
    }

    // d. Low Balances
    if (enableLowBalanceAlerts) {
      accounts.forEach(acc => {
        if (acc.includeInTotal !== false && acc.type !== 'credit' && acc.type !== 'investment') {
          if (acc.balance < lowBalanceThreshold) {
            notifications.push({
              id: `balance-low-${acc._id}`,
              type: 'balance',
              title: `Solde bas sur ${acc.name}`,
              message: `Le solde de votre compte '${acc.name}' est de ${acc.balance.toFixed(2)} € (seuil: ${lowBalanceThreshold.toFixed(2)} €).`,
              icon: acc.icon || 'Wallet',
              color: 'danger',
              action: { label: 'Gérer les comptes', path: '/' }
            });
          }
        }
      });
    }

    // e. AI Insights / Spending Anomalies
    if (enableAiInsightsAlerts) {
      if (oldestTx) {
        const oldestDate = new Date(oldestTx.date);
        const months = [];
        for (let i = 1; i <= 3; i++) {
          const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1, 0, 0, 0, 0));
          const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i + 1, 0, 23, 59, 59, 999));
          if (end >= oldestDate) {
            months.push({ start, end });
          }
        }

        if (months.length >= 2) {
          const startOfHistory = months[months.length - 1].start;
          const endOfHistory = months[0].end;
          
          const historyTotals = await Transaction.aggregate([
            {
              $match: {
                userId: toObjectId(userId),
                type: 'expense',
                date: { $gte: startOfHistory, $lte: endOfHistory },
                isPending: { $ne: true }
              }
            },
            {
              $group: {
                _id: '$categoryId',
                total: { $sum: '$amount' }
              }
            }
          ]);

          const categoryTotals = {};
          historyTotals.forEach(item => {
            if (item._id) {
              categoryTotals[item._id.toString()] = item.total;
            }
          });

          const thresholdPercent = anomalyThreshold / 100;
          const numHistoryMonths = months.length;

          for (const [catId, currentData] of Object.entries(categoryMap)) {
            const historyTotal = categoryTotals[catId] || 0;
            const historyAverage = historyTotal / numHistoryMonths;
            const currentAmount = currentData.amount;

            if (historyAverage > 0 && currentAmount > historyAverage * (1 + thresholdPercent)) {
              const diffPercent = ((currentAmount - historyAverage) / historyAverage) * 100;
              notifications.push({
                id: `anomaly-${catId}`,
                type: 'insight',
                title: `Dépenses élevées en ${currentData.name}`,
                message: `Vos dépenses en '${currentData.name}' (${currentAmount.toFixed(2)} €) dépassent de ${Math.round(diffPercent)}% votre moyenne habituelle.`,
                icon: currentData.icon || 'Sparkles',
                color: diffPercent >= 60 ? 'danger' : 'warning',
                action: { label: 'Voir l\'analyse', path: '/charts' }
              });
            }
          }
        }
      }
    }

    // Calculate actual categorization rate
    const totalTxCount = await Transaction.countDocuments({ userId, type: 'expense' });
    const categorizedTxCount = await Transaction.countDocuments({ userId, type: 'expense', categoryId: { $ne: null } });
    const categorizationRate = totalTxCount > 0 ? Math.round((categorizedTxCount / totalTxCount) * 100) : 100;

    // 10. Compile final payload
    const dashboardPayload = {
      totalBalance,
      totalAvailable,
      totalCredit,
      categorizationRate,
      accounts,
      budgets,
      savingsGoals,
      month: {
        income: currentIncome,
        expenses: currentExpenses,
        net: currentIncome - currentExpenses,
        incomeVsLastMonth: incomeChange,
        expensesVsLastMonth: expenseChange
      },
      lastMonth: {
        income: lastIncome,
        expenses: lastExpenses,
        net: lastIncome - lastExpenses
      },
      dailyExpenses,
      last7DaysExpenses,
      balanceHistory,
      expensesByCategory: expensesByCategory.map(cat => ({
        id: cat.id,
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
        amount: cat.amount,
        percentage: currentExpenses > 0 ? (cat.amount / currentExpenses) * 100 : 0
      })).slice(0, 5),
      recentTransactions,
      budgetAlerts,
      notifications
    };

    // Store in cache (2 minutes TTL)
    dashboardCache.set(userId, dashboardPayload);

    res.json(dashboardPayload);

  } catch (error) {
    logger.error((error as Error).message);
    res.status(500).json({ message: 'Server Error during dashboard aggregation' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// FINANCIAL SCORE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute the monthly financial score for a given monthKey (YYYY-MM).
 * Returns a detailed breakdown of all 5 pillars + savings goal bonus.
 */
const computeMonthScore = async (userId, monthKey) => {
  const [yearStr, monthStr] = monthKey.split('-');
  const year = parseInt(yearStr);
  const month = parseInt(monthStr) - 1; // 0-indexed

  const startOfMonth = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  const endOfMonth   = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));

  // ── Fetch accounts ──────────────────────────────────────────────────────────
  const rawAccounts = await Account.find({ userId }).lean();
  const checkingAccounts = rawAccounts.filter(a => a.type === 'checking');
  const savingsAccounts  = rawAccounts.filter(a => a.type === 'savings');
  const allIncludedAccounts = rawAccounts.filter(a => a.includeInTotal !== false);

  const checkingIds = checkingAccounts.map(a => a._id);
  const savingsIds  = savingsAccounts.map(a => a._id);
  const allIncludedIds = allIncludedAccounts.map(a => a._id);

  const checkingObjectIds     = checkingIds.map(toObjectId);
  const savingsObjectIds      = savingsIds.map(toObjectId);
  const allIncludedObjectIds  = allIncludedIds.map(toObjectId);

  const userObjectId = toObjectId(userId);

  // ── Helper: determine previous month key ────────────────────────────────────
  const prevDate = new Date(Date.UTC(year, month - 1, 1));
  const prevMonthKey = `${prevDate.getUTCFullYear()}-${String(prevDate.getUTCMonth() + 1).padStart(2, '0')}`;

  // ── Fetch all transactions in the month ─────────────────────────────────────
  const monthTransactions = await Transaction.find({
    userId,
    isPending: { $ne: true },
    date: { $gte: startOfMonth, $lte: endOfMonth }
  }).populate('toAccountId', 'type').lean();

  // ── Pilier 1 : Taux d'épargne ───────────────────────────────────────────────
  // Income = income transactions on checking accounts
  // Savings transfers = transfers FROM checking TO savings (counted as savings, not expense)
  // Pure expenses = expense transactions on checking accounts
  let pillar1Income = 0;
  let pillar1Expenses = 0; // consumption only (excludes savings transfers)
  let pillar1Savings = 0;  // net savings transfers TO savings accounts

  for (const tx of monthTransactions) {
    const srcIsChecking = checkingIds.some(id => id.toString() === tx.accountId?.toString());
    const dstIsSavings  = savingsIds.some(id => id.toString() === tx.toAccountId?.toString());
    const srcIsSavings  = savingsIds.some(id => id.toString() === tx.accountId?.toString());

    if (tx.type === 'income' && srcIsChecking) {
      pillar1Income += tx.amount;
    } else if (tx.type === 'expense' && srcIsChecking) {
      pillar1Expenses += tx.amount;
    } else if (tx.type === 'transfer') {
      if (srcIsChecking && dstIsSavings) {
        // Transfer to savings → counts as savings, NOT expense
        pillar1Savings += tx.amount;
      }
      // Other transfers (checking→checking, savings→checking) → neutral
    }
  }

  const pillar1TotalSavings = pillar1Savings; // not counting net income - expenses here; savings = explicit savings transfers
  const savingsRate = pillar1Income > 0 ? ((pillar1Income - pillar1Expenses) / pillar1Income) * 100 : 0;
  let pillar1Score = 0;
  if (savingsRate >= 20) pillar1Score = 30;
  else if (savingsRate >= 10) pillar1Score = 20;
  else if (savingsRate >= 0) pillar1Score = 10;
  else pillar1Score = 0;

  // ── Pilier 2 : Respect des budgets ──────────────────────────────────────────
  const budgets = await Budget.find({ userId, period: 'monthly' }).lean();
  let pillar2Score = null; // null = no budgets defined
  let pillar2Details = { totalBudget: 0, totalOverrun: 0, budgetCount: 0 };

  if (budgets.length > 0) {
    // Aggregate spending by category for the month (checking accounts only)
    const expByCategory = {};
    for (const tx of monthTransactions) {
      if (tx.type === 'expense' && checkingIds.some(id => id.toString() === tx.accountId?.toString())) {
        const catId = tx.categoryId?.toString();
        if (catId) {
          expByCategory[catId] = (expByCategory[catId] || 0) + tx.amount;
        }
      }
    }

    let totalBudget  = 0;
    let totalOverrun = 0;
    for (const b of budgets) {
      const catId = b.categoryId?.toString();
      const spent  = catId ? (expByCategory[catId] || 0) : 0;
      const overrun = Math.max(0, spent - b.amount);
      totalBudget  += b.amount;
      totalOverrun += overrun;
    }

    pillar2Details = { totalBudget, totalOverrun, budgetCount: budgets.length };
    const ratio = totalBudget > 0 ? Math.max(0, 1 - totalOverrun / totalBudget) : 1;
    pillar2Score = Math.round(ratio * 25);
  }

  let fixedCharges = 0;
  for (const tx of monthTransactions) {
    if (
      tx.isScheduled === true &&
      checkingIds.some(id => id.toString() === tx.accountId?.toString()) &&
      (tx.type === 'expense' || (tx.type === 'transfer' && tx.toAccountId?.type === 'credit'))
    ) {
      fixedCharges += tx.amount;
    }
  }

  const fixedRatio = pillar1Income > 0 ? (fixedCharges / pillar1Income) * 100 : 0;
  let pillar3Score = 0;
  if (fixedRatio < 50) pillar3Score = 20;
  else if (fixedRatio < 65) pillar3Score = 12;
  else if (fixedRatio < 75) pillar3Score = 5;
  else pillar3Score = 0;

  // ── Pilier 4 : Évolution du patrimoine global ────────────────────────────────
  // Reconstruct patrimonies at start & end of month using delta sweep
  let pillar4Score = 0;
  let patrimoineStart = null;
  let patrimoineEnd   = null;

  if (allIncludedObjectIds.length > 0) {
    // Current balances (today's snapshot)
    const currentPatrimoine = allIncludedAccounts.reduce((sum, a) => sum + a.balance, 0);

    // Get all transactions AFTER end of month up to today, to compute patrimoine at end of month
    const now = new Date();
    const txsAfterMonth = await Transaction.find({
      userId,
      isPending: { $ne: true },
      date: { $gt: endOfMonth, $lte: now },
      $or: [
        { accountId: { $in: allIncludedIds } },
        { toAccountId: { $in: allIncludedIds } }
      ]
    }).lean();

    let deltaAfterMonth = 0;
    for (const tx of txsAfterMonth) {
      const srcIncluded = allIncludedIds.some(id => id.toString() === tx.accountId?.toString());
      const dstIncluded = allIncludedIds.some(id => id.toString() === tx.toAccountId?.toString());

      if (tx.type === 'income' && srcIncluded) deltaAfterMonth += tx.amount;
      else if (tx.type === 'expense' && srcIncluded) deltaAfterMonth -= tx.amount;
      else if (tx.type === 'transfer') {
        if (srcIncluded && !dstIncluded) deltaAfterMonth -= tx.amount;
        else if (!srcIncluded && dstIncluded) deltaAfterMonth += tx.amount;
        // both included → neutral for global patrimony
      }
    }

    // Patrimony at end of month = current - changes that happened after month
    patrimoineEnd = currentPatrimoine - deltaAfterMonth;

    // Patrimony at start of month = patrimoineEnd minus the month's own delta
    let deltaInMonth = 0;
    for (const tx of monthTransactions) {
      const srcIncluded = allIncludedIds.some(id => id.toString() === tx.accountId?.toString());
      const dstIncluded = allIncludedIds.some(id => id.toString() === tx.toAccountId?.toString());

      if (tx.type === 'income' && srcIncluded) deltaInMonth += tx.amount;
      else if (tx.type === 'expense' && srcIncluded) deltaInMonth -= tx.amount;
      else if (tx.type === 'transfer') {
        if (srcIncluded && !dstIncluded) deltaInMonth -= tx.amount;
        else if (!srcIncluded && dstIncluded) deltaInMonth += tx.amount;
      }
    }

    patrimoineStart = patrimoineEnd - deltaInMonth;

    if (patrimoineStart !== null && patrimoineStart !== 0) {
      const evolution = ((patrimoineEnd - patrimoineStart) / Math.abs(patrimoineStart)) * 100;
      if (evolution > 1) pillar4Score = 15;
      else if (evolution >= -1) pillar4Score = 8;
      else pillar4Score = 0;
    }
    // If first month (no prior data), patrimoineStart stays 0 → 0 pts
  }

  // ── Pilier 5 : Matelas de sécurité ───────────────────────────────────────────
  // Minimum balance reached on checking accounts during the month
  let pillar5Score = 0;

  if (checkingIds.length > 0 && fixedCharges > 0) {
    // Reconstruct daily checking balance using delta sweep from current balance
    const currentCheckingBalance = checkingAccounts.reduce((sum, a) => sum + a.balance, 0);

    // Get transactions after end of month (to rewind to end-of-month state)
    const now2 = new Date();
    const txsAfterForChecking = await Transaction.find({
      userId,
      isPending: { $ne: true },
      date: { $gt: endOfMonth, $lte: now2 },
      $or: [
        { accountId: { $in: checkingIds } },
        { toAccountId: { $in: checkingIds } }
      ]
    }).lean();

    let checkingDeltaAfter = 0;
    for (const tx of txsAfterForChecking) {
      const srcChecking = checkingIds.some(id => id.toString() === tx.accountId?.toString());
      const dstChecking = checkingIds.some(id => id.toString() === tx.toAccountId?.toString());
      if (tx.type === 'income' && srcChecking) checkingDeltaAfter += tx.amount;
      else if (tx.type === 'expense' && srcChecking) checkingDeltaAfter -= tx.amount;
      else if (tx.type === 'transfer') {
        if (srcChecking && !dstChecking) checkingDeltaAfter -= tx.amount;
        else if (!srcChecking && dstChecking) checkingDeltaAfter += tx.amount;
      }
    }

    // Balance at end of month
    let runningChecking = currentCheckingBalance - checkingDeltaAfter;

    // Sort month transactions descending to sweep backwards day by day
    const monthCheckingTxs = monthTransactions
      .filter(tx =>
        checkingIds.some(id => id.toString() === tx.accountId?.toString()) ||
        checkingIds.some(id => id.toString() === tx.toAccountId?.toString())
      )
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    let minBalance = runningChecking;

    for (const tx of monthCheckingTxs) {
      const srcChecking = checkingIds.some(id => id.toString() === tx.accountId?.toString());
      const dstChecking = checkingIds.some(id => id.toString() === tx.toAccountId?.toString());

      // Undo the transaction (go backwards)
      if (tx.type === 'income' && srcChecking) runningChecking -= tx.amount;
      else if (tx.type === 'expense' && srcChecking) runningChecking += tx.amount;
      else if (tx.type === 'transfer') {
        if (srcChecking && !dstChecking) runningChecking += tx.amount;
        else if (!srcChecking && dstChecking) runningChecking -= tx.amount;
      }

      if (runningChecking < minBalance) minBalance = runningChecking;
    }

    const cushionRatio = minBalance / fixedCharges;
    pillar5Score = Math.min(10, Math.max(0, parseFloat((cushionRatio * 10).toFixed(2))));
    pillar5Score = Math.round(pillar5Score * 10) / 10;
  } else if (checkingIds.length > 0 && fixedCharges === 0) {
    // No fixed charges → full score for this pillar
    pillar5Score = 10;
  }

  // ── Redistribution si aucun budget ──────────────────────────────────────────
  // Base scores (without budget pillar if not applicable)
  let finalScore;
  const hasBudgets = pillar2Score !== null;

  if (hasBudgets) {
    finalScore = pillar1Score + pillar2Score + pillar3Score + pillar4Score + Math.round(pillar5Score);
  } else {
    // Redistribute 25 pts proportionally among other pillars
    // Ratios: P1=30, P3=20, P4=15, P5=10 → total 75
    const baseTotal = 75;
    const redistribute = 25;
    const p1Adjusted = pillar1Score + Math.round((30 / baseTotal) * pillar1Score * redistribute / 30);
    // Simpler: just scale the raw score over 100
    const rawScore = pillar1Score + pillar3Score + pillar4Score + Math.round(pillar5Score);
    finalScore = Math.round((rawScore / 75) * 100);
  }
  finalScore = Math.min(100, Math.max(0, finalScore));

  // ── Bonus objectifs d'épargne ─────────────────────────────────────────────
  const savingsGoals = await SavingsGoal.find({ userId }).lean();
  let bonusScore = 0;
  let bonusDetails = [];

  const activeGoals = savingsGoals.filter(g =>
    g.currentAmount < g.targetAmount && g.targetDate && new Date(g.targetDate) > endOfMonth
  );

  if (activeGoals.length > 0) {
    let allOnTrackOrAhead = true;
    let allAhead = true;

    for (const goal of activeGoals) {
      const totalDuration = new Date(goal.targetDate) - new Date(goal.startDate);
      const elapsed = endOfMonth - new Date(goal.startDate);
      const timeProgress = totalDuration > 0 ? Math.min(1, Math.max(0, elapsed / totalDuration)) : 0;
      const expectedAmount = goal.targetAmount * timeProgress;

      let status;
      if (goal.currentAmount >= expectedAmount * 1.05) {
        status = 'ahead';
      } else if (goal.currentAmount >= expectedAmount * 0.95) {
        status = 'ontrack';
      } else {
        status = 'behind';
        allOnTrackOrAhead = false;
        allAhead = false;
      }

      if (status === 'ontrack') allAhead = false;

      bonusDetails.push({
        goalId: goal._id,
        name: goal.name,
        status,
        currentAmount: goal.currentAmount,
        expectedAmount: parseFloat(expectedAmount.toFixed(2)),
        targetAmount: goal.targetAmount,
        timeProgress: parseFloat((timeProgress * 100).toFixed(1))
      });
    }

    if (allAhead) bonusScore = 5;
    else if (allOnTrackOrAhead) bonusScore = 2;
    else bonusScore = 0;
  }

  // ── Grade ─────────────────────────────────────────────────────────────────
  const totalWithBonus = Math.min(105, finalScore + bonusScore);
  let grade;
  if (finalScore >= 80) grade = 'A';
  else if (finalScore >= 60) grade = 'B';
  else if (finalScore >= 40) grade = 'C';
  else grade = 'D';

  return {
    monthKey,
    score: finalScore,
    grade,
    bonusScore,
    totalWithBonus,
    pillars: {
      savingsRate: {
        score: pillar1Score,
        maxScore: hasBudgets ? 30 : Math.round((30 / 75) * 100),
        savingsRate: parseFloat(savingsRate.toFixed(1)),
        income: parseFloat(pillar1Income.toFixed(2)),
        expenses: parseFloat(pillar1Expenses.toFixed(2)),
        savingsTransfers: parseFloat(pillar1TotalSavings.toFixed(2))
      },
      budgets: {
        score: pillar2Score,
        maxScore: 25,
        applicable: hasBudgets,
        totalBudget: parseFloat(pillar2Details.totalBudget.toFixed(2)),
        totalOverrun: parseFloat(pillar2Details.totalOverrun.toFixed(2)),
        budgetCount: pillar2Details.budgetCount
      },
      fixedCharges: {
        score: pillar3Score,
        maxScore: hasBudgets ? 20 : Math.round((20 / 75) * 100),
        fixedCharges: parseFloat(fixedCharges.toFixed(2)),
        income: parseFloat(pillar1Income.toFixed(2)),
        ratio: parseFloat(fixedRatio.toFixed(1))
      },
      patrimony: {
        score: pillar4Score,
        maxScore: hasBudgets ? 15 : Math.round((15 / 75) * 100),
        patrimoineStart: patrimoineStart !== null ? parseFloat(patrimoineStart.toFixed(2)) : null,
        patrimoineEnd: patrimoineEnd !== null ? parseFloat(patrimoineEnd.toFixed(2)) : null
      },
      cushion: {
        score: pillar5Score,
        maxScore: hasBudgets ? 10 : Math.round((10 / 75) * 100),
        fixedCharges: parseFloat(fixedCharges.toFixed(2))
      }
    },
    savingsGoalsBonus: {
      bonusScore,
      goals: bonusDetails
    }
  };
};

export const getMonthlyScore = async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    const defaultMonthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
    const monthKey = req.query.monthKey || defaultMonthKey;

    // Validate monthKey format
    if (!/^\d{4}-\d{2}$/.test(monthKey)) {
      return res.status(400).json({ message: 'monthKey must be in YYYY-MM format' });
    }

    const result = await computeMonthScore(userId, monthKey);
    res.json(result);
  } catch (error) {
    logger.error('Error computing monthly score:', { error: (error as Error).message });
    res.status(500).json({ message: 'Server Error during score computation' });
  }
};

export const getMonthlyScoreHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    const currentYear = now.getUTCFullYear();
    const year = parseInt(req.query.year) || currentYear;

    // Determine available years from transaction range
    const oldestTx = await Transaction.findOne({ userId, isPending: { $ne: true } }).sort({ date: 1 }).lean();
    const newestTx  = await Transaction.findOne({ userId, isPending: { $ne: true } }).sort({ date: -1 }).lean();

    const availableYearsSet = new Set([currentYear, year]);
    if (oldestTx && newestTx) {
      const minYear = new Date(oldestTx.date).getUTCFullYear();
      const maxYear = new Date(newestTx.date).getUTCFullYear();
      for (let y = minYear; y <= maxYear; y++) availableYearsSet.add(y);
    }
    const availableYears = Array.from(availableYearsSet).sort((a, b) => b - a);

    // Determine which months to compute
    const currentMonthIndex = now.getUTCMonth();
    const maxMonth = year === currentYear ? currentMonthIndex : 11;

    const scorePromises = [];
    for (let m = 0; m <= maxMonth; m++) {
      const monthKey = `${year}-${String(m + 1).padStart(2, '0')}`;
      scorePromises.push(computeMonthScore(userId, monthKey));
    }

    const scores = await Promise.all(scorePromises);
    // Return newest first
    scores.sort((a, b) => b.monthKey.localeCompare(a.monthKey));

    res.json({ year, scores, availableYears });
  } catch (error) {
    logger.error('Error computing score history:', { error: (error as Error).message });
    res.status(500).json({ message: 'Server Error during score history computation' });
  }
};

export const getMonthlySummaries = async (req, res) => {
  try {
    const userId = req.user.id;
    const currentYear = new Date().getUTCFullYear();
    const year = parseInt(req.query.year) || currentYear;

    const startOfYear = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
    const endOfYear = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));

    // Fetch accounts first to only aggregate transactions from checking accounts
    const checkingAccounts = await Account.find({ userId, type: 'checking' }).select('_id').lean();
    const checkingAccountIds = checkingAccounts.map(acc => acc._id);

    // Group transactions by month
    const monthlyData = Array.from({ length: 12 }, (_, i) => ({
      monthIndex: i, // 0 to 11
      income: 0,
      expenses: 0,
      net: 0
    }));

    if (checkingAccountIds.length > 0) {
      const checkingAccountObjectIds = checkingAccountIds.map(toObjectId);
      const userObjectId = toObjectId(userId);

      const aggregates = await Transaction.aggregate([
        {
          $match: {
            userId: userObjectId,
            isPending: { $ne: true },
            date: { $gte: startOfYear, $lte: endOfYear },
            $or: [
              { accountId: { $in: checkingAccountObjectIds } },
              { toAccountId: { $in: checkingAccountObjectIds } }
            ]
          }
        },
        {
          $project: {
            monthIndex: { $subtract: [{ $month: "$date" }, 1] }, // convert 1-12 to 0-11
            type: 1,
            amount: 1,
            accountId: 1,
            toAccountId: 1,
            isSourceChecking: { $in: ["$accountId", checkingAccountObjectIds] },
            isDestChecking: {
              $cond: {
                if: { $ne: ["$toAccountId", null] },
                then: { $in: ["$toAccountId", checkingAccountObjectIds] },
                else: false
              }
            }
          }
        },
        {
          $group: {
            _id: "$monthIndex",
            income: {
              $sum: {
                $cond: [
                  {
                    $or: [
                      { $and: [{ $eq: ["$type", "income"] }, "$isSourceChecking"] },
                      { $and: [{ $eq: ["$type", "transfer"] }, { $not: ["$isSourceChecking"] }, "$isDestChecking"] }
                    ]
                  },
                  "$amount",
                  0
                ]
              }
            },
            expenses: {
              $sum: {
                $cond: [
                  {
                    $or: [
                      { $and: [{ $eq: ["$type", "expense"] }, "$isSourceChecking"] },
                      { $and: [{ $eq: ["$type", "transfer"] }, "$isSourceChecking", { $not: ["$isDestChecking"] }] }
                    ]
                  },
                  "$amount",
                  0
                ]
              }
            }
          }
        }
      ]);

      aggregates.forEach(item => {
        const mIdx = item._id;
        if (mIdx >= 0 && mIdx < 12) {
          monthlyData[mIdx].income = parseFloat(item.income.toFixed(2));
          monthlyData[mIdx].expenses = parseFloat(item.expenses.toFixed(2));
          monthlyData[mIdx].net = parseFloat((item.income - item.expenses).toFixed(2));
        }
      });
    }

    // For the current year, filter out future months
    let filteredSummaries = monthlyData;
    const now = new Date();
    if (year === currentYear) {
      const currentMonthIndex = now.getUTCMonth(); // 0-indexed current month (UTC)
      filteredSummaries = monthlyData.filter(item => item.monthIndex <= currentMonthIndex);
    }

    // Sort newest month first (descending monthIndex)
    filteredSummaries.sort((a, b) => b.monthIndex - a.monthIndex);

    // Fetch range of years where the user has transactions to determine availableYears
    const oldestTx = await Transaction.findOne({ userId, isPending: { $ne: true } }).sort({ date: 1 }).lean();
    const newestTx = await Transaction.findOne({ userId, isPending: { $ne: true } }).sort({ date: -1 }).lean();

    const availableYearsSet = new Set();
    availableYearsSet.add(currentYear); // Always include current year
    availableYearsSet.add(year); // Always include requested year

    if (oldestTx && newestTx) {
      const minYear = new Date(oldestTx.date).getUTCFullYear();
      const maxYear = new Date(newestTx.date).getUTCFullYear();
      for (let y = minYear; y <= maxYear; y++) {
        availableYearsSet.add(y);
      }
    }

    const availableYears = Array.from(availableYearsSet).sort((a, b) => b - a);

    res.json({
      year,
      summaries: filteredSummaries,
      availableYears
    });

  } catch (error) {
    logger.error('Error fetching monthly summaries:', { error: (error as Error).message });
    res.status(500).json({ message: 'Server Error during monthly summaries fetch' });
  }
};
