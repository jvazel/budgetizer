import Account from '../models/Account.js';
import Transaction from '../models/Transaction.js';
import Budget from '../models/Budget.js';
import SavingsGoal from '../models/SavingsGoal.js';
import ScheduledTransaction from '../models/ScheduledTransaction.js';
import mongoose from 'mongoose';

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

    // 2. Fetch other collections and perform database-level calculations in parallel
    const [
      currentMonthStats,
      lastMonthStats,
      currentMonthDailyMap,
      last7DaysDailyMap,
      expensesByCategory,
      dailyAccountDeltas,
      budgets,
      pendingTxs,
      upcomingSchedules,
      savingsGoals,
      oldestTx,
      recentTransactions
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
      }).populate('categoryId', 'name icon').lean(),
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
      .lean()
    ]);

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
      const spent = catId ? (categoryMap[catId]?.amount || 0) : 0;
      const percentage = (spent / budget.amount) * 100;
      
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

    // 10. Compile final payload
    res.json({
      totalBalance,
      totalAvailable,
      totalCredit,
      accounts,
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
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error during dashboard aggregation' });
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
    console.error('Error fetching monthly summaries:', error);
    res.status(500).json({ message: 'Server Error during monthly summaries fetch' });
  }
};
