import Transaction from '../models/Transaction';
import Account from '../models/Account';
import Category from '../models/Category';
import ScheduledTransaction from '../models/ScheduledTransaction';
import SavingsGoal from '../models/SavingsGoal';
import Tag from '../models/Tag';
import { invalidateMonthlyReport } from '../utils/cacheInvalidator';
import { invalidateDashboardCache } from './dashboardController';
import { eventBus } from '../utils/eventBus';
import mongoose from 'mongoose';
import Share from '../models/Share';
import { logger } from '../utils/logger';
import { AppRequest, AppResponse } from '../types';

// Utility function to update savings goal progress
const updateSavingsGoalProgress = async (
  goalId: any,
  amount: any,
  type: any,
  isRevert = false,
  session: any = null,
  transaction: any = null
) => {
  const goal = await SavingsGoal.findById(goalId).session(session);
  if (!goal) return;

  const numericAmount = Number(amount);
  if (isNaN(numericAmount)) throw new Error('Invalid amount');

  let delta = 0;
  if (type === 'expense') {
    delta = isRevert ? -numericAmount : numericAmount;
  } else if (type === 'income') {
    delta = isRevert ? numericAmount : -numericAmount;
  } else if (type === 'transfer') {
    if (goal.accountId && transaction) {
      const goalAccountIdStr = goal.accountId.toString();
      const isToGoalAccount = transaction.toAccountId?.toString() === goalAccountIdStr;
      const isFromGoalAccount = transaction.accountId?.toString() === goalAccountIdStr;

      if (isToGoalAccount) {
        // Transfer to goal account = deposit
        delta = isRevert ? -numericAmount : numericAmount;
      } else if (isFromGoalAccount) {
        // Transfer from goal account = withdrawal
        delta = isRevert ? numericAmount : -numericAmount;
      }
    }
  }

  if (delta !== 0) {
    const updatedGoal = await SavingsGoal.findOneAndUpdate(
      { _id: goalId },
      { $inc: { currentAmount: delta } },
      { session, new: true }
    );
    if (!updatedGoal) throw new Error('Savings goal not found');
  }
};

