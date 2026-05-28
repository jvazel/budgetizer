import SavingsGoal from '../models/SavingsGoal.js';
import Transaction from '../models/Transaction.js';
import { validationResult } from 'express-validator';

// @desc    Get all user savings goals
// @route   GET /api/savings-goals
// @access  Private
export const getSavingsGoals = async (req, res) => {
  try {
    const goals = await SavingsGoal.find({ userId: req.user.id }).sort({ targetDate: 1 });
    res.json(goals);
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server Error');
  }
};

// @desc    Create a new savings goal
// @route   POST /api/savings-goals
// @access  Private
export const createSavingsGoal = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { name, targetAmount, targetDate, icon, color } = req.body;

    const newGoal = new SavingsGoal({
      userId: req.user.id,
      name,
      targetAmount,
      targetDate,
      icon,
      color,
      currentAmount: 0 // Initialize at 0
    });

    const goal = await newGoal.save();
    res.status(201).json(goal);
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server Error');
  }
};

// @desc    Update a savings goal
// @route   PUT /api/savings-goals/:id
// @access  Private
export const updateSavingsGoal = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    let goal = await SavingsGoal.findById(req.params.id);

    if (!goal) return res.status(404).json({ message: 'Savings goal not found' });
    if (goal.userId.toString() !== req.user.id) return res.status(401).json({ message: 'Not authorized' });

    goal = await SavingsGoal.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );

    res.json(goal);
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server Error');
  }
};

// @desc    Delete a savings goal
// @route   DELETE /api/savings-goals/:id
// @access  Private
export const deleteSavingsGoal = async (req, res) => {
  try {
    const goal = await SavingsGoal.findById(req.params.id);

    if (!goal) return res.status(404).json({ message: 'Savings goal not found' });
    if (goal.userId.toString() !== req.user.id) return res.status(401).json({ message: 'Not authorized' });

    // Nullify savingsGoalId in related transactions
    await Transaction.updateMany(
      { savingsGoalId: req.params.id },
      { $set: { savingsGoalId: null } }
    );

    await SavingsGoal.findByIdAndDelete(req.params.id);
    res.json({ message: 'Savings goal removed and associated transactions unlinked.' });
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server Error');
  }
};
