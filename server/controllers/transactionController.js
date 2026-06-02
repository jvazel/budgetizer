import Transaction from '../models/Transaction.js';
import Account from '../models/Account.js';
import Category from '../models/Category.js';
import ScheduledTransaction from '../models/ScheduledTransaction.js';
import SavingsGoal from '../models/SavingsGoal.js';
import User from '../models/User.js';
import Budget from '../models/Budget.js';
import { sendPushNotification } from '../utils/pushNotification.js';
import mongoose from 'mongoose';

// Helper for budget dates
const getBudgetPeriodDates = (period, referenceDate = new Date()) => {
  let start, end;
  const ref = new Date(referenceDate);
  if (period === 'weekly') {
    const day = ref.getDay();
    const diff = ref.getDate() - day + (day === 0 ? -6 : 1);
    start = new Date(ref.getFullYear(), ref.getMonth(), diff, 0, 0, 0, 0);
    end = new Date(start.getTime());
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
  } else if (period === 'yearly') {
    start = new Date(ref.getFullYear(), 0, 1, 0, 0, 0, 0);
    end = new Date(ref.getFullYear(), 11, 31, 23, 59, 59, 999);
  } else { // monthly
    start = new Date(ref.getFullYear(), ref.getMonth(), 1, 0, 0, 0, 0);
    end = new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 23, 59, 59, 999);
  }
  return { start, end };
};

const checkAndTriggerAlerts = async (userId, transaction, amount, oldTransaction = null) => {
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
      for (const budget of budgets) {
        const { start, end } = getBudgetPeriodDates(budget.period, transaction.date || new Date());
        
        // Sum expenses for this category in the period
        const periodTransactions = await Transaction.find({
          userId,
          type: 'expense',
          categoryId: budget.categoryId,
          date: { $gte: start, $lte: end }
        });
        const spentAfter = periodTransactions.reduce((sum, t) => sum + t.amount, 0);
        
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
      }
    }
  } catch (err) {
    console.error('Error triggering alerts:', err);
  }
};

// Utility function to update account balance
const updateAccountBalance = async (accountId, amount, type, session = null) => {
  const account = await Account.findById(accountId).session(session);
  if (!account) throw new Error('Account not found');

  if (type === 'expense') {
    account.balance -= amount;
  } else if (type === 'income') {
    account.balance += amount;
  }
  await account.save({ session });
};

// Utility function to update savings goal progress
const updateSavingsGoalProgress = async (goalId, amount, type, isRevert = false, session = null) => {
  const goal = await SavingsGoal.findById(goalId).session(session);
  if (!goal) return;

  let delta = 0;
  if (type === 'expense') {
    delta = isRevert ? -amount : amount;
  } else if (type === 'income') {
    delta = isRevert ? amount : -amount;
  }

  goal.currentAmount += delta;
  await goal.save({ session });
};

