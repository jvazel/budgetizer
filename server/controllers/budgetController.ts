import Budget from '../models/Budget';
import Transaction from '../models/Transaction';
import Account from '../models/Account';
import { validationResult } from 'express-validator';
import { AppRequest, AppResponse } from '../types';
import { invalidateDashboardCache } from './dashboardController';
import Share from '../models/Share';
import { logger } from '../utils/logger';

// @desc    Get user budgets with calculated spent and remaining
// @route   GET /api/budgets
// @access  Private
export const getBudgets = async (req: AppRequest, res: AppResponse) => {
  try {
    const { weekStart, month, year } = req.query;

    // 1. Weekly range (Monday to Sunday) (UTC)
    let wStart, wEnd;
    if (weekStart) {
      const [y, m, d] = String(weekStart).split('-').map(Number);
      wStart = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
      wEnd = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));
      wEnd.setUTCDate(wEnd.getUTCDate() + 6);
    } else {
      const now = new Date();
      const day = now.getUTCDay();
      const diff = now.getUTCDate() - day + (day === 0 ? -6 : 1);
      wStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), diff, 0, 0, 0, 0));
      wEnd = new Date(wStart.getTime());
      wEnd.setUTCDate(wEnd.getUTCDate() + 6);
      wEnd.setUTCHours(23, 59, 59, 999);
    }

    // 2. Monthly range (1st to last day) (UTC)
    let mStart, mEnd;
    if (month) {
      const [y, m] = String(month).split('-').map(Number);
      mStart = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
      mEnd = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
    } else {
      const now = new Date();
      mStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
      mEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));
    }

    // 3. Yearly range (Jan 1st to Dec 31st) (UTC)
    let yStart, yEnd;
    if (year) {
      const y = Number(year);
      yStart = new Date(Date.UTC(y, 0, 1, 0, 0, 0, 0));
      yEnd = new Date(Date.UTC(y, 11, 31, 23, 59, 59, 999));
    } else {
      const now = new Date();
      yStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1, 0, 0, 0, 0));
      yEnd = new Date(Date.UTC(now.getUTCFullYear(), 11, 31, 23, 59, 59, 999));
    }

    // Fetch owned budgets
    const ownedBudgets = await Budget.find({ userId: req.user!.id })
      .populate('categoryId', 'name icon type');

    // Fetch shared budgets
    const shares = await Share.find({ sharedWithId: req.user!.id, resourceType: 'budget' })
      .populate('ownerId', 'name email');
    const sharedBudgetIds = shares.map(s => s.resourceId);
    const sharedBudgets = await Budget.find({ _id: { $in: sharedBudgetIds } })
      .populate('categoryId', 'name icon type');

    const mappedOwned = ownedBudgets.map(b => ({
      ...(b.toObject ? b.toObject() : b),
      isShared: false,
      permission: 'owner'
    }));

    const mappedShared = sharedBudgets.map(b => {
      const share = shares.find(s => s.resourceId.toString() === b._id.toString());
      return {
        ...(b.toObject ? b.toObject() : b),
        isShared: true,
        permission: share ? share.permission : 'read',
        ownerName: (share?.ownerId as { name?: string })?.name || 'Inconnu',
        ownerEmail: (share?.ownerId as { email?: string })?.email || ''
      };
    });

    const allBudgets = [...mappedOwned, ...mappedShared];

    // Collect all unique user/owner IDs to find accounts for spent calculations
    const uniqueOwnerIds = Array.from(new Set(allBudgets.map(b => b.userId.toString())));

    // Map each owner to their included account IDs
    const ownerAccountsMap: Record<string, string[]> = {};
    for (const ownerId of uniqueOwnerIds) {
      const includedAccounts = await Account.find({ userId: ownerId, includeInTotal: { $ne: false } }).select('_id');
      ownerAccountsMap[ownerId] = includedAccounts.map(acc => acc._id.toString());
    }

    // Collect all included account IDs across all owners
    const allIncludedAccountIds = Object.values(ownerAccountsMap).flat();

    // Fetch expense transactions within any of the ranges (for all included accounts)
    const transactions = await Transaction.find({
      type: 'expense',
      accountId: { $in: allIncludedAccountIds },
      isPending: { $ne: true },
      $or: [
        { date: { $gte: wStart, $lte: wEnd } },
        { date: { $gte: mStart, $lte: mEnd } },
        { date: { $gte: yStart, $lte: yEnd } }
      ]
    });

    const enrichedBudgets = allBudgets.map(budget => {
      const period = budget.period || 'monthly';
      let start, end;
      if (period === 'weekly') {
        start = wStart;
        end = wEnd;
      } else if (period === 'yearly') {
        start = yStart;
        end = yEnd;
      } else {
        start = mStart;
        end = mEnd;
      }

      const budgetOwnerId = budget.userId.toString();
      const budgetOwnerAccountIds = ownerAccountsMap[budgetOwnerId] || [];

      const spent = transactions
        .filter(t => 
          t.categoryId && 
          budget.categoryId &&
          t.categoryId.toString() === budget.categoryId._id.toString() &&
          budgetOwnerAccountIds.includes(t.accountId.toString()) &&
          t.date >= start &&
          t.date <= end
        )
        .reduce((sum, t) => sum + t.amount, 0);

      const remaining = budget.amount - spent;
      const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;

      return {
        ...budget,
        spent,
        remaining,
        percentage
      };
    });

    res.json(enrichedBudgets);
  } catch (error: unknown) {
    logger.error((error as Error).message);
    res.status(500).send('Server Error');
  }
};

