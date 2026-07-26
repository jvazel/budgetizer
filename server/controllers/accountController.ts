import Account from '../models/Account';
import Transaction from '../models/Transaction';
import ScheduledTransaction from '../models/ScheduledTransaction';
import { validationResult } from 'express-validator';
import { invalidateDashboardCache } from './dashboardController';
import Share from '../models/Share';
import { AppRequest, AppResponse } from '../types';
import { logger } from '../utils/logger';

// @desc    Get all accounts for a user
// @route   GET /api/accounts
// @access  Private
export const getAccounts = async (req: AppRequest, res: AppResponse) => {
  try {
    // Fetch shares shared with this user
    const shares = await Share.find({ sharedWithId: req.user!.id, resourceType: 'account' })
      .populate('ownerId', 'name email');
      
    const sharedAccountIds = shares.map(s => s.resourceId);
    
    // Fetch both owned and shared accounts in one query
    const accounts = await Account.find({
      $or: [
        { userId: req.user!.id },
        { _id: { $in: sharedAccountIds } }
      ]
    }).sort('order createdAt');
    
    const mappedAccounts = accounts.map(acc => {
      const isOwned = acc.userId.toString() === req.user!.id;
      if (isOwned) {
        return {
          ...(acc.toObject ? acc.toObject() : acc),
          isShared: false,
          permission: 'owner'
        };
      } else {
        const share = shares.find(s => s.resourceId.toString() === acc._id.toString());
        return {
          ...(acc.toObject ? acc.toObject() : acc),
          isShared: true,
          permission: share ? share.permission : 'read',
          ownerName: (share?.ownerId as { name?: string })?.name || 'Inconnu',
          ownerEmail: (share?.ownerId as { email?: string })?.email || ''
        };
      }
    });
    
    res.json(mappedAccounts);
  } catch (error: unknown) {
    logger.error((error as Error).message);
    res.status(500).send('Server Error');
  }
};

// @desc    Create a new account
// @route   POST /api/accounts
// @access  Private
export const createAccount = async (req: AppRequest, res: AppResponse) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { type, sourceAccountId, creditDetails } = req.body;
    const accountCount = await Account.countDocuments({ userId: req.user!.id });
    
    let balance = req.body.balance || 0;
    let computedDetails = null;

    if (type === 'credit') {
      if (!sourceAccountId) {
        return res.status(400).json({ message: 'Source account ID is required for credit accounts' });
      }
      if (!creditDetails || !creditDetails.initialAmount || creditDetails.interestRate === undefined || !creditDetails.durationMonths || !creditDetails.startDate) {
        return res.status(400).json({ message: 'Credit details are required and must be complete' });
      }

      const C = Number(creditDetails.initialAmount);
      const t = Number(creditDetails.interestRate) / 100;
      const n = Number(creditDetails.durationMonths);
      
      let monthlyPayment = 0;
      if (t === 0) {
        monthlyPayment = C / n;
      } else {
        const monthlyRate = t / 12;
        monthlyPayment = (C * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -n));
      }
      monthlyPayment = Number(monthlyPayment.toFixed(2));

      computedDetails = {
        initialAmount: C,
        interestRate: creditDetails.interestRate,
        durationMonths: n,
        startDate: new Date(creditDetails.startDate),
        monthlyPayment
      };
      
      balance = -C;
      req.body.includeInTotal = true; // Credit debt is real, must be true by default
    }

    const newAccount = new Account({
      ...req.body,
      balance,
      creditDetails: computedDetails,
      userId: req.user!.id,
      order: accountCount
    });

    const account = await newAccount.save();

    if (type === 'credit') {
      if (!computedDetails) throw new Error('Credit details computation failed');
      const scheduledTx = new ScheduledTransaction({
        userId: req.user!.id,
        accountId: sourceAccountId,
        toAccountId: account._id,
        type: 'transfer',
        amount: computedDetails.monthlyPayment,
        description: `Remboursement ${account.name}`,
        frequency: { every: 1, unit: 'month' },
        startDate: computedDetails.startDate,
        nextDate: computedDetails.startDate,
        autoConfirm: true,
        isSubscription: false,
        numberOfTimes: computedDetails.durationMonths,
        timesExecuted: 0,
        isActive: true
      });
      await scheduledTx.save();

      if (account.creditDetails) {
        account.creditDetails.scheduledTransactionId = scheduledTx._id;
        await account.save();
       }
     }

    invalidateDashboardCache(req.user!.id);
    res.status(201).json(account);
  } catch (error: unknown) {
    logger.error((error as Error).message);
    res.status(500).send('Server Error');
  }
};