// @desc    Get user transactions with pagination & filters
// @route   GET /api/transactions
// @access  Private
export const getTransactions = async (req, res) => {
  try {
    const { accountId, categoryId, type, startDate, endDate, search, page = 1, limit = 20 } = req.query;

    let query = { userId: req.user.id };

    if (accountId) query.accountId = accountId;
    if (categoryId) query.categoryId = categoryId;
    if (type) query.type = type;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setUTCHours(0, 0, 0, 0);
        query.date.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setUTCHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }
    if (search) {
      const escapedSearch = search.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&');
      const searchRegex = { $regex: escapedSearch, $options: 'i' };

      // Find matching accounts and categories to allow searching by their names
      const [matchingAccounts, matchingCategories] = await Promise.all([
        Account.find({ userId: req.user.id, name: searchRegex }),
        Category.find({ userId: req.user.id, name: searchRegex })
      ]);

      const accountIds = matchingAccounts.map(a => a._id);
      const categoryIds = matchingCategories.map(c => c._id);

      query.$or = [
        { description: searchRegex },
        { note: searchRegex },
        { accountId: { $in: accountIds } },
        { toAccountId: { $in: accountIds } },
        { categoryId: { $in: categoryIds } },
        { tags: searchRegex }
      ];

      // Also support searching by numeric amount if search query is a number
      const searchNum = parseFloat(search);
      if (!isNaN(searchNum)) {
        query.$or.push({ amount: searchNum });
      }
    }

    const transactions = await Transaction.find(query)
      .populate('categoryId', 'name icon color type')
      .populate('accountId', 'name color icon')
      .populate('toAccountId', 'name color icon')
      .sort({ date: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Transaction.countDocuments(query);

    res.json({
      transactions,
      page: Number(page),
      pages: Math.ceil(total / limit),
      total
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server Error');
  }
};

// @desc    Create a new transaction
// @route   POST /api/transactions
// @access  Private
export const createTransaction = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { accountId, categoryId, type, amount, description, date, note, toAccountId, savingsGoalId } = req.body;

    const transaction = new Transaction({
      userId: req.user.id,
      accountId,
      categoryId,
      type,
      amount,
      description,
      date,
      note,
      toAccountId,
      savingsGoalId
    });

    await transaction.save({ session });

    // Update balances
    if (type === 'transfer') {
      if (!toAccountId) throw new Error('toAccountId is required for transfer');
      await updateAccountBalance(accountId, amount, 'expense', session); // From account
      await updateAccountBalance(toAccountId, amount, 'income', session); // To account
    } else {
      await updateAccountBalance(accountId, amount, type, session);
      if (savingsGoalId) {
        await updateSavingsGoalProgress(savingsGoalId, amount, type, false, session);
      }
    }

    await session.commitTransaction();
    
    // Trigger push notifications in background
    checkAndTriggerAlerts(req.user.id, transaction, amount).catch(err => console.error('Alert trigger error:', err));
    
    // Fetch with populated fields to return
    const populatedTx = await Transaction.findById(transaction._id)
      .populate('categoryId', 'name icon color type')
      .populate('accountId', 'name color icon')
      .populate('toAccountId', 'name color icon')
      .populate('savingsGoalId', 'name icon color');
      
    res.status(201).json(populatedTx);
  } catch (error) {
    await session.abortTransaction();
    console.error(error.message);
    res.status(500).json({ message: error.message || 'Server Error' });
  } finally {
    session.endSession();
  }
};

// @desc    Delete a transaction
// @route   DELETE /api/transactions/:id
// @access  Private
export const deleteTransaction = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) return res.status(404).json({ message: 'Transaction not found' });
    if (transaction.userId.toString() !== req.user.id) return res.status(401).json({ message: 'Not authorized' });

    // Revert balances
    if (transaction.type === 'transfer') {
      await updateAccountBalance(transaction.accountId, transaction.amount, 'income', session);
      if (transaction.toAccountId) {
        await updateAccountBalance(transaction.toAccountId, transaction.amount, 'expense', session);
      }
    } else {
      // If it was an expense, adding it back means 'income' type operation on balance
      const revertType = transaction.type === 'expense' ? 'income' : 'expense';
      await updateAccountBalance(transaction.accountId, transaction.amount, revertType, session);
      if (transaction.savingsGoalId) {
        await updateSavingsGoalProgress(transaction.savingsGoalId, transaction.amount, transaction.type, true, session);
      }
    }

    await Transaction.findByIdAndDelete(req.params.id, { session });
    
    await session.commitTransaction();
    res.json({ message: 'Transaction removed' });
  } catch (error) {
    await session.abortTransaction();
    console.error(error.message);
    res.status(500).json({ message: error.message || 'Server Error' });
  } finally {
    session.endSession();
  }
};

