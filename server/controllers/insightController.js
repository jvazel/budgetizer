import Transaction from '../models/Transaction.js';
import ScheduledTransaction from '../models/ScheduledTransaction.js';
import Account from '../models/Account.js';

/**
 * @desc    Get AI Insights (spending anomalies & reduction suggestions)
 * @route   GET /api/insights
 * @access  Private
 */
export const getInsights = async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    
    // Configurable threshold (default user preference or 30%)
    const userDefaultThreshold = req.user.preferences?.anomalyThreshold || 30;
    let threshold = userDefaultThreshold / 100;
    if (req.query.threshold) {
      const val = parseFloat(req.query.threshold);
      if (!isNaN(val)) {
        // If user passes 30, convert to 0.30; otherwise keep decimal value
        threshold = val > 1 ? val / 100 : val;
      }
    }

    // Retrieve user's oldest transaction to determine history age
    const oldestTx = await Transaction.findOne({ userId, isPending: { $ne: true } }).sort({ date: 1 }).lean();
    if (!oldestTx) {
      return res.status(200).json({ 
        anomalies: [], 
        suggestions: [],
        message: "Aucune donnée de transaction trouvée."
      });
    }
    const oldestDate = new Date(oldestTx.date);

    // Identify last 3 full months (UTC)
    const months = [];
    for (let i = 1; i <= 3; i++) {
      const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1, 0, 0, 0, 0));
      // Last day of that month: day 0 of the next month
      const endOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i + 1, 0, 23, 59, 59, 999));
      const monthKey = `${startOfMonth.getUTCFullYear()}-${startOfMonth.getUTCMonth()}`;
      
      // Valid if the end of the month is after or equal to the oldest transaction date
      const isValid = endOfMonth >= oldestDate;
      months.push({
        monthKey,
        startOfMonth,
        endOfMonth,
        isValid
      });
    }

    const validMonths = months.filter(m => m.isValid);
    const numValidMonths = validMonths.length;

    // Constraint: Ignore if less than 2 months of history globally
    if (numValidMonths < 2) {
      return res.status(200).json({
        anomalies: [],
        suggestions: [],
        message: "Pas assez d'historique (minimum 2 mois complets de données requis)."
      });
    }

    // Historical range boundaries
    const startOfHistory = validMonths[validMonths.length - 1].startOfMonth;
    const endOfHistory = validMonths[0].endOfMonth;

    // Fetch user's included accounts
    const includedAccounts = await Account.find({ userId, includeInTotal: { $ne: false } }).select('_id').lean();
    const includedAccountIds = includedAccounts.map(acc => acc._id);

    // Fetch historical expenses (only for included accounts)
    const historyTxs = await Transaction.find({
      userId,
      type: 'expense',
      accountId: { $in: includedAccountIds },
      date: { $gte: startOfHistory, $lte: endOfHistory },
      isPending: { $ne: true }
    }).select('categoryId scheduledTransactionId amount date').populate('categoryId').populate('scheduledTransactionId').lean();

    // Fetch user's active subscriptions to correlate
    const subscriptions = await ScheduledTransaction.find({
      userId,
      isSubscription: true,
      isActive: true
    }).lean();

    // Group history by category and month
    const categoryHistory = {}; // categoryId -> { category: Object, total: Number, months: Set, hasSubscription: Boolean }

    for (const tx of historyTxs) {
      if (!tx.categoryId) continue;
      const catId = tx.categoryId._id.toString();
      const txDate = new Date(tx.date);
      const monthKey = `${txDate.getUTCFullYear()}-${txDate.getUTCMonth()}`;

      if (!categoryHistory[catId]) {
        categoryHistory[catId] = {
          category: tx.categoryId,
          total: 0,
          months: new Set(),
          hasSubscription: false
        };
      }

      categoryHistory[catId].total += tx.amount;
      categoryHistory[catId].months.add(monthKey);

      // Check if this transaction came from a subscription
      if (tx.scheduledTransactionId && tx.scheduledTransactionId.isSubscription) {
        categoryHistory[catId].hasSubscription = true;
      }
    }

    // Fetch current month's expenses (UTC)
    const startOfCurrentMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
    const endOfCurrentMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));

    const currentMonthTxs = await Transaction.find({
      userId,
      type: 'expense',
      accountId: { $in: includedAccountIds },
      date: { $gte: startOfCurrentMonth, $lte: endOfCurrentMonth },
      isPending: { $ne: true }
    }).select('categoryId scheduledTransactionId amount').populate('categoryId').populate('scheduledTransactionId').lean();

    const currentCategorySpending = {}; // categoryId -> Number
    for (const tx of currentMonthTxs) {
      if (!tx.categoryId) continue;
      const catId = tx.categoryId._id.toString();
      currentCategorySpending[catId] = (currentCategorySpending[catId] || 0) + tx.amount;

      // Update subscription flag if found in current month
      if (tx.scheduledTransactionId && tx.scheduledTransactionId.isSubscription) {
        if (categoryHistory[catId]) {
          categoryHistory[catId].hasSubscription = true;
        }
      }
    }

    const anomalies = [];
    const suggestionsCandidates = [];

    // Analyze each category found in the historical data
    for (const [catId, historyData] of Object.entries(categoryHistory)) {
      const { category, total, months: activeMonths, hasSubscription } = historyData;

      // Constraint: Ignore categories with less than 2 months of history in the 3-month window
      if (activeMonths.size < 2) {
        continue;
      }

      // Monthly average based on the number of valid history months
      const averageAmount = total / numValidMonths;
      const currentAmount = currentCategorySpending[catId] || 0;

      // Trigger anomaly if current month's spending exceeds average by more than the threshold
      if (currentAmount > averageAmount * (1 + threshold)) {
        const diffPercent = ((currentAmount - averageAmount) / averageAmount) * 100;
        let severity = 'orange';
        if (diffPercent >= 60) {
          severity = 'red';
        }

        anomalies.push({
          categoryId: catId,
          name: category.name,
          icon: category.icon,
          color: category.color,
          currentAmount: parseFloat(currentAmount.toFixed(2)),
          averageAmount: parseFloat(averageAmount.toFixed(2)),
          differencePercentage: parseFloat(diffPercent.toFixed(2)),
          severity
        });
      }

      // Check if there is an active subscription in this category or if we flagged it in transactions
      const isSub = hasSubscription || subscriptions.some(s => s.categoryId?.toString() === catId);

      suggestionsCandidates.push({
        categoryId: catId,
        name: category.name,
        icon: category.icon,
        color: category.color,
        averageMonthlyAmount: parseFloat(averageAmount.toFixed(2)),
        totalHistoricalSpent: total,
        hasSubscription: isSub
      });
    }

    // Suggestions: Identify top 3 spending categories over the last 3 months
    const top3Categories = suggestionsCandidates
      .sort((a, b) => b.totalHistoricalSpent - a.totalHistoricalSpent)
      .slice(0, 3);

    const suggestions = top3Categories.map(cat => {
      const avg = cat.averageMonthlyAmount;
      return {
        categoryId: cat.categoryId,
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
        averageMonthlyAmount: avg,
        // Calculate projected annual savings
        savings10: parseFloat(((avg * 0.10) * 12).toFixed(2)),
        savings20: parseFloat(((avg * 0.20) * 12).toFixed(2)),
        savings30: parseFloat(((avg * 0.30) * 12).toFixed(2)),
        hasSubscription: cat.hasSubscription
      };
    });

    return res.status(200).json({
      anomalies,
      suggestions
    });

  } catch (error) {
    console.error('Error generating insights:', error);
    return res.status(500).json({ message: 'Server Error during insights generation' });
  }
};
