import Account from '../models/Account.js';
import Transaction from '../models/Transaction.js';
import Budget from '../models/Budget.js';
import SavingsGoal from '../models/SavingsGoal.js';
import ScheduledTransaction from '../models/ScheduledTransaction.js';
import mongoose from 'mongoose';

export const getDashboardSummary = async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    
    // Dates for current month
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    
    // Dates for previous month
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    // 1. Fetch Accounts & Total Balance & Last Transaction Date
    const rawAccounts = await Account.find({ userId });

    const lastTxs = await Transaction.aggregate([
      { $match: { userId: mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId } },
      {
        $project: {
          date: 1,
          accounts: {
            $filter: {
              input: ["$accountId", "$toAccountId"],
              as: "acc",
              cond: { $ne: ["$$acc", null] }
            }
          }
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
    lastTxs.forEach(t => {
      if (t._id) {
        lastTxMap[t._id.toString()] = t.lastTransactionDate;
      }
    });

    const accounts = rawAccounts.map(account => {
      const accId = account._id.toString();
      return {
        ...account.toObject(),
        lastTransactionDate: lastTxMap[accId] || null
      };
    });
    const totalBalance = rawAccounts.reduce((acc, account) => acc + account.balance, 0);
    const totalAvailable = rawAccounts.filter(acc => acc.type !== 'credit').reduce((sum, acc) => sum + acc.balance, 0);
    const totalCredit = rawAccounts.filter(acc => acc.type === 'credit').reduce((sum, acc) => sum + acc.balance, 0);

    // 2. Transactions for Current Month
    const currentMonthTxs = await Transaction.find({
      userId,
      date: { $gte: startOfCurrentMonth, $lte: endOfCurrentMonth }
    }).populate('categoryId', 'name icon color type').sort({ date: -1 });

    // 3. Transactions for Last Month (for comparison)
    const lastMonthTxs = await Transaction.find({
      userId,
      date: { $gte: startOfLastMonth, $lte: endOfLastMonth }
    }).select('type amount');

    // 4. Calculate Income/Expenses for Current Month
    let currentIncome = 0;
    let currentExpenses = 0;
    currentMonthTxs.forEach(tx => {
      if (tx.type === 'income') currentIncome += tx.amount;
      if (tx.type === 'expense') currentExpenses += tx.amount;
    });

    // 5. Calculate Income/Expenses for Last Month
    let lastIncome = 0;
    let lastExpenses = 0;
    lastMonthTxs.forEach(tx => {
      if (tx.type === 'income') lastIncome += tx.amount;
      if (tx.type === 'expense') lastExpenses += tx.amount;
    });

    // 6. Calculate % changes (safeguard against division by zero)
    const calcChange = (current, last) => {
      if (last === 0) return current > 0 ? 100 : 0;
      return ((current - last) / last) * 100;
    };
    
    const incomeChange = calcChange(currentIncome, lastIncome);
    const expenseChange = calcChange(currentExpenses, lastExpenses);

    // 7. Group Daily Expenses for Chart
    // Create an array for all days of the current month up to today
    const dailyExpensesMap = {};
    const daysInMonth = now.getDate(); // Only up to today
    
    for (let i = 1; i <= daysInMonth; i++) {
      const dayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      dailyExpensesMap[dayStr] = 0;
    }

    currentMonthTxs.forEach(tx => {
      if (tx.type === 'expense' && tx.date <= now) {
        const d = new Date(tx.date);
        const dayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (dailyExpensesMap[dayStr] !== undefined) {
          dailyExpensesMap[dayStr] += tx.amount;
        }
      }
    });

    const dailyExpenses = Object.keys(dailyExpensesMap).sort().map(date => ({
      date: date.substring(8, 10), // just the day '01', '02'
      amount: dailyExpensesMap[date]
    }));

    // 7b. Group Daily Expenses for the last 7 days
    const startOf7DaysAgo = new Date(now);
    startOf7DaysAgo.setDate(now.getDate() - 6);
    startOf7DaysAgo.setHours(0, 0, 0, 0);

    const last7DaysTxs = await Transaction.find({
      userId,
      type: 'expense',
      date: { $gte: startOf7DaysAgo, $lte: now }
    }).select('date amount');

    const last7DaysExpenses = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dayStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
      const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
      const endOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
      
      const sum = last7DaysTxs
        .filter(tx => tx.date >= startOfDay && tx.date <= endOfDay)
        .reduce((acc, tx) => acc + tx.amount, 0);
        
      last7DaysExpenses.push({
        date: dayStr,
        amount: parseFloat(sum.toFixed(2))
      });
    }

    // 7c. Calculate historical available and credit balance evolution (180 days)
    const startOfHistory = new Date(now);
    startOfHistory.setDate(now.getDate() - 180);
    startOfHistory.setHours(0, 0, 0, 0);

    const historyTxs = await Transaction.find({
      userId,
      date: { $gte: startOfHistory, $lte: now }
    }).select('accountId toAccountId type amount date').sort({ date: -1 });

    const accountBalances = {};
    rawAccounts.forEach(acc => {
      accountBalances[acc._id.toString()] = acc.balance;
    });

    const formatDateKey = (date) => {
      const d = new Date(date);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    // Group transactions by date key for constant time lookup: O(N)
    const txsByDate = {};
    historyTxs.forEach(tx => {
      const dateKey = formatDateKey(tx.date);
      if (!txsByDate[dateKey]) {
        txsByDate[dateKey] = [];
      }
      txsByDate[dateKey].push(tx);
    });

    const balanceHistory = [];
    const runningBalances = { ...accountBalances };

    for (let i = 0; i <= 180; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dateKey = formatDateKey(d);
      
      const dayLabel = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthYearLabel = `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getFullYear()).substring(2)}`;
      
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

      const dayTxs = txsByDate[dateKey] || [];
      dayTxs.forEach(tx => {
        const accId = tx.accountId?.toString();
        const toAccId = tx.toAccountId?.toString();

        if (tx.type === 'expense') {
          if (accId && runningBalances[accId] !== undefined) {
            runningBalances[accId] += tx.amount;
          }
        } else if (tx.type === 'income') {
          if (accId && runningBalances[accId] !== undefined) {
            runningBalances[accId] -= tx.amount;
          }
        } else if (tx.type === 'transfer') {
          if (accId && runningBalances[accId] !== undefined) {
            runningBalances[accId] += tx.amount;
          }
          if (toAccId && runningBalances[toAccId] !== undefined) {
            runningBalances[toAccId] -= tx.amount;
          }
        }
      });
    }

    balanceHistory.reverse();

    // 8. Top Expenses by Category
    const categoryMap = {};
    currentMonthTxs.forEach(tx => {
      if (tx.type === 'expense' && tx.categoryId) {
        const catId = tx.categoryId._id.toString();
        if (!categoryMap[catId]) {
          categoryMap[catId] = {
            id: catId,
            name: tx.categoryId.name,
            icon: tx.categoryId.icon,
            color: tx.categoryId.color,
            amount: 0
          };
        }
        categoryMap[catId].amount += tx.amount;
      }
    });

    const expensesByCategory = Object.values(categoryMap)
      .sort((a, b) => b.amount - a.amount)
      .map(cat => ({
        ...cat,
        percentage: currentExpenses > 0 ? (cat.amount / currentExpenses) * 100 : 0
      }))
      .slice(0, 5); // Top 5

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
    const budgets = await Budget.find({ userId }).populate('categoryId', 'name icon');
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
      // Find pending transactions awaiting user validation
      const pendingTxs = await Transaction.find({ userId, isPending: true }).populate('categoryId', 'name icon');
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

      // Find upcoming transactions in the next 3 days
      const futureLimit = new Date();
      futureLimit.setDate(now.getDate() + 3);
      const upcomingSchedules = await ScheduledTransaction.find({
        userId,
        isActive: true,
        nextDate: { $gte: now, $lte: futureLimit }
      }).populate('categoryId', 'name icon');

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
      const savingsGoals = await SavingsGoal.find({ userId });
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
      const oldestTx = await Transaction.findOne({ userId }).sort({ date: 1 });
      if (oldestTx) {
        const oldestDate = new Date(oldestTx.date);
        
        // 3 previous months
        const months = [];
        for (let i = 1; i <= 3; i++) {
          const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
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
                userId: mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId,
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
      expensesByCategory,
      recentTransactions: currentMonthTxs.slice(0, 5),
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
    const currentYear = new Date().getFullYear();
    const year = parseInt(req.query.year) || currentYear;

    const startOfYear = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
    const endOfYear = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));

    // Fetch transactions within the specified year (exclude pending)
    const transactions = await Transaction.find({
      userId,
      date: { $gte: startOfYear, $lte: endOfYear },
      isPending: { $ne: true }
    });

    // Group transactions by month in memory
    const monthlyData = Array.from({ length: 12 }, (_, i) => ({
      monthIndex: i, // 0 to 11
      income: 0,
      expenses: 0,
      net: 0
    }));

    transactions.forEach(tx => {
      const txDate = new Date(tx.date);
      const monthIndex = txDate.getUTCMonth();
      if (monthIndex >= 0 && monthIndex < 12) {
        if (tx.type === 'income') {
          monthlyData[monthIndex].income += tx.amount;
        } else if (tx.type === 'expense') {
          monthlyData[monthIndex].expenses += tx.amount;
        }
      }
    });

    // Compute net and round
    monthlyData.forEach(item => {
      item.income = parseFloat(item.income.toFixed(2));
      item.expenses = parseFloat(item.expenses.toFixed(2));
      item.net = parseFloat((item.income - item.expenses).toFixed(2));
    });

    // For the current year, filter out future months
    let filteredSummaries = monthlyData;
    const now = new Date();
    if (year === currentYear) {
      const currentMonthIndex = now.getMonth(); // 0-indexed current month
      filteredSummaries = monthlyData.filter(item => item.monthIndex <= currentMonthIndex);
    }

    // Sort newest month first (descending monthIndex)
    filteredSummaries.sort((a, b) => b.monthIndex - a.monthIndex);

    // Fetch range of years where the user has transactions to determine availableYears
    const oldestTx = await Transaction.findOne({ userId, isPending: { $ne: true } }).sort({ date: 1 });
    const newestTx = await Transaction.findOne({ userId, isPending: { $ne: true } }).sort({ date: -1 });

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
