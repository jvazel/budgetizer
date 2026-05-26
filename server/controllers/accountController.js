import Account from '../models/Account.js';
import Transaction from '../models/Transaction.js';
import ScheduledTransaction from '../models/ScheduledTransaction.js';
import { validationResult } from 'express-validator';

// @desc    Get all accounts for a user
// @route   GET /api/accounts
// @access  Private
export const getAccounts = async (req, res) => {
  try {
    const accounts = await Account.find({ userId: req.user.id }).sort('order createdAt');
    res.json(accounts);
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server Error');
  }
};

// @desc    Create a new account
// @route   POST /api/accounts
// @access  Private
export const createAccount = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const accountCount = await Account.countDocuments({ userId: req.user.id });
    
    const newAccount = new Account({
      ...req.body,
      userId: req.user.id,
      order: accountCount // Put it at the end by default
    });

    const account = await newAccount.save();
    res.status(201).json(account);
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server Error');
  }
};

// @desc    Update an account
// @route   PUT /api/accounts/:id
// @access  Private
export const updateAccount = async (req, res) => {
  try {
    let account = await Account.findById(req.params.id);

    if (!account) return res.status(404).json({ message: 'Account not found' });

    // Make sure user owns account
    if (account.userId.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    account = await Account.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );

    res.json(account);
  } catch (error) {
    console.error(error.message);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Account not found' });
    }
    res.status(500).send('Server Error');
  }
};

// @desc    Delete an account
// @route   DELETE /api/accounts/:id
// @access  Private
export const deleteAccount = async (req, res) => {
  try {
    const account = await Account.findById(req.params.id);

    if (!account) return res.status(404).json({ message: 'Account not found' });

    // Make sure user owns account
    if (account.userId.toString() !== req.user.id) {
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

    res.json({ message: 'Account removed' });
  } catch (error) {
    console.error(error.message);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Account not found' });
    }
    res.status(500).send('Server Error');
  }
};

// @desc    Reorder accounts
// @route   PATCH /api/accounts/reorder
// @access  Private
export const reorderAccounts = async (req, res) => {
  try {
    const { orderedIds } = req.body; // Array of account IDs in new order

    if (!orderedIds || !Array.isArray(orderedIds)) {
      return res.status(400).json({ message: 'Invalid payload' });
    }

    const updates = orderedIds.map((id, index) => {
      return Account.updateOne(
        { _id: id, userId: req.user.id },
        { $set: { order: index } }
      );
    });

    await Promise.all(updates);

    res.json({ message: 'Accounts reordered successfully' });
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server Error');
  }
};