// @desc    Get user transactions with pagination & filters
// @route   GET /api/transactions
// @access  Private
export const getTransactions = async (req: AppRequest, res: AppResponse) => {
  try {
    const { accountId, categoryId, type, startDate, endDate, search, tags, page, limit } = req.query as Record<string, string>;

    // Retrieve all accessible accounts for the user
    const ownedAccounts = await Account.find({ userId: req.user!.id }).select('_id');
    const shares = await Share.find({ sharedWithId: req.user!.id, resourceType: 'account' }).select('resourceId');
    
    const accessibleAccountIds = [
      ...ownedAccounts.map(a => a._id),
      ...shares.map(s => s.resourceId)
    ];

    let query: Record<string, any> = { isPending: { $ne: true } };

    if (accountId) {
      // Check authorization
      const isAuthorized = accessibleAccountIds.some(id => id.toString() === accountId.toString());
      if (!isAuthorized) {
        return res.status(401).json({ message: 'Non autorisé à accéder à ce compte.' });
      }
      query.$or = [
        { accountId: accountId },
        { toAccountId: accountId }
      ];
    } else {
      // Return transactions from any accessible account, or created by the user
      query.$or = [
        { userId: req.user!.id },
        { accountId: { $in: accessibleAccountIds } },
        { toAccountId: { $in: accessibleAccountIds } }
      ];
    }

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
    if (tags) {
      const tagIds = tags.split(',').map(id => id.trim()).filter(Boolean);
      if (tagIds.length > 0) {
        query.tags = { $in: tagIds };
      }
    }
    if (search) {
      const escapedSearch = search.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&');
      const searchRegex = { $regex: escapedSearch, $options: 'i' };

      // Find matching accounts, categories, and tags to allow searching by their names
      const [matchingAccounts, matchingCategories, matchingTags] = await Promise.all([
        Account.find({ _id: { $in: accessibleAccountIds }, name: searchRegex }),
        Category.find({ userId: req.user!.id, name: searchRegex }),
        Tag.find({ userId: req.user!.id, name: searchRegex })
      ]);

      const accountIds = matchingAccounts.map(a => a._id);
      const categoryIds = matchingCategories.map(c => c._id);
      const tagIds = matchingTags.map(t => t._id);

      const searchOr: any[] = [
        { description: searchRegex },
        { note: searchRegex },
        { accountId: { $in: accountIds } },
        { toAccountId: { $in: accountIds } },
        { categoryId: { $in: categoryIds } },
        { tags: { $in: tagIds } }
      ];

      // Also support searching by numeric amount if search query is a number
      const searchNum = parseFloat(search);
      if (!isNaN(searchNum)) {
        searchOr.push({ amount: searchNum });
      }

      if (query.$or) {
        query.$and = [
          { $or: query.$or },
          { $or: searchOr }
        ];
        delete query.$or;
      } else {
        query.$or = searchOr;
      }
    }

    const transactions = await Transaction.find(query)
      .populate('categoryId', 'name icon color type')
      .populate('accountId', 'name color icon')
      .populate('toAccountId', 'name color icon')
      .populate('tags', 'name color')
      .sort({ date: -1, createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    const total = await Transaction.countDocuments(query);

    res.json({
      transactions,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      total
    });
  } catch (error: unknown) {
    logger.error((error as Error).message);
    res.status(500).send('Server Error');
  }
};

// @desc    Create a new transaction
// @route   POST /api/transactions
// @access  Private
export const createTransaction = async (req: AppRequest, res: AppResponse) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { accountId, categoryId, type, amount, description, date, note, toAccountId, savingsGoalId, tags } = req.body;

    // Validate write permission on source account
    const sourceAccount = await Account.findById(accountId);
    if (!sourceAccount) return res.status(404).json({ message: 'Compte source non trouvé' });
    if (sourceAccount.userId.toString() !== req.user!.id) {
      const hasWrite = await Share.exists({
        resourceType: 'account',
        resourceId: accountId,
        sharedWithId: req.user!.id,
        permission: 'write'
      });
      if (!hasWrite) {
        return res.status(401).json({ message: 'Non autorisé à écrire sur ce compte' });
      }
    }

    // Validate write permission on destination account if transfer
    if (type === 'transfer') {
      if (!toAccountId) return res.status(400).json({ message: 'Le compte destinataire est requis pour un virement.' });
      const destAccount = await Account.findById(toAccountId);
      if (!destAccount) return res.status(404).json({ message: 'Compte destinataire non trouvé' });
      if (destAccount.userId.toString() !== req.user!.id) {
        const hasWrite = await Share.exists({
          resourceType: 'account',
          resourceId: toAccountId,
          sharedWithId: req.user!.id,
          permission: 'write'
        });
        if (!hasWrite) {
          return res.status(401).json({ message: 'Non autorisé à écrire sur le compte destinataire' });
        }
      }
    }

    const transaction = new Transaction({
      userId: req.user!.id,
      accountId,
      categoryId,
      type,
      amount,
      description,
      date,
      note,
      toAccountId,
      savingsGoalId,
      tags: tags || []
    });

    await transaction.save({ session });

    // Update balances
    if (type === 'transfer') {
      if (!toAccountId) throw new Error('toAccountId is required for transfer');
      await Account.updateBalance(accountId, amount, 'expense', session); // From account
      await Account.updateBalance(toAccountId, amount, 'income', session); // To account
      if (savingsGoalId) {
        await updateSavingsGoalProgress(savingsGoalId, amount, type, false, session, transaction);
      }
    } else {
      await Account.updateBalance(accountId, amount, type, session);
      if (savingsGoalId) {
        await updateSavingsGoalProgress(savingsGoalId, amount, type, false, session, transaction);
      }
    }

    await session.commitTransaction();
    
    // Trigger push notifications in background via EventBus
    eventBus.emit('transaction:created', { userId: req.user!.id, transaction, amount });
    
    // Invalidate monthly report cache
    invalidateMonthlyReport(req.user!.id, transaction.date).catch(err => logger.error('Cache invalidation error', { error: err }));
    invalidateDashboardCache(req.user!.id);

    // Fetch with populated fields to return
    const populatedTx = await Transaction.findById(transaction._id)
      .populate('categoryId', 'name icon color type')
      .populate('accountId', 'name color icon')
      .populate('toAccountId', 'name color icon')
      .populate('savingsGoalId', 'name icon color')
      .populate('tags', 'name color');
      
    res.status(201).json(populatedTx);
  } catch (error: unknown) {
    await session.abortTransaction();
    logger.error((error as Error).message);
    res.status(500).json({ message: (error as Error).message || 'Server Error' });
  } finally {
    session.endSession();
  }
};

