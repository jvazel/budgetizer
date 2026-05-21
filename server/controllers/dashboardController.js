import Account from '../models/Account.js';
import Transaction from '../models/Transaction.js';
import Budget from '../models/Budget.js';

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
    const accounts = await Promise.all(rawAccounts.map(async (account) => {
      const lastTx = await Transaction.findOne({
        userId,
        $or: [
          { accountId: account._id },
          { toAccountId: account._id }
        ]
      }).sort({ date: -1 });
      return {
        ...account.toObject(),
        lastTransactionDate: lastTx ? lastTx.date : null
      };
    }));
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
    });

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
    });

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
    }).sort({ date: -1 });

    const accountBalances = {};
    rawAccounts.forEach(acc => {
      accountBalances[acc._id.toString()] = acc.balance;
    });

    const txsByDayIndex = {};
    for (let i = 0; i <= 180; i++) {
      txsByDayIndex[i] = [];
    }

    historyTxs.forEach(tx => {
      const txDate = new Date(tx.date);
      const diffTime = now.getTime() - txDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays >= 0 && diffDays <= 180) {
        txsByDayIndex[diffDays].push(tx);
      }
    });

    const balanceHistory = [];
    const runningBalances = { ...accountBalances };

    for (let i = 0; i <= 180; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
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

      const dayTxs = txsByDayIndex[i] || [];
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

    // 9. Budget Alerts
    const budgets = await Budget.find({ userId }).populate('categoryId', 'name icon');
    const budgetAlerts = [];
    
    budgets.forEach(budget => {
      const spent = currentMonthTxs
        .filter(t => t.type === 'expense' && t.categoryId && t.categoryId._id.toString() === budget.categoryId._id.toString())
        .reduce((sum, t) => sum + t.amount, 0);
        
      const percentage = (spent / budget.amount) * 100;
      
      if (percentage >= budget.alertAt) {
        budgetAlerts.push({
          id: budget._id,
          name: budget.name,
          categoryName: budget.categoryId?.name,
          icon: budget.categoryId?.icon,
          percentage: percentage,
          spent: spent,
          amount: budget.amount
        });
      }
    });

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
      budgetAlerts
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
