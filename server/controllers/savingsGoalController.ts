import SavingsGoal from '../models/SavingsGoal';
import Transaction from '../models/Transaction';
import { validationResult } from 'express-validator';
import { invalidateDashboardCache } from './dashboardController';
import { AppRequest, AppResponse } from '../types';
import { logger } from '../utils/logger';

// @desc    Get all user savings goals
// @route   GET /api/savings-goals
// @access  Private
export const getSavingsGoals = async (req: AppRequest, res: AppResponse) => {
  try {
    const goals = await SavingsGoal.find({ userId: req.user!.id })
      .populate('accountId', 'name type balance color icon')
      .sort({ targetDate: 1 });
    res.json(goals);
  } catch (error: unknown) {
    logger.error((error as Error).message);
    res.status(500).send('Server Error');
  }
};

// @desc    Create a new savings goal
// @route   POST /api/savings-goals
// @access  Private
export const createSavingsGoal = async (req: AppRequest, res: AppResponse) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { name, targetAmount, targetDate, icon, color, accountId } = req.body;

    const newGoal = new SavingsGoal({
      userId: req.user!.id,
      name,
      targetAmount,
      targetDate,
      icon,
      color,
      accountId: accountId || null,
      currentAmount: 0 // Initialize at 0
    });

    const goal = await newGoal.save();
    const populatedGoal = await SavingsGoal.findById(goal._id).populate('accountId', 'name type balance color icon');
    invalidateDashboardCache(req.user!.id);
    res.status(201).json(populatedGoal);
  } catch (error: unknown) {
    logger.error((error as Error).message);
    res.status(500).send('Server Error');
  }
};

// @desc    Update a savings goal
// @route   PUT /api/savings-goals/:id
// @access  Private
export const updateSavingsGoal = async (req: AppRequest, res: AppResponse) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    let goal = await SavingsGoal.findById(req.params.id);

    if (!goal) return res.status(404).json({ message: 'Savings goal not found' });
    if (goal.userId.toString() !== req.user!.id) return res.status(401).json({ message: 'Not authorized' });

    goal = await SavingsGoal.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    ).populate('accountId', 'name type balance color icon');

    invalidateDashboardCache(req.user!.id);
    res.json(goal);
  } catch (error: unknown) {
    logger.error((error as Error).message);
    res.status(500).send('Server Error');
  }
};

// @desc    Delete a savings goal
// @route   DELETE /api/savings-goals/:id
// @access  Private
export const deleteSavingsGoal = async (req: AppRequest, res: AppResponse) => {
  try {
    const goal = await SavingsGoal.findById(req.params.id);

    if (!goal) return res.status(404).json({ message: 'Savings goal not found' });
    if (goal.userId.toString() !== req.user!.id) return res.status(401).json({ message: 'Not authorized' });

    // Nullify savingsGoalId in related transactions
    await Transaction.updateMany(
      { savingsGoalId: req.params.id },
      { $set: { savingsGoalId: null } }
    );

    await SavingsGoal.findByIdAndDelete(req.params.id);
    invalidateDashboardCache(req.user!.id);
    res.json({ message: 'Savings goal removed and associated transactions unlinked.' });
  } catch (error: unknown) {
    logger.error((error as Error).message);
    res.status(500).send('Server Error');
  }
};