// @desc    Delete a transaction
// @route   DELETE /api/transactions/:id
// @access  Private
export const deleteTransaction = async (req: AppRequest, res: AppResponse) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) return res.status(404).json({ message: 'Transaction not found' });
    
    const isCreator = transaction.userId.toString() === req.user!.id;
    const account = await Account.findById(transaction.accountId);
    const isAccountOwner = account && account.userId.toString() === req.user!.id;
    const hasWrite = await Share.exists({
      resourceType: 'account',
      resourceId: transaction.accountId,
      sharedWithId: req.user!.id,
      permission: 'write'
    });

    if (!isCreator && !isAccountOwner && !hasWrite) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    // Revert balances if the transaction is not pending (meaning it was actually executed and affected balances)
    if (!transaction.isPending) {
      if (transaction.type === 'transfer') {
        await Account.updateBalance(transaction.accountId, transaction.amount, 'income', session);
        if (transaction.toAccountId) {
          await Account.updateBalance(transaction.toAccountId, transaction.amount, 'expense', session);
        }
        if (transaction.savingsGoalId) {
          await updateSavingsGoalProgress(transaction.savingsGoalId, transaction.amount, transaction.type, true, session, transaction);
        }
      } else {
        // If it was an expense, adding it back means 'income' type operation on balance
        const revertType = transaction.type === 'expense' ? 'income' : 'expense';
        await Account.updateBalance(transaction.accountId, transaction.amount, revertType, session);
        if (transaction.savingsGoalId) {
          await updateSavingsGoalProgress(transaction.savingsGoalId, transaction.amount, transaction.type, true, session, transaction);
        }
      }
    }

    await Transaction.findByIdAndDelete(req.params.id, { session });
    
    await session.commitTransaction();
    
    // Invalidate monthly report cache
    invalidateMonthlyReport(req.user!.id, transaction.date).catch(err => logger.error('Cache invalidation error', { error: err }));
    invalidateDashboardCache(req.user!.id);

    res.json({ message: 'Transaction removed' });
  } catch (error: unknown) {
    await session.abortTransaction();
    logger.error((error as Error).message);
    res.status(500).json({ message: (error as Error).message || 'Server Error' });
  } finally {
    session.endSession();
  }
};

// @desc    Get transactions for calendar view (combining real + projected scheduled transactions)
// @route   GET /api/transactions/calendar
// @access  Private
export const getCalendarTransactions = async (req: AppRequest, res: AppResponse) => {
  try {
    const { month } = req.query as Record<string, string>; // format: YYYY-MM
    let startDate, endDate;

    if (month) {
      const [y, m] = month.split('-').map(Number);
      startDate = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
      endDate = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
    } else {
      const now = new Date();
      startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
      endDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));
    }

    // 1. Fetch real transactions and active scheduled transactions in parallel
    const [realTransactions, scheduledTxs] = await Promise.all([
      Transaction.find({
        userId: req.user!.id,
        date: { $gte: startDate, $lte: endDate }
      }).populate('categoryId', 'name icon color type').populate('accountId', 'name color icon'),
      ScheduledTransaction.find({
        userId: req.user!.id,
        isActive: true,
        nextDate: { $lte: endDate }
      }).populate('categoryId', 'name icon color type').populate('accountId', 'name color icon')
    ]);

    // Calculate occurrences
    const projectedTransactions: any[] = [];
    
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

        // Move to next date (UTC)
        const { every, unit } = st.frequency;
        if (st.frequency && every > 0 && unit) {
          if (unit === 'day') {
            curr.setUTCDate(curr.getUTCDate() + every);
          } else if (unit === 'week') {
            curr.setUTCDate(curr.getUTCDate() + every * 7);
          } else if (unit === 'month') {
            curr.setUTCMonth(curr.getUTCMonth() + every);
          } else if (unit === 'year') {
            curr.setUTCFullYear(curr.getUTCFullYear() + every);
          }
        } else {
          break; // Avoid infinite loops if unit or every is invalid
        }
        
        timesLeft--;
      }
    });

    const allTransactions = [
      ...realTransactions.map(tx => {
        if (tx.isPending) {
          const txObj = tx.toObject ? tx.toObject() : tx;
          return { ...txObj, isPlanned: true };
        }
        return tx;
      }),
      ...projectedTransactions
    ];
    res.json(allTransactions);
  } catch (error: unknown) {
    logger.error((error as Error).message);
    res.status(500).send('Server Error');
  }
};