// @desc    Get transactions for calendar view (combining real + projected scheduled transactions)
// @route   GET /api/transactions/calendar
// @access  Private
export const getCalendarTransactions = async (req, res) => {
  try {
    const { month } = req.query; // format: YYYY-MM
    let startDate, endDate;

    if (month) {
      const [y, m] = month.split('-');
      startDate = new Date(y, m - 1, 1);
      endDate = new Date(y, m, 0, 23, 59, 59, 999);
    } else {
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    // 1. Fetch real transactions
    const realTransactions = await Transaction.find({
      userId: req.user.id,
      date: { $gte: startDate, $lte: endDate }
    }).populate('categoryId', 'name icon color type').populate('accountId', 'name color icon');

    // 2. Fetch active scheduled transactions that could occur in this period
    const scheduledTxs = await ScheduledTransaction.find({
      userId: req.user.id,
      isActive: true,
      nextDate: { $lte: endDate }
    }).populate('categoryId', 'name icon color type').populate('accountId', 'name color icon');

    // Calculate occurrences
    const projectedTransactions = [];
    
    scheduledTxs.forEach(st => {
      let curr = new Date(st.nextDate);
      let timesLeft = st.numberOfTimes > 0 ? (st.numberOfTimes - st.timesExecuted) : Infinity;
      
      while (curr <= endDate && timesLeft > 0) {
        if (st.endDate && curr > st.endDate) break;
        
        // If occurrence falls within the requested month
        if (curr >= startDate && curr <= endDate) {
          projectedTransactions.push({
            _id: `projected-${st._id}-${curr.getTime()}`,
            userId: st.userId,
            accountId: st.accountId,
            categoryId: st.categoryId,
            type: st.type,
            amount: st.amount,
            description: st.description,
            note: st.note,
            date: new Date(curr),
            isPlanned: true
          });
        }

        // Move to next date
        const { every, unit } = st.frequency;
        if (st.frequency && every > 0 && unit) {
          if (unit === 'day') {
            curr.setDate(curr.getDate() + every);
          } else if (unit === 'week') {
            curr.setDate(curr.getDate() + every * 7);
          } else if (unit === 'month') {
            curr.setMonth(curr.getMonth() + every);
          } else if (unit === 'year') {
            curr.setFullYear(curr.getFullYear() + every);
          }
        } else {
          break; // Avoid infinite loops if unit or every is invalid
        }
        
        timesLeft--;
      }
    });

    const allTransactions = [...realTransactions, ...projectedTransactions];
    res.json(allTransactions);
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server Error');
  }
};

// @desc    Export transactions to CSV
// @route   GET /api/transactions/export
// @access  Private
export const exportTransactions = async (req, res) => {
  try {
    const { startDate, endDate, accountId } = req.query;
    let query = { userId: req.user.id };

    if (accountId) query.accountId = accountId;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setUTCHours(0, 0, 0, 0);
        query.date.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setUTCHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    const txs = await Transaction.find(query)
      .populate('categoryId', 'name')
      .populate('accountId', 'name')
      .sort({ date: -1 });

    let csvContent = 'date,description,amount,type,category,account\n';
    txs.forEach(tx => {
      const d = tx.date ? new Date(tx.date).toISOString().split('T')[0] : '';
      const desc = tx.description ? `"${tx.description.replace(/"/g, '""')}"` : '';
      const amt = tx.amount;
      const t = tx.type;
      const cat = tx.categoryId ? `"${tx.categoryId.name.replace(/"/g, '""')}"` : '';
      const acc = tx.accountId ? `"${tx.accountId.name.replace(/"/g, '""')}"` : '';
      csvContent += `${d},${desc},${amt},${t},${cat},${acc}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=transactions_export.csv');
    return res.status(200).send(csvContent);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server Error during CSV export' });
  }
};

// @desc    Import transactions from CSV
// @route   POST /api/transactions/import
// @access  Private
export const importTransactions = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ message: 'Veuillez uploader un fichier CSV.' });
    }

    const csvText = req.file.buffer.toString('utf-8');
    const lines = csvText.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length <= 1) {
      return res.status(400).json({ message: 'Le fichier CSV est vide ou ne contient que l\'en-tête.' });
    }

    // Custom CSV row parser to handle quotes, commas and semicolons correctly
    const parseCSVRow = (row) => {
      const result = [];
      let insideQuote = false;
      let entry = '';
      for (let i = 0; i < row.length; i++) {
        const char = row[i];
        if (char === '"') {
          insideQuote = !insideQuote;
        } else if ((char === ',' || char === ';') && !insideQuote) {
          result.push(entry.trim().replace(/^"|"$/g, ''));
          entry = '';
        } else {
          entry += char;
        }
      }
      result.push(entry.trim().replace(/^"|"$/g, ''));
      return result;
    };

    let importedCount = 0;
    let failedCount = 0;
    const errors = [];

    // Skip headers
    for (let i = 1; i < lines.length; i++) {
      const cols = parseCSVRow(lines[i]);
      // Columns structure: date, description, amount, type, category, account
      if (cols.length < 6) {
        failedCount++;
        errors.push(`Ligne ${i + 1}: Manque de colonnes requis (min. 6 colonnes).`);
        continue;
      }

      const [dateRaw, description, amountRaw, typeRaw, categoryName, accountName] = cols;

      const date = new Date(dateRaw);
      if (isNaN(date.getTime())) {
        failedCount++;
        errors.push(`Ligne ${i + 1}: Date invalide (${dateRaw}).`);
        continue;
      }

      const amount = parseFloat(amountRaw.replace(/[^\d.-]/g, ''));
      if (isNaN(amount) || amount <= 0) {
        failedCount++;
        errors.push(`Ligne ${i + 1}: Montant invalide (${amountRaw}).`);
        continue;
      }

      const type = typeRaw.trim().toLowerCase();
      if (!['expense', 'income', 'transfer'].includes(type)) {
        failedCount++;
        errors.push(`Ligne ${i + 1}: Type invalide (${typeRaw}). Doit être expense, income ou transfer.`);
        continue;
      }

      // 1. Resolve Account
      let account = await Account.findOne({
        userId: req.user.id,
        name: { $regex: new RegExp(`^${accountName.trim()}$`, 'i') }
      }).session(session);

      if (!account) {
        account = new Account({
          userId: req.user.id,
          name: accountName.trim(),
          type: 'checking',
          balance: 0,
          color: '#10b981',
          icon: '💳'
        });
        await account.save({ session });
      }

      // 2. Resolve Category
      let category = null;
      if (type !== 'transfer') {
        category = await Category.findOne({
          userId: req.user.id,
          name: { $regex: new RegExp(`^${categoryName.trim()}$`, 'i') },
          type
        }).session(session);

        if (!category) {
          category = new Category({
            userId: req.user.id,
            name: categoryName.trim(),
            icon: '📁',
            color: '#10b981',
            type
          });
          await category.save({ session });
        }
      }

      // Create transaction
      const transaction = new Transaction({
        userId: req.user.id,
        accountId: account._id,
        categoryId: category ? category._id : undefined,
        type,
        amount,
        description: description || categoryName || 'Transaction CSV',
        date,
        isPending: false
      });

      await transaction.save({ session });

      // Update account balance
      await updateAccountBalance(account._id, amount, type, session);
      importedCount++;
    }

    await session.commitTransaction();
    res.json({
      success: true,
      importedCount,
      failedCount,
      errors
    });
  } catch (error) {
    await session.abortTransaction();
    console.error(error);
    res.status(500).json({ message: error.message || 'Server Error during CSV import' });
  } finally {
    session.endSession();
  }
};

// @desc    Update a transaction
// @route   PUT /api/transactions/:id
// @access  Private
export const updateTransaction = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { accountId, categoryId, type, amount, description, date, note, toAccountId, savingsGoalId } = req.body;
    const transaction = await Transaction.findById(req.params.id).session(session);

    if (!transaction) return res.status(404).json({ message: 'Transaction non trouvée' });
    if (transaction.userId.toString() !== req.user.id) return res.status(401).json({ message: 'Non autorisé' });

    // Store old transaction state before updates for comparison in alerts
    const oldTransactionCopy = {
      amount: transaction.amount,
      accountId: transaction.accountId,
      categoryId: transaction.categoryId,
      type: transaction.type
    };

    // 1. Revert OLD balance impact
    if (transaction.type === 'transfer') {
      await updateAccountBalance(transaction.accountId, transaction.amount, 'income', session); // Revert expense
      if (transaction.toAccountId) {
        await updateAccountBalance(transaction.toAccountId, transaction.amount, 'expense', session); // Revert income
      }
    } else {
      const revertType = transaction.type === 'expense' ? 'income' : 'expense';
      await updateAccountBalance(transaction.accountId, transaction.amount, revertType, session);
      if (transaction.savingsGoalId) {
        await updateSavingsGoalProgress(transaction.savingsGoalId, transaction.amount, transaction.type, true, session);
      }
    }

    // 2. Assign new fields
    transaction.accountId = accountId || transaction.accountId;
    transaction.categoryId = categoryId !== undefined ? categoryId : transaction.categoryId;
    transaction.type = type || transaction.type;
    transaction.amount = amount !== undefined ? amount : transaction.amount;
    transaction.description = description || transaction.description;
    transaction.date = date || transaction.date;
    transaction.note = note !== undefined ? note : transaction.note;
    transaction.toAccountId = toAccountId !== undefined ? toAccountId : transaction.toAccountId;
    if (req.body.hasOwnProperty('savingsGoalId')) {
      transaction.savingsGoalId = savingsGoalId;
    }

    await transaction.save({ session });

    // 3. Apply NEW balance impact
    if (transaction.type === 'transfer') {
      if (!transaction.toAccountId) throw new Error('Un compte destinataire est requis pour un transfert.');
      await updateAccountBalance(transaction.accountId, transaction.amount, 'expense', session);
      await updateAccountBalance(transaction.toAccountId, transaction.amount, 'income', session);
    } else {
      await updateAccountBalance(transaction.accountId, transaction.amount, transaction.type, session);
      if (transaction.savingsGoalId) {
        await updateSavingsGoalProgress(transaction.savingsGoalId, transaction.amount, transaction.type, false, session);
      }
    }

    await session.commitTransaction();

    // Trigger push notifications in background
    checkAndTriggerAlerts(req.user.id, transaction, amount, oldTransactionCopy).catch(err => console.error('Alert trigger error:', err));

    const populatedTx = await Transaction.findById(transaction._id)
      .populate('categoryId', 'name icon color type')
      .populate('accountId', 'name color icon')
      .populate('toAccountId', 'name color icon')
      .populate('savingsGoalId', 'name icon color');

    res.json(populatedTx);
  } catch (error) {
    await session.abortTransaction();
    console.error(error.message);
    res.status(500).json({ message: error.message || 'Server Error' });
  } finally {
    session.endSession();
  }
};