// @desc    Update an account
// @route   PUT /api/accounts/:id
// @access  Private
export const updateAccount = async (req: AppRequest, res: AppResponse) => {
  try {
    let account = await Account.findById(req.params.id);

    if (!account) return res.status(404).json({ message: 'Account not found' });

    // Make sure user owns account
    if (account.userId.toString() !== req.user!.id) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    const { type, sourceAccountId, creditDetails } = req.body;
    const updateFields = { ...req.body };

    if (account.type === 'credit' || type === 'credit') {
      const details = creditDetails || account.creditDetails || {};
      const C = Number(details.initialAmount || 0);
      const t = Number(details.interestRate || 0) / 100;
      const n = Number(details.durationMonths || 0);

      let monthlyPayment = 0;
      if (t === 0) {
        monthlyPayment = C / n;
      } else {
        const monthlyRate = t / 12;
        monthlyPayment = (C * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -n));
      }
      monthlyPayment = Number(monthlyPayment.toFixed(2));

      updateFields.creditDetails = {
        ...(account.creditDetails as { toObject?: () => object })?.toObject?.(),
      
        initialAmount: C,
        interestRate: details.interestRate,
        durationMonths: n,
        startDate: details.startDate ? new Date(details.startDate) : account.creditDetails?.startDate,
        monthlyPayment
      };

      // Adjust balance if initialAmount changed
      if (account.creditDetails?.initialAmount != null && account.creditDetails.initialAmount !== C) {
        const diff = C - account.creditDetails.initialAmount;
        updateFields.balance = account.balance - diff;
      }

      // Update associated ScheduledTransaction
      const schedId = account.creditDetails?.scheduledTransactionId;
      if (schedId) {
        const scheduledTx = await ScheduledTransaction.findById(schedId);
        if (scheduledTx) {
          if (sourceAccountId) scheduledTx.accountId = sourceAccountId;
          scheduledTx.amount = monthlyPayment;
          scheduledTx.description = `Remboursement ${req.body.name || account.name}`;
          scheduledTx.numberOfTimes = n;
          if (details.startDate) {
            const newStartDate = new Date(details.startDate);
            if (scheduledTx.startDate.getTime() !== newStartDate.getTime()) {
              scheduledTx.startDate = newStartDate;
              if (scheduledTx.timesExecuted === 0) {
                scheduledTx.nextDate = newStartDate;
              }
            }
          }
          await scheduledTx.save();
        }
      }
    }

    account = await Account.findByIdAndUpdate(
      req.params.id,
      { $set: updateFields },
      { new: true }
    );

    invalidateDashboardCache(req.user!.id);
    res.json(account);
  } catch (error: unknown) {
    logger.error((error as Error).message);
    if ((error as { kind?: string }).kind === 'ObjectId') {
      return res.status(404).json({ message: 'Account not found' });
    }
    res.status(500).send('Server Error');
  }
};

// @desc    Delete an account
// @route   DELETE /api/accounts/:id
// @access  Private
export const deleteAccount = async (req: AppRequest, res: AppResponse) => {
  try {
    const account = await Account.findById(req.params.id);

    if (!account) return res.status(404).json({ message: 'Account not found' });

    // Make sure user owns account
    if (account.userId.toString() !== req.user!.id) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    await Account.findByIdAndDelete(req.params.id);
    
    // Delete associated transactions (including transfers)
    await Transaction.deleteMany({
      $or: [
        { accountId: req.params.id },
        { toAccountId: req.params.id }
      ]
    });

    // Delete associated scheduled transactions
    await ScheduledTransaction.deleteMany({
      $or: [
        { accountId: req.params.id },
        { toAccountId: req.params.id }
      ]
    });

    invalidateDashboardCache(req.user!.id);
    res.json({ message: 'Account removed' });
  } catch (error: unknown) {
    logger.error((error as Error).message);
    if ((error as { kind?: string }).kind === 'ObjectId') {
      return res.status(404).json({ message: 'Account not found' });
    }
    res.status(500).send('Server Error');
  }
};

// @desc    Reorder accounts
// @route   PATCH /api/accounts/reorder
// @access  Private
export const reorderAccounts = async (req: AppRequest, res: AppResponse) => {
  try {
    const { orderedIds } = req.body; // Array of account IDs in new order

    if (!orderedIds || !Array.isArray(orderedIds)) {
      return res.status(400).json({ message: 'Invalid payload' });
    }

    const updates = orderedIds.map((id, index) => {
      return Account.updateOne(
        { _id: id, userId: req.user!.id },
        { $set: { order: index } }
      );
    });

    await Promise.all(updates);

    invalidateDashboardCache(req.user!.id);
    res.json({ message: 'Accounts reordered successfully' });
  } catch (error: unknown) {
    logger.error((error as Error).message);
    res.status(500).send('Server Error');
  }
};

