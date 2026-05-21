import Budget from '../models/Budget.js';
import Transaction from '../models/Transaction.js';
import mongoose from 'mongoose';
import { validationResult } from 'express-validator';

// @desc    Get user budgets with calculated spent and remaining
// @route   GET /api/budgets
// @access  Private
export const getBudgets = async (req, res) => {
  try {
    const { weekStart, month, year } = req.query;

    // 1. Weekly range (Monday to Sunday)
    let wStart, wEnd;
    if (weekStart) {
      const [y, m, d] = weekStart.split('-').map(Number);
      wStart = new Date(y, m - 1, d, 0, 0, 0, 0);
      wEnd = new Date(y, m - 1, d, 23, 59, 59, 999);
      wEnd.setDate(wEnd.getDate() + 6);
    } else {
      const now = new Date();
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      wStart = new Date(now.getFullYear(), now.getMonth(), diff, 0, 0, 0, 0);
      wEnd = new Date(wStart.getTime());
      wEnd.setDate(wEnd.getDate() + 6);
      wEnd.setHours(23, 59, 59, 999);
    }

    // 2. Monthly range (1st to last day)
    let mStart, mEnd;
    if (month) {
      const [y, m] = month.split('-').map(Number);
      mStart = new Date(y, m - 1, 1, 0, 0, 0, 0);
      mEnd = new Date(y, m, 0, 23, 59, 59, 999);
    } else {
      const now = new Date();
      mStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      mEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    // 3. Yearly range (Jan 1st to Dec 31st)
    let yStart, yEnd;
    if (year) {
      const y = Number(year);
      yStart = new Date(y, 0, 1, 0, 0, 0, 0);
      yEnd = new Date(y, 11, 31, 23, 59, 59, 999);
    } else {
      const now = new Date();
      yStart = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      yEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    }

    const budgets = await Budget.find({ userId: req.user.id })
      .populate('categoryId', 'name icon type');

    // Fetch expense transactions within any of the three calculated ranges
    const transactions = await Transaction.find({
      userId: req.user.id,
      type: 'expense',
      $or: [
        { date: { $gte: wStart, $lte: wEnd } },
        { date: { $gte: mStart, $lte: mEnd } },
        { date: { $gte: yStart, $lte: yEnd } }
      ]
    });

    const enrichedBudgets = budgets.map(budget => {
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

      const spent = transactions
        .filter(t => 
          t.categoryId && 
          budget.categoryId &&
          t.categoryId.toString() === budget.categoryId._id.toString() &&
          t.date >= start &&
          t.date <= end
        )
        .reduce((sum, t) => sum + t.amount, 0);

      const remaining = budget.amount - spent;
      const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;

      return {
        ...budget.toObject(),
        spent,
        remaining,
        percentage
      };
    });

    res.json(enrichedBudgets);
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server Error');
  }
};

// @desc    Create a new budget
// @route   POST /api/budgets
// @access  Private
export const createBudget = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const newBudget = new Budget({
      ...req.body,
      userId: req.user.id
    });

    const budget = await newBudget.save();
    
    // Populate to return immediately
    const populated = await Budget.findById(budget._id).populate('categoryId', 'name icon type');
    
    res.status(201).json({
      ...populated.toObject(),
      spent: 0,
      remaining: populated.amount,
      percentage: 0
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server Error');
  }
};

// @desc    Update a budget
// @route   PUT /api/budgets/:id
// @access  Private
export const updateBudget = async (req, res) => {
  try {
    let budget = await Budget.findById(req.params.id);

    if (!budget) return res.status(404).json({ message: 'Budget not found' });
    if (budget.userId.toString() !== req.user.id) return res.status(401).json({ message: 'Not authorized' });

    budget = await Budget.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    ).populate('categoryId', 'name icon type');

    res.json(budget); // Note: frontend might need to re-fetch to get correct spent amount if category changed
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server Error');
  }
};

// @desc    Delete a budget
// @route   DELETE /api/budgets/:id
// @access  Private
export const deleteBudget = async (req, res) => {
  try {
    const budget = await Budget.findById(req.params.id);

    if (!budget) return res.status(404).json({ message: 'Budget not found' });
    if (budget.userId.toString() !== req.user.id) return res.status(401).json({ message: 'Not authorized' });

    await Budget.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Budget removed' });
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server Error');
  }
};