// @desc    Export transactions to CSV
// @route   GET /api/transactions/export
// @access  Private
export const exportTransactions = async (req: AppRequest, res: AppResponse) => {
  try {
    const { startDate, endDate, accountId } = req.query as Record<string, string>;
    let query: Record<string, any> = { userId: req.user!.id, isPending: { $ne: true } };

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
      .populate('toAccountId', 'name')
      .sort({ date: -1 });

    let csvContent = 'date,description,amount,type,category,account,toAccount\n';
    txs.forEach(tx => {
      const d = tx.date ? new Date(tx.date).toISOString().split('T')[0] : '';
      const desc = tx.description ? `"${tx.description.replace(/"/g, '""')}"` : '';
      const amt = tx.amount;
      const t = tx.type;
      const cat = tx.categoryId ? `"${(tx.categoryId as { name?: string }).name?.replace(/"/g, '""')}"` : '';
      const acc = tx.accountId ? `"${(tx.accountId as { name?: string }).name?.replace(/"/g, '""')}"` : '';
      const toAcc = tx.toAccountId ? `"${(tx.toAccountId as { name?: string }).name?.replace(/"/g, '""')}"` : '';
      csvContent += `${d},${desc},${amt},${t},${cat},${acc},${toAcc}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=transactions_export.csv');
    return res.status(200).send(csvContent);
  } catch (error: unknown) {
    logger.error((error as Error).message);
    return res.status(500).json({ message: 'Server Error during CSV export' });
  }
};

// @desc    Import transactions from CSV
// @route   POST /api/transactions/import
// @access  Private
export const importTransactions = async (req: AppRequest, res: AppResponse) => {
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
    const parseCSVRow = (row: string) => {
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
    const errors: string[] = [];

    // Cache all existing accounts and categories to avoid redundant findOne queries
    const existingAccounts = await Account.find({ userId: req.user!.id }).session(session);
    const existingCategories = await Category.find({ userId: req.user!.id }).session(session);

    const accountsMap = new Map();
    existingAccounts.forEach(acc => accountsMap.set(acc.name.toLowerCase().trim(), acc));

    const categoriesMap = new Map();
    existingCategories.forEach(cat => categoriesMap.set(`${cat.name.toLowerCase().trim()}_${cat.type}`, cat));

    const transactionsToInsert: any[] = [];

    // Cache new accounts and categories to bulk-insert later
    const newAccountsToInsert: any[] = [];
    const newCategoriesToInsert: any[] = [];

    // Skip headers
    for (let i = 1; i < lines.length; i++) {
      const cols = parseCSVRow(lines[i]);
      // Columns structure: date, description, amount, type, category, account, toAccount
      if (cols.length < 6) {
        failedCount++;
        errors.push(`Ligne ${i + 1}: Manque de colonnes requis (min. 6 colonnes).`);
        continue;
      }

      const [dateRaw, description, amountRaw, typeRaw, categoryName, accountName, toAccountName] = cols;

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
      const accKey = accountName.trim().toLowerCase();
      let account = accountsMap.get(accKey);

      if (!account) {
        account = new Account({
          userId: req.user!.id,
          name: accountName.trim(),
          type: 'checking',
          balance: 0,
          color: '#10b981',
          icon: '💳'
        });
        newAccountsToInsert.push(account);
        accountsMap.set(accKey, account);
      }

      // 2. Resolve toAccount if transfer
      let toAccount = null;
      if (type === 'transfer' && toAccountName) {
        const toAccKey = toAccountName.trim().toLowerCase();
        toAccount = accountsMap.get(toAccKey);
        
        if (!toAccount) {
          toAccount = new Account({
            userId: req.user!.id,
            name: toAccountName.trim(),
            type: 'checking',
            balance: 0,
            color: '#10b981',
            icon: '💳'
          });
          newAccountsToInsert.push(toAccount);
          accountsMap.set(toAccKey, toAccount);
        }
      }

      // 3. Resolve Category
      let category = null;
      if (type !== 'transfer') {
        const catKey = `${categoryName.trim().toLowerCase()}_${type}`;
        category = categoriesMap.get(catKey);

        if (!category) {
          category = new Category({
            userId: req.user!.id,
            name: categoryName.trim(),
            icon: '📁',
            color: '#10b981',
            type
          });
          newCategoriesToInsert.push(category);
          categoriesMap.set(catKey, category);
        }
      }

      // Prepare transaction
      transactionsToInsert.push({
        userId: req.user!.id,
        accountId: account._id,
        categoryId: category ? category._id : undefined,
        toAccountId: toAccount ? toAccount._id : undefined,
        type,
        amount,
        description: description || categoryName || 'Transaction CSV',
        date,
        isPending: false
      });

      // Update account balance in memory
      if (type === 'expense') {
        account.balance -= amount;
      } else if (type === 'income') {
        account.balance += amount;
      } else if (type === 'transfer') {
        account.balance -= amount;
        if (toAccount) {
          toAccount.balance += amount;
        }
      }
      importedCount++;
    }

      // Insert all new accounts in bulk
      if (newAccountsToInsert.length > 0) {
        await Account.insertMany(newAccountsToInsert, { session });
      }

      // Insert all new categories in bulk
      if (newCategoriesToInsert.length > 0) {
        await Category.insertMany(newCategoriesToInsert, { session });
      }

      // Insert all transactions in a single batch insert
      if (transactionsToInsert.length > 0) {
        await Transaction.insertMany(transactionsToInsert, { session });
      }

      // Save all modified existing accounts in the session
      const modifiedAccounts = Array.from(accountsMap.values()).filter(acc => {
        return !newAccountsToInsert.includes(acc) && (typeof acc.isModified === 'function' ? acc.isModified('balance') : true);
      });
      for (const acc of modifiedAccounts) {
        if (typeof acc.save === 'function') {
          await acc.save({ session });
        }
      }

      await session.commitTransaction();
      invalidateDashboardCache(req.user!.id);
    res.json({
      success: true,
      importedCount,
      failedCount,
      errors
    });
  } catch (error: unknown) {
    await session.abortTransaction();
    logger.error((error as Error).message);
    res.status(500).json({ message: (error as Error).message || 'Server Error during CSV import' });
  } finally {
    session.endSession();
  }
};

// @desc    Update a transaction
// @route   PUT /api/transactions/:id
// @access  Private
export const updateTransaction = async (req: AppRequest, res: AppResponse) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { accountId, categoryId, type, amount, description, date, note, toAccountId, savingsGoalId, tags } = req.body;
    const transaction = await Transaction.findById(req.params.id).session(session);

    if (!transaction) return res.status(404).json({ message: 'Transaction non trouvée' });

    // Validate write permission on old account
    const oldAccount = await Account.findById(transaction.accountId);
    const isOldAccountOwner = oldAccount && oldAccount.userId.toString() === req.user!.id;
    const isCreator = transaction.userId.toString() === req.user!.id;
    const hasWriteOld = await Share.exists({
      resourceType: 'account',
      resourceId: transaction.accountId,
      sharedWithId: req.user!.id,
      permission: 'write'
    });

    if (!isCreator && !isOldAccountOwner && !hasWriteOld) {
      return res.status(401).json({ message: 'Non autorisé à modifier cette transaction' });
    }

    // Validate write permission on new account if changing it
    if (accountId && accountId.toString() !== transaction.accountId.toString()) {
      const newAccount = await Account.findById(accountId);
      if (!newAccount) return res.status(404).json({ message: 'Nouveau compte non trouvé' });
      if (newAccount.userId.toString() !== req.user!.id) {
        const hasWriteNew = await Share.exists({
          resourceType: 'account',
          resourceId: accountId,
          sharedWithId: req.user!.id,
          permission: 'write'
        });
        if (!hasWriteNew) {
          return res.status(401).json({ message: 'Non autorisé à écrire sur le nouveau compte' });
        }
      }
    }

    // Validate destination account if transfer
    const isTransfer = type === 'transfer' || (transaction.type === 'transfer' && type !== 'expense' && type !== 'income');
    if (isTransfer) {
      const targetToAccountId = toAccountId || transaction.toAccountId;
      if (!targetToAccountId) {
        return res.status(400).json({ message: 'Le compte destinataire est requis.' });
      }
      if (!transaction.toAccountId || targetToAccountId.toString() !== transaction.toAccountId.toString()) {
        const newDestAccount = await Account.findById(targetToAccountId);
        if (!newDestAccount) return res.status(404).json({ message: 'Compte destinataire non trouvé' });
        if (newDestAccount.userId.toString() !== req.user!.id) {
          const hasWriteDest = await Share.exists({
            resourceType: 'account',
            resourceId: targetToAccountId,
            sharedWithId: req.user!.id,
            permission: 'write'
          });
          if (!hasWriteDest) {
            return res.status(401).json({ message: 'Non autorisé à écrire sur le compte destinataire' });
          }
        }
      }
    }

    // Store old transaction state before updates for comparison in alerts
    const oldTransactionCopy = {
      amount: transaction.amount,
      accountId: transaction.accountId,
      categoryId: transaction.categoryId,
      type: transaction.type,
      date: transaction.date
    };

    // 1. Revert OLD balance impact if the transaction is not pending
    if (!transaction.isPending) {
      if (transaction.type === 'transfer') {
        await Account.updateBalance(transaction.accountId, transaction.amount, 'income', session); // Revert expense
        if (transaction.toAccountId) {
          await Account.updateBalance(transaction.toAccountId, transaction.amount, 'expense', session); // Revert income
        }
        if (transaction.savingsGoalId) {
          await updateSavingsGoalProgress(transaction.savingsGoalId, transaction.amount, transaction.type, true, session, transaction);
        }
      } else {
        const revertType = transaction.type === 'expense' ? 'income' : 'expense';
        await Account.updateBalance(transaction.accountId, transaction.amount, revertType, session);
        if (transaction.savingsGoalId) {
          await updateSavingsGoalProgress(transaction.savingsGoalId, transaction.amount, transaction.type, true, session, transaction);
        }
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
    if (tags !== undefined) {
      transaction.tags = tags;
    }

    await transaction.save({ session });

    // 3. Apply NEW balance impact if the transaction is not pending
    if (!transaction.isPending) {
      if (transaction.type === 'transfer') {
        if (!transaction.toAccountId) throw new Error('Un compte destinataire est requis pour un transfert.');
        await Account.updateBalance(transaction.accountId, transaction.amount, 'expense', session);
        await Account.updateBalance(transaction.toAccountId, transaction.amount, 'income', session);
        if (transaction.savingsGoalId) {
          await updateSavingsGoalProgress(transaction.savingsGoalId, transaction.amount, transaction.type, false, session, transaction);
        }
      } else {
        await Account.updateBalance(transaction.accountId, transaction.amount, transaction.type, session);
        if (transaction.savingsGoalId) {
          await updateSavingsGoalProgress(transaction.savingsGoalId, transaction.amount, transaction.type, false, session, transaction);
        }
      }
    }

    await session.commitTransaction();

    // Trigger push notifications in background via EventBus
    eventBus.emit('transaction:updated', { userId: req.user!.id, transaction, amount, oldTransaction: oldTransactionCopy });

    // Invalidate monthly report cache for both old and new dates if changed
    invalidateMonthlyReport(req.user!.id, oldTransactionCopy.date).catch(err => logger.error('Cache invalidation error', { error: err }));
    if (date && new Date(date).getTime() !== new Date(oldTransactionCopy.date).getTime()) {
      invalidateMonthlyReport(req.user!.id, date).catch(err => logger.error('Cache invalidation error', { error: err }));
    }
    invalidateDashboardCache(req.user!.id);

    const populatedTx = await Transaction.findById(transaction._id)
      .populate('categoryId', 'name icon color type')
      .populate('accountId', 'name color icon')
      .populate('toAccountId', 'name color icon')
      .populate('savingsGoalId', 'name icon color')
      .populate('tags', 'name color');

    res.json(populatedTx);
  } catch (error: unknown) {
    await session.abortTransaction();
    logger.error((error as Error).message);
    res.status(500).json({ message: (error as Error).message || 'Server Error' });
  } finally {
    session.endSession();
  }
};