// @desc    Get credit account summary and amortization schedule
// @route   GET /api/accounts/:id/credit-summary
// @access  Private
export const getCreditSummary = async (req: AppRequest, res: AppResponse) => {
  try {
    const account = await Account.findById(req.params.id);
    if (!account) return res.status(404).json({ message: 'Account not found' });
    if (account.userId.toString() !== req.user!.id) {
      const isShared = await Share.exists({
        resourceType: 'account',
        resourceId: req.params.id,
        sharedWithId: req.user!.id
      });
      if (!isShared) {
        return res.status(401).json({ message: 'Not authorized' });
      }
    }
    if (account.type !== 'credit') {
      return res.status(400).json({ message: 'Account is not a credit account' });
    }
 
    const details = (account.creditDetails || {}) as { initialAmount?: number | null; interestRate?: number | null; durationMonths?: number | null; monthlyPayment?: number | null; scheduledTransactionId?: unknown; startDate?: Date | null };
    const initialAmount = details.initialAmount || 0;
    const interestRate = details.interestRate || 0;
    const durationMonths = details.durationMonths || 0;
    const monthlyPayment = details.monthlyPayment || 0;
 
    // Fetch past payments (transfers into this account)
    const payments = await Transaction.find({
      toAccountId: account._id,
      isPending: { $ne: true }
    }).sort({ date: 1 }).lean();
 
    // Chronological amortization calculation
    let currentOutstanding = initialAmount;
    let totalInterestPaid = 0;
    const paymentsHistory = [];
 
    for (const pay of payments) {
      const interestPart = interestRate > 0 ? (currentOutstanding * (interestRate / 100 / 12)) : 0;
      const principalPart = pay.amount - interestPart;
      currentOutstanding -= principalPart;
      totalInterestPaid += interestPart;
 
      paymentsHistory.push({
        transactionId: pay._id,
        date: pay.date,
        amount: pay.amount,
        principalPart: Number(principalPart.toFixed(2)),
        interestPart: Number(interestPart.toFixed(2)),
        balanceAfter: Number((-currentOutstanding).toFixed(2))
      });
    }
 
    // Sort descending for display (newest first)
    paymentsHistory.reverse();
 
    // Get next payment details from the scheduled transaction
    let nextPaymentDate = null;
    let nextPaymentAmount = monthlyPayment;
    let monthsRemaining = Math.max(0, durationMonths - payments.length);
 
    if (details.scheduledTransactionId) {
      const scheduledTx = await ScheduledTransaction.findById(details.scheduledTransactionId);
      if (scheduledTx && scheduledTx.isActive) {
        nextPaymentDate = scheduledTx.nextDate;
        nextPaymentAmount = scheduledTx.amount;
        if (scheduledTx.numberOfTimes > 0) {
          monthsRemaining = Math.max(0, scheduledTx.numberOfTimes - scheduledTx.timesExecuted);
        }
      }
    }
 
    const currentBalance = account.balance;
    const capitalRemaining = Math.abs(currentBalance);
    const capitalPaid = Math.max(0, initialAmount - capitalRemaining);
    const progressPercentage = initialAmount > 0 ? Number(((capitalPaid / initialAmount) * 100).toFixed(2)) : 0;
    const totalInterestEstimated = Number(((monthlyPayment * durationMonths) - initialAmount).toFixed(2));
 
    const isOwner = account.userId.toString() === req.user!.id;
    let permission = 'owner';
    if (!isOwner) {
      const share = await Share.findOne({
        resourceType: 'account',
        resourceId: req.params.id,
        sharedWithId: req.user!.id
      });
      permission = share ? share.permission : 'read';
    }

    res.json({
      accountId: account._id,
      accountName: account.name,
      initialAmount,
      currentBalance,
      capitalPaid: Number(capitalPaid.toFixed(2)),
      capitalRemaining: Number(capitalRemaining.toFixed(2)),
      interestRate,
      monthlyPayment,
      nextPaymentDate,
      nextPaymentAmount,
      progressPercentage,
      monthsRemaining,
      totalInterestPaid: Number(totalInterestPaid.toFixed(2)),
      totalInterestEstimated,
      paymentsHistory,
      isShared: !isOwner,
      permission
    });
  } catch (error: unknown) {
    logger.error((error as Error).message);
    res.status(500).send('Server Error');
  }
};
