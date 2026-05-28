import Transaction from '../models/Transaction.js';
import Category from '../models/Category.js';
import Account from '../models/Account.js';
import ScheduledTransaction from '../models/ScheduledTransaction.js';
import mongoose from 'mongoose';

// Helper: Get previous period dates
const getPreviousPeriod = (start, end) => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffTime = Math.abs(endDate - startDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

  const prevStartDate = new Date(startDate);
  prevStartDate.setDate(prevStartDate.getDate() - diffDays);
  prevStartDate.setUTCHours(0, 0, 0, 0);

  const prevEndDate = new Date(startDate);
  prevEndDate.setDate(prevEndDate.getDate() - 1);
  prevEndDate.setUTCHours(23, 59, 59, 999);

  return { prevStartDate, prevEndDate };
};

// 1. Get charts by category with drill-down data
export const getChartsByCategory = async (req, res) => {
  try {
    const { startDate, endDate, type = 'expense' } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'startDate and endDate are required' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    start.setUTCHours(0, 0, 0, 0);
    end.setUTCHours(23, 59, 59, 999);
    
    // Fetch all categories for reference
    const allCategories = await Category.find({ userId: req.user.id });
    const categoryMap = {};
    allCategories.forEach(cat => {
      categoryMap[cat._id.toString()] = cat;
    });

    // Query active transactions (not pending) for the current period
    const transactions = await Transaction.find({
      userId: req.user.id,
      type,
      isPending: { $ne: true },
      date: { $gte: start, $lte: end }
    });

    // Compute total sum
    const totalAmount = transactions.reduce((acc, curr) => acc + curr.amount, 0);

    // Group by category (either main or sub)
    const grouped = {};
    transactions.forEach(tx => {
      if (!tx.categoryId) return;
      const catIdStr = tx.categoryId.toString();
      const cat = categoryMap[catIdStr];
      if (!cat) return;

      let mainCatId = cat._id.toString();
      let subCatName = null;
      let subCatIcon = null;

      // If it's a subcategory, group under parent
      if (cat.parentId) {
        mainCatId = cat.parentId.toString();
        subCatName = cat.name;
        subCatIcon = cat.icon;
      }

      if (!grouped[mainCatId]) {
        const mainCat = categoryMap[mainCatId] || { name: 'Autre', icon: '❓', color: '#888' };
        grouped[mainCatId] = {
          categoryId: mainCatId,
          name: mainCat.name,
          icon: mainCat.icon,
          color: mainCat.color,
          amount: 0,
          subcategories: {}
        };
      }

      grouped[mainCatId].amount += tx.amount;

      if (subCatName) {
        if (!grouped[mainCatId].subcategories[subCatName]) {
          grouped[mainCatId].subcategories[subCatName] = {
            name: subCatName,
            icon: subCatIcon,
            amount: 0
          };
        }
        grouped[mainCatId].subcategories[subCatName].amount += tx.amount;
      }
    });

    // Convert grouped to list and format
    const categoriesList = Object.values(grouped).map(cat => {
      const percentage = totalAmount > 0 ? parseFloat(((cat.amount / totalAmount) * 100).toFixed(1)) : 0;
      
      const subs = Object.values(cat.subcategories).map(sub => ({
        ...sub,
        percentage: cat.amount > 0 ? parseFloat(((sub.amount / cat.amount) * 100).toFixed(1)) : 0
      })).sort((a, b) => b.amount - a.amount);

      return {
        categoryId: cat.categoryId,
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
        amount: parseFloat(cat.amount.toFixed(2)),
        percentage,
        subcategories: subs,
        changeVsPreviousPeriod: 0 // Will compute next
      };
    }).sort((a, b) => b.amount - a.amount);

    // Compute variation vs previous period if requested
    const { prevStartDate, prevEndDate } = getPreviousPeriod(start, end);
    const prevTransactions = await Transaction.find({
      userId: req.user.id,
      type,
      isPending: { $ne: true },
      date: { $gte: prevStartDate, $lte: prevEndDate }
    });

    const prevGrouped = {};
    prevTransactions.forEach(tx => {
      if (!tx.categoryId) return;
      const cat = categoryMap[tx.categoryId.toString()];
      if (!cat) return;
      const mainCatId = cat.parentId ? cat.parentId.toString() : cat._id.toString();
      prevGrouped[mainCatId] = (prevGrouped[mainCatId] || 0) + tx.amount;
    });

    // Assign variation percentage to categories list
    categoriesList.forEach(cat => {
      const prevAmount = prevGrouped[cat.categoryId] || 0;
      if (prevAmount > 0) {
        cat.changeVsPreviousPeriod = parseFloat((((cat.amount - prevAmount) / prevAmount) * 100).toFixed(1));
      } else {
        cat.changeVsPreviousPeriod = cat.amount > 0 ? 100 : 0;
      }
    });

    // Calculate moving averages over last 3 and 6 completed months
    const end3M = new Date(start);
    end3M.setUTCDate(0); // Last day of previous month
    end3M.setUTCHours(23, 59, 59, 999);

    const start3M = new Date(start);
    start3M.setUTCMonth(start3M.getUTCMonth() - 3);
    start3M.setUTCDate(1);
    start3M.setUTCHours(0, 0, 0, 0);

    const start6M = new Date(start);
    start6M.setUTCMonth(start6M.getUTCMonth() - 6);
    start6M.setUTCDate(1);
    start6M.setUTCHours(0, 0, 0, 0);

    const txs3M = await Transaction.find({
      userId: req.user.id,
      type,
      isPending: { $ne: true },
      date: { $gte: start3M, $lte: end3M }
    });

    const txs6M = await Transaction.find({
      userId: req.user.id,
      type,
      isPending: { $ne: true },
      date: { $gte: start6M, $lte: end3M }
    });

    const sum3M = {};
    const sum6M = {};

    txs3M.forEach(tx => {
      if (!tx.categoryId) return;
      const cat = categoryMap[tx.categoryId.toString()];
      if (!cat) return;
      const mainCatId = cat.parentId ? cat.parentId.toString() : cat._id.toString();
      sum3M[mainCatId] = (sum3M[mainCatId] || 0) + tx.amount;
    });

    txs6M.forEach(tx => {
      if (!tx.categoryId) return;
      const cat = categoryMap[tx.categoryId.toString()];
      if (!cat) return;
      const mainCatId = cat.parentId ? cat.parentId.toString() : cat._id.toString();
      sum6M[mainCatId] = (sum6M[mainCatId] || 0) + tx.amount;
    });

    categoriesList.forEach(cat => {
      const total3M = sum3M[cat.categoryId] || 0;
      const total6M = sum6M[cat.categoryId] || 0;

      const movingAvg3M = parseFloat((total3M / 3).toFixed(2));
      const movingAvg6M = parseFloat((total6M / 6).toFixed(2));

      let changeVs3MAvg = 0;
      if (movingAvg3M > 0) {
        changeVs3MAvg = parseFloat((((cat.amount - movingAvg3M) / movingAvg3M) * 100).toFixed(1));
      } else {
        changeVs3MAvg = cat.amount > 0 ? 100 : 0;
      }

      let changeVs6MAvg = 0;
      if (movingAvg6M > 0) {
        changeVs6MAvg = parseFloat((((cat.amount - movingAvg6M) / movingAvg6M) * 100).toFixed(1));
      } else {
        changeVs6MAvg = cat.amount > 0 ? 100 : 0;
      }

      cat.movingAvg3M = movingAvg3M;
      cat.movingAvg6M = movingAvg6M;
      cat.changeVs3MAvg = changeVs3MAvg;
      cat.changeVs6MAvg = changeVs6MAvg;
    });

    res.json({
      total: parseFloat(totalAmount.toFixed(2)),
      categories: categoriesList
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// 2. Get short-term future cash flow projections
export const getFutureCharts = async (req, res) => {
  try {
    const { startDate, endDate, accountId } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'startDate and endDate are required' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    start.setUTCHours(0, 0, 0, 0);
    end.setUTCHours(23, 59, 59, 999);

    // Get starting balance of chosen account(s)
    let startBalance = 0;
    if (accountId) {
      const account = await Account.findOne({ _id: accountId, userId: req.user.id });
      if (account) startBalance = account.balance;
    } else {
      const accounts = await Account.find({ userId: req.user.id });
      startBalance = accounts.reduce((sum, a) => sum + a.balance, 0);
    }

    // Query actual transactions (past & up to current time) for comparison/starting solid chart
    const actualTransactions = await Transaction.find({
      userId: req.user.id,
      isPending: { $ne: true },
      date: { $lte: new Date() }
    });

    // Query pending transactions
    const pendingTransactions = await Transaction.find({
      userId: req.user.id,
      isPending: true,
      date: { $gte: start, $lte: end }
    }).populate('categoryId', 'name icon color');

    // Query scheduled transactions
    const scheduledSchedules = await ScheduledTransaction.find({
      userId: req.user.id,
      isActive: true
    }).populate('categoryId', 'name icon color');

    // 1. Project schedule occurrences in range
    const simulatedScheduled = [];
    scheduledSchedules.forEach(st => {
      let curr = new Date(st.nextDate);
      let timesLeft = st.numberOfTimes > 0 ? (st.numberOfTimes - st.timesExecuted) : Infinity;

      while (curr <= end && timesLeft > 0) {
        if (st.endDate && curr > st.endDate) break;
        if (curr >= start) {
          simulatedScheduled.push({
            date: new Date(curr),
            description: st.description,
            amount: st.amount,
            type: st.type,
            source: 'scheduled',
            categoryId: st.categoryId
          });
        }
        // Advance
        const { every, unit } = st.frequency;
        if (unit === 'day') curr.setDate(curr.getDate() + every);
        else if (unit === 'week') curr.setDate(curr.getDate() + every * 7);
        else if (unit === 'month') curr.setMonth(curr.getMonth() + every);
        else if (unit === 'year') curr.setFullYear(curr.getFullYear() + every);

        timesLeft--;
      }
    });

    // 2. Add pending transactions
    const pendingList = pendingTransactions.map(pt => ({
      date: pt.date,
      description: pt.description || pt.categoryId?.name || 'Facture',
      amount: pt.amount,
      type: pt.type,
      source: 'pending',
      categoryId: pt.categoryId
    }));

    // 3. Add manual future transactions (real transaction created in future date)
    const futureReal = await Transaction.find({
      userId: req.user.id,
      isPending: { $ne: true },
      date: { $gt: new Date(), $lte: end }
    }).populate('categoryId', 'name icon color');

    const manualList = futureReal.map(ft => ({
      date: ft.date,
      description: ft.description || ft.categoryId?.name,
      amount: ft.amount,
      type: ft.type,
      source: 'manual',
      categoryId: ft.categoryId
    }));

    // Combine all future occurrences
    const allFuture = [...simulatedScheduled, ...pendingList, ...manualList];
    allFuture.sort((a, b) => a.date - b.date);

    // Calculate month-by-month periods
    const periods = {};
    let temp = new Date(start);
    while (temp <= end) {
      const label = temp.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
      const key = `${temp.getFullYear()}-${String(temp.getMonth() + 1).padStart(2, '0')}`;
      periods[key] = { label, date: key, income: 0, expenses: 0, net: 0 };
      temp.setMonth(temp.getMonth() + 1);
    }

    allFuture.forEach(item => {
      const m = new Date(item.date);
      const key = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`;
      if (periods[key]) {
        if (item.type === 'income') {
          periods[key].income += item.amount;
        } else if (item.type === 'expense') {
          periods[key].expenses += item.amount;
        }
      }
    });

    // Compute net values
    Object.keys(periods).forEach(k => {
      periods[k].net = periods[k].income - periods[k].expenses;
      periods[k].income = parseFloat(periods[k].income.toFixed(2));
      periods[k].expenses = parseFloat(periods[k].expenses.toFixed(2));
      periods[k].net = parseFloat(periods[k].net.toFixed(2));
    });

    // Generate cumulative daily balance projection
    const projectedBalance = [];
    let runningBalance = startBalance;
    
    // Add starting point
    projectedBalance.push({ date: new Date().toISOString().split('T')[0], balance: parseFloat(runningBalance.toFixed(2)) });

    allFuture.forEach(item => {
      if (item.type === 'income') runningBalance += item.amount;
      else if (item.type === 'expense') runningBalance -= item.amount;

      projectedBalance.push({
        date: new Date(item.date).toISOString().split('T')[0],
        balance: parseFloat(runningBalance.toFixed(2))
      });
    });

    res.json({
      periods: Object.values(periods),
      projectedBalance,
      futureTransactions: allFuture
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// 3. Get statistical mathematical forecast (up to 12 months history, 6 months future)
export const getForecastCharts = async (req, res) => {
  try {
    const { months = 6, method = 'regression', accountId } = req.query;
    const futureMonthsCount = parseInt(months) || 6;

    // Get active/starting balance
    let startBalance = 0;
    if (accountId) {
      const account = await Account.findOne({ _id: accountId, userId: req.user.id });
      if (account) startBalance = account.balance;
    } else {
      const accounts = await Account.find({ userId: req.user.id });
      startBalance = accounts.reduce((sum, a) => sum + a.balance, 0);
    }

    // 1. Gather historical data from last 12 months
    const now = new Date();
    const historyStart = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    const histTransactions = await Transaction.find({
      userId: req.user.id,
      isPending: { $ne: true },
      date: { $gte: historyStart, $lte: now }
    });

    // Populate historical monthly buckets
    const historicalBuckets = {};
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      historicalBuckets[key] = { month: key, income: 0, expenses: 0, balance: 0 };
    }

    histTransactions.forEach(tx => {
      const d = new Date(tx.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (historicalBuckets[key]) {
        if (tx.type === 'income') historicalBuckets[key].income += tx.amount;
        else if (tx.type === 'expense') historicalBuckets[key].expenses += tx.amount;
      }
    });

    const historicalList = Object.values(historicalBuckets);
    
    // Fill net margins
    historicalList.forEach(item => {
      item.balance = parseFloat((item.income - item.expenses).toFixed(2));
    });

    // Calculate historical stats (pente, std dev, average)
    const incomes = historicalList.map(h => h.income);
    const expenses = historicalList.map(h => h.expenses);
    const nets = historicalList.map(h => h.balance);

    const stdDevNet = Math.sqrt(nets.reduce((sq, n) => sq + Math.pow(n - (nets.reduce((a,b)=>a+b,0)/12), 2), 0) / 12) || 150;

    const forecast = [];
    let runningProjectedBalance = startBalance;

    for (let f = 1; f <= futureMonthsCount; f++) {
      const fDate = new Date(now.getFullYear(), now.getMonth() + f, 1);
      const label = `${fDate.getFullYear()}-${String(fDate.getMonth() + 1).padStart(2, '0')}`;

      let projectedInc = 0;
      let projectedExp = 0;

      if (method === 'regression') {
        // Linear regression formula
        // x represents the indices 0..11 of historical list
        const N = 12;
        const x = Array.from({ length: 12 }, (_, idx) => idx);
        
        const sumX = x.reduce((a, b) => a + b, 0);
        const sumX2 = x.reduce((a, b) => a + b * b, 0);
        
        // Income
        const sumYInc = incomes.reduce((a, b) => a + b, 0);
        const sumXYInc = x.reduce((sum, val, idx) => sum + val * incomes[idx], 0);
        const slopeInc = (N * sumXYInc - sumX * sumYInc) / (N * sumX2 - sumX * sumX);
        const interceptInc = (sumYInc - slopeInc * sumX) / N;
        
        // Expenses
        const sumYExp = expenses.reduce((a, b) => a + b, 0);
        const sumXYExp = x.reduce((sum, val, idx) => sum + val * expenses[idx], 0);
        const slopeExp = (N * sumXYExp - sumX * sumYExp) / (N * sumX2 - sumX * sumX);
        const interceptExp = (sumYExp - slopeExp * sumX) / N;

        const xFuture = 11 + f;
        projectedInc = Math.max(0, slopeInc * xFuture + interceptInc);
        projectedExp = Math.max(0, slopeExp * xFuture + interceptExp);

      } else if (method === 'weighted') {
        // Weighted mean (newer months get higher weight)
        let totalWeight = 0;
        let weightedInc = 0;
        let weightedExp = 0;

        historicalList.forEach((h, idx) => {
          const weight = idx + 1; // 1 to 12
          weightedInc += h.income * weight;
          weightedExp += h.expenses * weight;
          totalWeight += weight;
        });

        projectedInc = weightedInc / totalWeight;
        projectedExp = weightedExp / totalWeight;

      } else if (method === 'mobile') {
        // Mobile mean of last 3 months
        const last3 = historicalList.slice(-3);
        projectedInc = last3.reduce((s, h) => s + h.income, 0) / 3;
        projectedExp = last3.reduce((s, h) => s + h.expenses, 0) / 3;

      } else {
        // Simple mean
        projectedInc = incomes.reduce((a, b) => a + b, 0) / 12;
        projectedExp = expenses.reduce((a, b) => a + b, 0) / 12;
      }

      const projectedNet = projectedInc - projectedExp;
      runningProjectedBalance += projectedNet;

      // Confidence Interval grows wider as we project further out
      const confidenceMargin = stdDevNet * Math.sqrt(f);

      forecast.push({
        month: label,
        projectedIncome: parseFloat(projectedInc.toFixed(2)),
        projectedExpenses: parseFloat(projectedExp.toFixed(2)),
        projectedNet: parseFloat(projectedNet.toFixed(2)),
        projectedBalance: parseFloat(runningProjectedBalance.toFixed(2)),
        confidenceInterval: {
          low: parseFloat((runningProjectedBalance - confidenceMargin).toFixed(2)),
          high: parseFloat((runningProjectedBalance + confidenceMargin).toFixed(2))
        }
      });
    }

    // Determine general trend based on projected balances
    let trend = 'stable';
    const firstProj = forecast[0].projectedBalance;
    const lastProj = forecast[forecast.length - 1].projectedBalance;
    const diff = lastProj - firstProj;
    if (diff > 200) trend = 'positive';
    else if (diff < -200) trend = 'negative';

    res.json({
      method,
      historicalData: historicalList,
      forecast,
      trend
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// 4. Get net worth historical evolution
export const getNetWorthHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const days = parseInt(req.query.days) || 180;
    const now = new Date();
    
    const startDate = new Date();
    startDate.setDate(now.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const accounts = await Account.find({ userId });
    
    // Get transactions in range to reverse balances
    const transactions = await Transaction.find({
      userId,
      date: { $gte: startDate, $lte: now }
    }).sort({ date: -1 });

    const runningBalances = {};
    accounts.forEach(acc => {
      runningBalances[acc._id.toString()] = acc.balance;
    });

    const formatDateKey = (date) => {
      const d = new Date(date);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    // Group transactions by date key
    const txsByDate = {};
    transactions.forEach(tx => {
      const dateKey = formatDateKey(tx.date);
      if (!txsByDate[dateKey]) {
        txsByDate[dateKey] = [];
      }
      txsByDate[dateKey].push(tx);
    });

    const history = [];

    for (let i = 0; i <= days; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dateKey = formatDateKey(d);

      const dayLabel = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
      
      const balancesByType = {
        checking: 0,
        savings: 0,
        cash: 0,
        credit: 0,
        investment: 0
      };

      accounts.forEach(acc => {
        const bal = runningBalances[acc._id.toString()] || 0;
        if (acc.includeInTotal !== false) {
          balancesByType[acc.type] += bal;
        }
      });

      const totalVal = Object.values(balancesByType).reduce((sum, val) => sum + val, 0);

      history.push({
        dayIndex: i,
        date: dayLabel,
        rawDate: d,
        checking: parseFloat(balancesByType.checking.toFixed(2)),
        savings: parseFloat(balancesByType.savings.toFixed(2)),
        cash: parseFloat(balancesByType.cash.toFixed(2)),
        credit: parseFloat(balancesByType.credit.toFixed(2)),
        investment: parseFloat(balancesByType.investment.toFixed(2)),
        netWorth: parseFloat(totalVal.toFixed(2))
      });

      // Reverse transactions for the next day backwards
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

    history.reverse();
    res.json(history);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error during net worth calculation' });
  }
};
