import Transaction from '../models/Transaction.js';
import Category from '../models/Category.js';
import Account from '../models/Account.js';
import ScheduledTransaction from '../models/ScheduledTransaction.js';
import Tag from '../models/Tag.js';
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
    const allCategories = await Category.find({ userId: req.user.id }).lean();
    const categoryMap = {};
    allCategories.forEach(cat => {
      categoryMap[cat._id.toString()] = cat;
    });

    // Query active transactions (not pending) for the current period
    const query = {
      userId: req.user.id,
      isPending: { $ne: true },
      date: { $gte: start, $lte: end }
    };
    if (type === 'expense') {
      query.$or = [
        { type: 'expense' },
        { type: 'transfer' }
      ];
    } else {
      query.type = type;
    }

    const transactions = await Transaction.find(query)
      .select('categoryId amount type toAccountId')
      .populate('toAccountId', 'type')
      .lean();

    const filteredTxs = transactions.filter(tx => 
      type !== 'expense' || tx.type === 'expense' || (tx.type === 'transfer' && tx.toAccountId?.type === 'credit')
    );

    // Compute total sum
    const totalAmount = filteredTxs.reduce((acc, curr) => acc + curr.amount, 0);

    // Group by category (either main or sub)
    const grouped = {};
    filteredTxs.forEach(tx => {
      let mainCatId;
      let subCatName = null;
      let subCatIcon = null;

      if (tx.type === 'transfer' && tx.toAccountId?.type === 'credit') {
        mainCatId = 'credit_repayment';
      } else {
        if (!tx.categoryId) return;
        const catIdStr = tx.categoryId.toString();
        const cat = categoryMap[catIdStr];
        if (!cat) return;

        mainCatId = cat.parentId ? cat.parentId.toString() : cat._id.toString();
        if (cat.parentId) {
          subCatName = cat.name;
          subCatIcon = cat.icon;
        }
      }

      if (!grouped[mainCatId]) {
        if (mainCatId === 'credit_repayment') {
          grouped[mainCatId] = {
            categoryId: 'credit_repayment',
            name: 'Remboursement Crédit',
            icon: '🏦',
            color: '#f43f5e',
            amount: 0,
            subcategories: {}
          };
        } else {
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
    
    const prevQuery = {
      userId: req.user.id,
      isPending: { $ne: true },
      date: { $gte: prevStartDate, $lte: prevEndDate }
    };
    if (type === 'expense') {
      prevQuery.$or = [
        { type: 'expense' },
        { type: 'transfer' }
      ];
    } else {
      prevQuery.type = type;
    }

    const prevTransactions = await Transaction.find(prevQuery)
      .select('categoryId amount type toAccountId')
      .populate('toAccountId', 'type')
      .lean();

    const filteredPrevTxs = prevTransactions.filter(tx => 
      type !== 'expense' || tx.type === 'expense' || (tx.type === 'transfer' && tx.toAccountId?.type === 'credit')
    );

    const prevGrouped = {};
    filteredPrevTxs.forEach(tx => {
      let mainCatId;
      if (tx.type === 'transfer' && tx.toAccountId?.type === 'credit') {
        mainCatId = 'credit_repayment';
      } else {
        if (!tx.categoryId) return;
        const cat = categoryMap[tx.categoryId.toString()];
        if (!cat) return;
        mainCatId = cat.parentId ? cat.parentId.toString() : cat._id.toString();
      }
      prevGrouped[mainCatId] = (prevGrouped[mainCatId] || 0) + tx.amount;
    });

    // Assign variation percentage to categories list
    categoriesList.forEach(cat => {
      const prevAmount = prevGrouped[cat.categoryId] || 0;
      cat.prevAmount = prevAmount;
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

    const q3M = {
      userId: req.user.id,
      isPending: { $ne: true },
      date: { $gte: start3M, $lte: end3M }
    };
    if (type === 'expense') {
      q3M.$or = [
        { type: 'expense' },
        { type: 'transfer' }
      ];
    } else {
      q3M.type = type;
    }

    const txs3M = await Transaction.find(q3M)
      .select('categoryId amount type toAccountId')
      .populate('toAccountId', 'type')
      .lean();

    const filtered3MTxs = txs3M.filter(tx => 
      type !== 'expense' || tx.type === 'expense' || (tx.type === 'transfer' && tx.toAccountId?.type === 'credit')
    );

    const q6M = {
      userId: req.user.id,
      isPending: { $ne: true },
      date: { $gte: start6M, $lte: end3M }
    };
    if (type === 'expense') {
      q6M.$or = [
        { type: 'expense' },
        { type: 'transfer' }
      ];
    } else {
      q6M.type = type;
    }

    const txs6M = await Transaction.find(q6M)
      .select('categoryId amount type toAccountId')
      .populate('toAccountId', 'type')
      .lean();

    const filtered6MTxs = txs6M.filter(tx => 
      type !== 'expense' || tx.type === 'expense' || (tx.type === 'transfer' && tx.toAccountId?.type === 'credit')
    );

    const sum3M = {};
    const sum6M = {};

    filtered3MTxs.forEach(tx => {
      let mainCatId;
      if (tx.type === 'transfer' && tx.toAccountId?.type === 'credit') {
        mainCatId = 'credit_repayment';
      } else {
        if (!tx.categoryId) return;
        const cat = categoryMap[tx.categoryId.toString()];
        if (!cat) return;
        mainCatId = cat.parentId ? cat.parentId.toString() : cat._id.toString();
      }
      sum3M[mainCatId] = (sum3M[mainCatId] || 0) + tx.amount;
    });

    filtered6MTxs.forEach(tx => {
      let mainCatId;
      if (tx.type === 'transfer' && tx.toAccountId?.type === 'credit') {
        mainCatId = 'credit_repayment';
      } else {
        if (!tx.categoryId) return;
        const cat = categoryMap[tx.categoryId.toString()];
        if (!cat) return;
        mainCatId = cat.parentId ? cat.parentId.toString() : cat._id.toString();
      }
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
      const account = await Account.findOne({ _id: accountId, userId: req.user.id }).lean();
      if (account) startBalance = account.balance;
    } else {
      const accounts = await Account.find({ userId: req.user.id }).lean();
      startBalance = accounts.reduce((sum, a) => sum + a.balance, 0);
    }

    // Query actual transactions (past & up to current time) for comparison/starting solid chart
    const actualTransactions = await Transaction.find({
      userId: req.user.id,
      isPending: { $ne: true },
      date: { $lte: new Date() }
    }).lean();

    // Query pending transactions
    const pendingTransactions = await Transaction.find({
      userId: req.user.id,
      isPending: true,
      date: { $gte: start, $lte: end }
    }).populate('categoryId', 'name icon color').populate('toAccountId', 'type').lean();

    // Query scheduled transactions
    const scheduledSchedules = await ScheduledTransaction.find({
      userId: req.user.id,
      isActive: true
    }).populate('categoryId', 'name icon color').populate('toAccountId', 'type').lean();

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
            categoryId: st.categoryId,
            toAccountId: st.toAccountId
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
      categoryId: pt.categoryId,
      toAccountId: pt.toAccountId
    }));

    // 3. Add manual future transactions (real transaction created in future date)
    const futureReal = await Transaction.find({
      userId: req.user.id,
      isPending: { $ne: true },
      date: { $gt: new Date(), $lte: end }
    }).populate('categoryId', 'name icon color').populate('toAccountId', 'type').lean();

    const manualList = futureReal.map(ft => ({
      date: ft.date,
      description: ft.description || ft.categoryId?.name,
      amount: ft.amount,
      type: ft.type,
      source: 'manual',
      categoryId: ft.categoryId,
      toAccountId: ft.toAccountId
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
        } else if (item.type === 'transfer' && item.toAccountId?.type === 'credit') {
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
      else if (item.type === 'transfer' && item.toAccountId?.type === 'credit') runningBalance -= item.amount;

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
      const account = await Account.findOne({ _id: accountId, userId: req.user.id }).lean();
      if (account) startBalance = account.balance;
    } else {
      const accounts = await Account.find({ userId: req.user.id }).lean();
      startBalance = accounts.reduce((sum, a) => sum + a.balance, 0);
    }

    // 1. Gather historical data from last 12 months
    const now = new Date();
    const historyStart = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    const histTransactions = await Transaction.find({
      userId: req.user.id,
      isPending: { $ne: true },
      date: { $gte: historyStart, $lte: now }
    }).populate('toAccountId', 'type').lean();

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
        else if (tx.type === 'transfer' && tx.toAccountId?.type === 'credit') {
          historicalBuckets[key].expenses += tx.amount;
        }
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

    const accounts = await Account.find({ userId }).lean();
    
    // Get transactions in range to reverse balances
    const transactions = await Transaction.find({
      userId,
      date: { $gte: startDate, $lte: now }
    }).sort({ date: -1 }).lean();

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

// 5. Get cash flow historical evolution (month-by-month income vs expenses)
export const getCashFlowHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { months = 12, accountId } = req.query;
    const monthsCount = parseInt(months) || 12;
    const now = new Date();
    
    // Start of the first month in the range
    const startDate = new Date(now.getFullYear(), now.getMonth() - monthsCount + 1, 1);
    startDate.setUTCHours(0, 0, 0, 0);

    const query = {
      userId,
      isPending: { $ne: true },
      date: { $gte: startDate, $lte: now }
    };

    if (accountId) {
      query.accountId = accountId;
    }

    const transactions = await Transaction.find(query).populate('toAccountId', 'type').lean();

    const buckets = {};
    for (let i = 0; i < monthsCount; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - monthsCount + 1 + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      buckets[key] = { month: key, income: 0, expenses: 0, net: 0 };
    }

    transactions.forEach(tx => {
      const d = new Date(tx.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (buckets[key]) {
        if (tx.type === 'income') {
          buckets[key].income += tx.amount;
        } else if (tx.type === 'expense') {
          buckets[key].expenses += tx.amount;
        } else if (tx.type === 'transfer' && tx.toAccountId?.type === 'credit') {
          buckets[key].expenses += tx.amount;
        }
      }
    });

    const history = Object.values(buckets).map(b => {
      b.income = parseFloat(b.income.toFixed(2));
      b.expenses = parseFloat(b.expenses.toFixed(2));
      b.net = parseFloat((b.income - b.expenses).toFixed(2));
      return b;
    });

    // Compute summary metrics
    const totalIncome = history.reduce((sum, h) => sum + h.income, 0);
    const totalExpenses = history.reduce((sum, h) => sum + h.expenses, 0);
    const netSavings = totalIncome - totalExpenses;
    
    const avgIncome = totalIncome / monthsCount;
    const avgExpenses = totalExpenses / monthsCount;
    const avgNet = netSavings / monthsCount;

    const positiveMonths = history.filter(h => h.net > 0).length;
    const negativeMonths = history.filter(h => h.net < 0).length;
    
    // Savings rate
    const savingsRate = totalIncome > 0 ? parseFloat(((netSavings / totalIncome) * 100).toFixed(1)) : 0;

    // Status message based on cash flow health
    let status = 'healthy'; // healthy, tight, warning
    let message = 'Votre situation est saine. Vos revenus couvrent largement vos dépenses.';

    if (netSavings < 0) {
      status = 'warning';
      message = 'Attention : Vous vivez au-dessus de vos moyens sur cette période. Vos dépenses dépassent vos revenus.';
    } else if (savingsRate < 10) {
      status = 'tight';
      message = 'Situation équilibrée mais serrée. Votre taux d\'épargne est inférieur à 10%. Soyez vigilant.';
    } else if (negativeMonths > positiveMonths) {
      status = 'tight';
      message = 'Attention : Vous avez plus de mois en déficit qu\'en excédent, bien que le cumul soit positif. Stabilisez votre budget.';
    }

    res.json({
      history,
      metrics: {
        totalIncome: parseFloat(totalIncome.toFixed(2)),
        totalExpenses: parseFloat(totalExpenses.toFixed(2)),
        netSavings: parseFloat(netSavings.toFixed(2)),
        avgIncome: parseFloat(avgIncome.toFixed(2)),
        avgExpenses: parseFloat(avgExpenses.toFixed(2)),
        avgNet: parseFloat(avgNet.toFixed(2)),
        positiveMonths,
        negativeMonths,
        savingsRate,
        status,
        message
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error during cash flow history calculation' });
  }
};

// 6. Get expense ranking (by category or description/merchant)
export const getExpenseRanking = async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate, groupBy = 'category', limit = 10 } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'startDate and endDate are required' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    start.setUTCHours(0, 0, 0, 0);
    end.setUTCHours(23, 59, 59, 999);

    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;

    // Find all expense transactions + transfers in period
    const transactions = await Transaction.find({
      userId,
      isPending: { $ne: true },
      date: { $gte: start, $lte: end },
      $or: [
        { type: 'expense' },
        { type: 'transfer' }
      ]
    }).populate('categoryId', 'name icon color parentId').populate('toAccountId', 'type').lean();

    const filteredTxs = transactions.filter(tx => 
      tx.type === 'expense' || (tx.type === 'transfer' && tx.toAccountId?.type === 'credit')
    );

    const groups = {};

    filteredTxs.forEach(tx => {
      let key = '';
      let name = '';
      let icon = '💸';
      let color = '#888888';

      if (groupBy === 'category') {
        if (tx.type === 'transfer' && tx.toAccountId?.type === 'credit') {
          key = 'credit_repayment';
          name = 'Remboursement Crédit';
          icon = '🏦';
          color = '#f43f5e';
        } else if (tx.categoryId) {
          key = tx.categoryId._id.toString();
          name = tx.categoryId.name;
          icon = tx.categoryId.icon || '📁';
          color = tx.categoryId.color || '#10b981';
        } else {
          key = 'uncategorized';
          name = 'Non catégorisé';
        }
      } else { // groupBy === 'description' (Merchant)
        const cleanedDesc = tx.description ? tx.description.trim().replace(/\s+/g, ' ') : '';
        if (cleanedDesc) {
          name = cleanedDesc.charAt(0).toUpperCase() + cleanedDesc.slice(1);
          key = name.toLowerCase();
          icon = tx.type === 'transfer' ? '🏦' : '🏪';
          if (tx.categoryId) {
            color = tx.categoryId.color || '#3b82f6';
          } else if (tx.type === 'transfer' && tx.toAccountId?.type === 'credit') {
            color = '#f43f5e';
          }
        } else {
          if (tx.type === 'transfer' && tx.toAccountId?.type === 'credit') {
            key = 'credit_repayment';
            name = 'Remboursement Crédit';
            icon = '🏦';
            color = '#f43f5e';
          } else {
            key = 'no_description';
            name = tx.categoryId ? tx.categoryId.name : 'Dépense générale';
            icon = tx.categoryId ? tx.categoryId.icon : '💸';
            if (tx.categoryId) {
              color = tx.categoryId.color;
            }
          }
        }
      }

      if (!groups[key]) {
        groups[key] = {
          id: key,
          name,
          icon,
          color,
          amount: 0,
          count: 0
        };
      }

      groups[key].amount += tx.amount;
      groups[key].count += 1;
    });

    const ranking = Object.values(groups).map(g => {
      const avgAmount = g.amount / g.count;
      const projectedAnnual = (g.amount / diffDays) * 365;

      return {
        id: g.id,
        name: g.name,
        icon: g.icon,
        color: g.color,
        amount: parseFloat(g.amount.toFixed(2)),
        count: g.count,
        avgAmount: parseFloat(avgAmount.toFixed(2)),
        projectedAnnual: parseFloat(projectedAnnual.toFixed(2))
      };
    });

    // Default sorting by amount descending (can be re-sorted by frequency in frontend)
    ranking.sort((a, b) => b.amount - a.amount);

    const limitedRanking = ranking.slice(0, parseInt(limit));

    res.json({
      ranking: limitedRanking,
      diffDays,
      totalExpenses: filteredTxs.reduce((sum, tx) => sum + tx.amount, 0)
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error calculating expense ranking' });
  }
};

// 7. Get custom Cash Flow histogram data
export const getHistogramData = async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate, accountId, groupBy } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'startDate and endDate are required' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    start.setUTCHours(0, 0, 0, 0);
    end.setUTCHours(23, 59, 59, 999);

    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;

    // Auto determine grouping if not provided
    let activeGroupBy = groupBy;
    if (!activeGroupBy) {
      if (diffDays <= 31) {
        activeGroupBy = 'day';
      } else if (diffDays <= 180) {
        activeGroupBy = 'week';
      } else {
        activeGroupBy = 'month';
      }
    }

    // Query transactions in range
    const query = {
      userId,
      isPending: { $ne: true },
      date: { $gte: start, $lte: end }
    };

    if (accountId) {
      query.$or = [
        { accountId: accountId },
        { toAccountId: accountId }
      ];
    }

    const transactions = await Transaction.find(query)
      .populate('toAccountId', 'type')
      .populate('accountId', 'type')
      .sort({ date: 1 })
      .lean();

    // Initialize buckets
    const buckets = {};

    // Generate all keys based on the groupBy to ensure no gaps in the chart
    if (activeGroupBy === 'day') {
      const temp = new Date(start);
      while (temp <= end) {
        const key = temp.toISOString().split('T')[0];
        const dayLabel = temp.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
        buckets[key] = { key, label: dayLabel, income: 0, expenses: 0, net: 0, rawDate: new Date(temp) };
        temp.setDate(temp.getDate() + 1);
      }
    } else if (activeGroupBy === 'week') {
      // Group by week starting date
      const temp = new Date(start);
      const day = temp.getDay();
      const diff = temp.getDate() - day + (day === 0 ? -6 : 1);
      const weekStart = new Date(temp.setDate(diff));
      weekStart.setUTCHours(0, 0, 0, 0);

      while (weekStart <= end) {
        const key = weekStart.toISOString().split('T')[0];
        const label = `Sem. du ${weekStart.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`;
        buckets[key] = { key, label, income: 0, expenses: 0, net: 0, rawDate: new Date(weekStart) };
        weekStart.setDate(weekStart.getDate() + 7);
      }
    } else { // activeGroupBy === 'month'
      const temp = new Date(start);
      temp.setDate(1); // align to first of month
      while (temp <= end) {
        const key = `${temp.getFullYear()}-${String(temp.getMonth() + 1).padStart(2, '0')}`;
        const label = temp.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
        buckets[key] = { key, label: label.charAt(0).toUpperCase() + label.slice(1), income: 0, expenses: 0, net: 0, rawDate: new Date(temp) };
        temp.setMonth(temp.getMonth() + 1);
      }
    }

    // Helper to find the matching bucket key
    const getBucketKey = (date) => {
      const d = new Date(date);
      if (activeGroupBy === 'day') {
        return d.toISOString().split('T')[0];
      } else if (activeGroupBy === 'week') {
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const mon = new Date(d.setDate(diff));
        mon.setUTCHours(0, 0, 0, 0);
        return mon.toISOString().split('T')[0];
      } else { // month
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      }
    };

    transactions.forEach(tx => {
      const key = getBucketKey(tx.date);
      if (buckets[key]) {
        if (accountId) {
          const isFrom = tx.accountId && (tx.accountId._id || tx.accountId).toString() === accountId;
          const isTo = tx.toAccountId && (tx.toAccountId._id || tx.toAccountId).toString() === accountId;

          if (tx.type === 'income') {
            if (isFrom) buckets[key].income += tx.amount;
          } else if (tx.type === 'expense') {
            if (isFrom) buckets[key].expenses += tx.amount;
          } else if (tx.type === 'transfer') {
            if (isFrom) buckets[key].expenses += tx.amount;
            if (isTo) buckets[key].income += tx.amount;
          }
        } else {
          if (tx.type === 'income') {
            buckets[key].income += tx.amount;
          } else if (tx.type === 'expense') {
            buckets[key].expenses += tx.amount;
          } else if (tx.type === 'transfer' && tx.toAccountId?.type === 'credit') {
            buckets[key].expenses += tx.amount;
          }
        }
      }
    });

    const history = Object.values(buckets).map(b => {
      b.income = parseFloat(b.income.toFixed(2));
      b.expenses = parseFloat(b.expenses.toFixed(2));
      b.net = parseFloat((b.income - b.expenses).toFixed(2));
      return b;
    });

    const totalIncome = history.reduce((sum, h) => sum + h.income, 0);
    const totalExpenses = history.reduce((sum, h) => sum + h.expenses, 0);
    const netSavings = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? parseFloat(((netSavings / totalIncome) * 100).toFixed(1)) : 0;

    res.json({
      history,
      groupBy: activeGroupBy,
      metrics: {
        totalIncome: parseFloat(totalIncome.toFixed(2)),
        totalExpenses: parseFloat(totalExpenses.toFixed(2)),
        netSavings: parseFloat(netSavings.toFixed(2)),
        savingsRate
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error calculating histogram data' });
  }
};

// 8. Get historical balance day-by-day (server-side backtracking)
export const getBalanceHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'startDate and endDate are required' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    start.setUTCHours(0, 0, 0, 0);
    end.setUTCHours(23, 59, 59, 999);

    const now = new Date();

    const accounts = await Account.find({ userId }).lean();
    
    // Fetch all transactions from start date until now (needed for backtracking from today)
    const transactions = await Transaction.find({
      userId,
      isPending: { $ne: true },
      date: { $gte: start }
    }).sort({ date: -1 }).lean();

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

    // We backtrack from today down to start date
    const history = [];
    const currentDay = new Date(now);
    currentDay.setHours(0, 0, 0, 0);

    const getIncludedTotal = () => {
      let total = 0;
      accounts.forEach(acc => {
        if (acc.includeInTotal !== false) {
          total += runningBalances[acc._id.toString()] || 0;
        }
      });
      return total;
    };

    // Helper to revert a single transaction in running balances (moving backwards in time)
    const revertTransaction = (tx) => {
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
    };

    // We walk backwards day-by-day from today
    while (currentDay >= start) {
      const dateStr = currentDay.toISOString().split('T')[0];
      const dateKey = formatDateKey(currentDay);
      
      const totalVal = getIncludedTotal();

      // Only include in history if it is within the requested range [startDate, endDate]
      if (currentDay <= end) {
        const label = currentDay.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
        history.push({
          date: dateStr,
          label,
          balance: parseFloat(totalVal.toFixed(2))
        });
      }

      // Revert all transactions on this day
      const dayTxs = txsByDate[dateKey] || [];
      dayTxs.forEach(revertTransaction);

      currentDay.setDate(currentDay.getDate() - 1);
    }

    history.reverse();
    res.json(history);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error during balance history calculation' });
  }
};

// 9. Get tag charts analytical data
export const getTagChartsData = async (req, res) => {
  try {
    const { startDate, endDate, tagId, type = 'expense' } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'startDate and endDate are required' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    start.setUTCHours(0, 0, 0, 0);
    end.setUTCHours(23, 59, 59, 999);

    // Fetch all user's tags
    const allTags = await Tag.find({ userId: req.user.id }).lean();
    const allCategories = await Category.find({ userId: req.user.id }).lean();
    const categoryLookup = {};
    allCategories.forEach(c => {
      categoryLookup[c._id.toString()] = c;
    });

    // Query active transactions in the period matching the type
    const query = {
      userId: req.user.id,
      type,
      isPending: { $ne: true },
      date: { $gte: start, $lte: end }
    };

    const transactions = await Transaction.find(query).populate('tags').lean();

    // 1. Comparison of Tags (Horizontal Bar Chart)
    const tagMap = {};
    allTags.forEach(tag => {
      tagMap[tag._id.toString()] = {
        _id: tag._id.toString(),
        name: tag.name,
        color: tag.color,
        amount: 0
      };
    });

    transactions.forEach(tx => {
      if (tx.tags && tx.tags.length > 0) {
        tx.tags.forEach(t => {
          const tagIdStr = t._id ? t._id.toString() : t.toString();
          if (tagMap[tagIdStr]) {
            tagMap[tagIdStr].amount += tx.amount;
          }
        });
      }
    });

    const tagsComparison = Object.values(tagMap)
      .filter(t => t.amount > 0)
      .map(t => ({
        ...t,
        amount: parseFloat(t.amount.toFixed(2))
      }))
      .sort((a, b) => b.amount - a.amount);

    // 2. Drilldown for a specific tag
    let categoryBreakdown = [];
    let cumulativeEvolution = [];

    if (tagId) {
      const tagTransactions = transactions.filter(tx => {
        return tx.tags && tx.tags.some(t => (t._id ? t._id.toString() : t.toString()) === tagId);
      });

      // A. Category breakdown for selected tag
      const categoryMap = {};
      tagTransactions.forEach(tx => {
        if (!tx.categoryId) return;
        const catIdStr = tx.categoryId.toString();
        const cat = categoryLookup[catIdStr];
        if (!cat) return;

        let mainCatId = cat._id.toString();
        // If it's a subcategory, group under parent
        if (cat.parentId) {
          mainCatId = cat.parentId.toString();
        }

        const mainCat = categoryLookup[mainCatId] || { name: 'Autre', icon: '❓', color: '#888' };

        if (!categoryMap[mainCatId]) {
          categoryMap[mainCatId] = {
            categoryId: mainCatId,
            name: mainCat.name,
            icon: mainCat.icon,
            color: mainCat.color,
            amount: 0
          };
        }
        categoryMap[mainCatId].amount += tx.amount;
      });

      categoryBreakdown = Object.values(categoryMap)
        .map(cat => ({
          ...cat,
          amount: parseFloat(cat.amount.toFixed(2))
        }))
        .sort((a, b) => b.amount - a.amount);

      // B. Cumulative sum over time
      const sortedTxs = [...tagTransactions].sort((a, b) => new Date(a.date) - new Date(b.date));
      let runningTotal = 0;

      cumulativeEvolution = sortedTxs.map(tx => {
        runningTotal += tx.amount;
        return {
          date: new Date(tx.date).toISOString().split('T')[0],
          amount: parseFloat(tx.amount.toFixed(2)),
          cumulative: parseFloat(runningTotal.toFixed(2)),
          description: tx.description
        };
      });
    }

    res.json({
      tagsComparison,
      categoryBreakdown,
      cumulativeEvolution
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// 9. Fixed vs Variable expenses breakdown for a given month
export const getFixedVsVariableData = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'startDate and endDate are required' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    start.setUTCHours(0, 0, 0, 0);
    end.setUTCHours(23, 59, 59, 999);

    // Fetch all categories
    const allCategories = await Category.find({ userId: req.user.id }).lean();
    const categoryMap = {};
    allCategories.forEach(cat => {
      categoryMap[cat._id.toString()] = cat;
    });

    // Fetch all expense transactions + transfers for the period (not pending)
    const transactions = await Transaction.find({
      userId: req.user.id,
      isPending: { $ne: true },
      date: { $gte: start, $lte: end },
      $or: [
        { type: 'expense' },
        { type: 'transfer' }
      ]
    }).populate('categoryId', 'name icon color parentId').populate('toAccountId', 'type').lean();

    // Filter to keep expenses + only transfers to credit accounts
    const filteredTxs = transactions.filter(tx => 
      tx.type === 'expense' || (tx.type === 'transfer' && tx.toAccountId?.type === 'credit')
    );

    // Separate into fixed (isScheduled=true) and variable
    const fixedTxs = filteredTxs.filter(tx => tx.isScheduled === true);
    const variableTxs = filteredTxs.filter(tx => !tx.isScheduled);

    const buildGrouped = (txList) => {
      const grouped = {};
      txList.forEach(tx => {
        let key;
        let name;
        let icon;
        let color;

        if (tx.type === 'transfer' && tx.toAccountId?.type === 'credit') {
          key = 'credit_repayment';
          name = 'Remboursement Crédit';
          icon = '🏦';
          color = '#f43f5e';
        } else if (!tx.categoryId) {
          key = '__uncategorized__';
          name = 'Non catégorisé';
          icon = '❓';
          color = '#888';
        } else {
          const cat = tx.categoryId;
          const mainCatId = cat.parentId ? cat.parentId.toString() : cat._id.toString();
          const mainCat = categoryMap[mainCatId] || { name: cat.name, icon: cat.icon, color: cat.color };
          key = mainCatId;
          name = mainCat.name;
          icon = mainCat.icon || '📁';
          color = mainCat.color || '#888';
        }

        if (!grouped[key]) {
          grouped[key] = {
            categoryId: key,
            name,
            icon,
            color,
            amount: 0,
            count: 0
          };
        }
        grouped[key].amount += tx.amount;
        grouped[key].count += 1;
      });

      const total = Object.values(grouped).reduce((s, g) => s + g.amount, 0);
      return Object.values(grouped)
        .map(g => ({
          ...g,
          amount: parseFloat(g.amount.toFixed(2)),
          percentage: total > 0 ? parseFloat(((g.amount / total) * 100).toFixed(1)) : 0
        }))
        .sort((a, b) => b.amount - a.amount);
    };

    const fixedCategories = buildGrouped(fixedTxs);
    const variableCategories = buildGrouped(variableTxs);

    const totalFixed = parseFloat(fixedTxs.reduce((s, t) => s + t.amount, 0).toFixed(2));
    const totalVariable = parseFloat(variableTxs.reduce((s, t) => s + t.amount, 0).toFixed(2));
    const totalExpenses = parseFloat((totalFixed + totalVariable).toFixed(2));

    res.json({
      totalExpenses,
      totalFixed,
      totalVariable,
      fixedRatio: totalExpenses > 0 ? parseFloat(((totalFixed / totalExpenses) * 100).toFixed(1)) : 0,
      variableRatio: totalExpenses > 0 ? parseFloat(((totalVariable / totalExpenses) * 100).toFixed(1)) : 0,
      fixedCategories,
      variableCategories
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// 12. Get waterfall chart data (income, grouped expenses, net savings)
export const getWaterfallData = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'startDate and endDate are required' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    start.setUTCHours(0, 0, 0, 0);
    end.setUTCHours(23, 59, 59, 999);

    // Fetch all categories for reference
    const allCategories = await Category.find({ userId: req.user.id }).lean();
    const categoryMap = {};
    allCategories.forEach(cat => {
      categoryMap[cat._id.toString()] = cat;
    });

    // Query active transactions (not pending) for the current period
    const transactions = await Transaction.find({
      userId: req.user.id,
      isPending: { $ne: true },
      date: { $gte: start, $lte: end },
      $or: [
        { type: 'income' },
        { type: 'expense' },
        { type: 'transfer' }
      ]
    }).select('categoryId amount type toAccountId').populate('toAccountId', 'type').lean();

    let totalIncome = 0;
    let totalExpenses = 0;

    // Group expenses by parent category
    const groupedExpenses = {};

    transactions.forEach(tx => {
      if (tx.type === 'income') {
        totalIncome += tx.amount;
      } else if (tx.type === 'expense' || (tx.type === 'transfer' && tx.toAccountId?.type === 'credit')) {
        totalExpenses += tx.amount;
        
        let mainCatId;
        if (tx.type === 'transfer' && tx.toAccountId?.type === 'credit') {
          mainCatId = 'credit_repayment';
        } else {
          if (!tx.categoryId) return;
          const catIdStr = tx.categoryId.toString();
          const cat = categoryMap[catIdStr];
          if (!cat) return;
          mainCatId = cat.parentId ? cat.parentId.toString() : cat._id.toString();
        }

        if (!groupedExpenses[mainCatId]) {
          if (mainCatId === 'credit_repayment') {
            groupedExpenses[mainCatId] = {
              categoryId: 'credit_repayment',
              name: 'Remboursement Crédit',
              icon: '🏦',
              color: '#f43f5e',
              amount: 0
            };
          } else {
            const mainCat = categoryMap[mainCatId] || { name: 'Autre', icon: '❓', color: '#888888' };
            groupedExpenses[mainCatId] = {
              categoryId: mainCatId,
              name: mainCat.name,
              icon: mainCat.icon,
              color: mainCat.color,
              amount: 0
            };
          }
        }
        groupedExpenses[mainCatId].amount += tx.amount;
      }
    });

    // Convert grouped expenses to list, format, and sort by amount descending
    const expensesList = Object.values(groupedExpenses).map(cat => ({
      ...cat,
      amount: parseFloat(cat.amount.toFixed(2))
    })).sort((a, b) => b.amount - a.amount);

    const netSavings = parseFloat((totalIncome - totalExpenses).toFixed(2));

    res.json({
      totalIncome: parseFloat(totalIncome.toFixed(2)),
      totalExpenses: parseFloat(totalExpenses.toFixed(2)),
      netSavings,
      categories: expensesList
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};