// @desc    Create a new budget
// @route   POST /api/budgets
// @access  Private
export const createBudget = async (req: AppRequest, res: AppResponse) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const newBudget = new Budget({
      ...req.body,
      userId: req.user!.id
    });

    const budget = await newBudget.save();
    
    // Populate to return immediately
    const populated = await Budget.findById(budget._id).populate('categoryId', 'name icon type');
    if (!populated) return res.status(404).json({ message: 'Budget not found' });
    invalidateDashboardCache(req.user!.id);
    res.status(201).json({
      ...populated.toObject(),
      spent: 0,
      remaining: populated.amount,
      percentage: 0
    });
  } catch (error: unknown) {
    logger.error((error as Error).message);
    res.status(500).send('Server Error');
  }
};

// @desc    Update a budget
// @route   PUT /api/budgets/:id
// @access  Private
export const updateBudget = async (req: AppRequest, res: AppResponse) => {
  try {
    let budget = await Budget.findById(req.params.id);

    if (!budget) return res.status(404).json({ message: 'Budget not found' });
    if (budget.userId.toString() !== req.user!.id) {
      const hasWrite = await Share.exists({
        resourceType: 'budget',
        resourceId: req.params.id,
        sharedWithId: req.user!.id,
        permission: 'write'
      });
      if (!hasWrite) {
        return res.status(401).json({ message: 'Not authorized' });
      }
    }

    budget = await Budget.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    ).populate('categoryId', 'name icon type');

    invalidateDashboardCache(req.user!.id);
    res.json(budget); // Note: frontend might need to re-fetch to get correct spent amount if category changed
  } catch (error: unknown) {
    logger.error((error as Error).message);
    res.status(500).send('Server Error');
  }
};

// @desc    Delete a budget
// @route   DELETE /api/budgets/:id
// @access  Private
export const deleteBudget = async (req: AppRequest, res: AppResponse) => {
  try {
    const budget = await Budget.findById(req.params.id);

    if (!budget) return res.status(404).json({ message: 'Budget not found' });
    if (budget.userId.toString() !== req.user!.id) return res.status(401).json({ message: 'Not authorized' });

    await Budget.findByIdAndDelete(req.params.id);
    
    invalidateDashboardCache(req.user!.id);
    res.json({ message: 'Budget removed' });
  } catch (error: unknown) {
    logger.error((error as Error).message);
    res.status(500).send('Server Error');
  }
};
