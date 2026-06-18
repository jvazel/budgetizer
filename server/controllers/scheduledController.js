import ScheduledTransaction from '../models/ScheduledTransaction.js';
import Transaction from '../models/Transaction.js';
import Account from '../models/Account.js';
import mongoose from 'mongoose';
import { calculateNextDate } from '../utils/dateHelper.js';
import { invalidateDashboardCache } from './dashboardController.js';

const updateAccountBalance = async (accountId, amount, type, session) => {
  const numericAmount = Number(amount);
  if (isNaN(numericAmount)) throw new Error('Invalid amount');
  const delta = type === 'expense' ? -numericAmount : numericAmount;
  const account = await Account.findOneAndUpdate(
    { _id: accountId },
    { $inc: { balance: delta } },
    { session, new: true }
  );
  if (!account) throw new Error('Account not found');
};

// 1. Get all active scheduled transactions
export const getScheduledTransactions = async (req, res) => {
  try {
    const list = await ScheduledTransaction.find({ 
      userId: req.user.id,
      isActive: true 
    })
    .populate('categoryId', 'name icon color type')
    .populate('accountId', 'name color icon')
    .populate('toAccountId', 'name color icon type')
    .sort({ nextDate: 1 });

    res.json(list);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// 2. Get pending transactions awaiting confirmation
export const getPendingTransactions = async (req, res) => {
  try {
    const list = await Transaction.find({
      userId: req.user.id,
      isPending: true
    })
    .populate('categoryId', 'name icon color type')
    .populate('accountId', 'name color icon')
    .sort({ date: 1 });

    res.json(list);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// 3. Create a new scheduled transaction
export const createScheduledTransaction = async (req, res) => {
  try {
    const { 
      accountId, 
      categoryId, 
      type, 
      amount, 
      description, 
      note, 
      frequency, 
      startDate, 
      numberOfTimes, 
      endDate, 
      autoConfirm, 
      isSubscription,
      toAccountId
    } = req.body;

    const st = new ScheduledTransaction({
      userId: req.user.id,
      accountId,
      categoryId,
      type,
      amount,
      description,
      note,
      frequency,
      startDate: new Date(startDate),
      nextDate: new Date(startDate), // Next execution is initially the start date
      numberOfTimes: numberOfTimes || 0,
      endDate: endDate ? new Date(endDate) : null,
      autoConfirm: autoConfirm !== undefined ? autoConfirm : true,
      isSubscription: isSubscription !== undefined ? isSubscription : false,
      toAccountId
    });

    await st.save();
    
    const populated = await ScheduledTransaction.findById(st._id)
      .populate('categoryId', 'name icon color type')
      .populate('accountId', 'name color icon')
      .populate('toAccountId', 'name color icon type');

    invalidateDashboardCache(req.user.id);
    res.status(201).json(populated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// 4. Update scheduled transaction
export const updateScheduledTransaction = async (req, res) => {
  try {
    const { 
      accountId, 
      categoryId, 
      type, 
      amount, 
      description, 
      note, 
      frequency, 
      startDate, 
      numberOfTimes, 
      endDate, 
      autoConfirm, 
      isSubscription,
      toAccountId
    } = req.body;

    const st = await ScheduledTransaction.findOne({ _id: req.params.id, userId: req.user.id });
    if (!st) return res.status(404).json({ message: 'Scheduled transaction not found' });

    st.accountId = accountId || st.accountId;
    st.categoryId = categoryId || st.categoryId;
    st.type = type || st.type;
    st.amount = amount !== undefined ? amount : st.amount;
    st.description = description || st.description;
    st.note = note !== undefined ? note : st.note;
    st.frequency = frequency || st.frequency;
    st.numberOfTimes = numberOfTimes !== undefined ? numberOfTimes : st.numberOfTimes;
    st.endDate = endDate !== undefined ? (endDate ? new Date(endDate) : null) : st.endDate;
    st.autoConfirm = autoConfirm !== undefined ? autoConfirm : st.autoConfirm;
    st.isSubscription = isSubscription !== undefined ? isSubscription : st.isSubscription;
    st.toAccountId = toAccountId !== undefined ? toAccountId : st.toAccountId;

    // Recalculate nextDate if startDate changes
    if (startDate) {
      st.startDate = new Date(startDate);
      st.nextDate = new Date(startDate);
    }

    await st.save();
    
    const populated = await ScheduledTransaction.findById(st._id)
      .populate('categoryId', 'name icon color type')
      .populate('accountId', 'name color icon')
      .populate('toAccountId', 'name color icon type');

    invalidateDashboardCache(req.user.id);
    res.json(populated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// 5. Delete scheduled transaction
export const deleteScheduledTransaction = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const st = await ScheduledTransaction.findOne({ _id: req.params.id, userId: req.user.id });
    if (!st) return res.status(404).json({ message: 'Scheduled transaction not found' });

    // 1. Delete all non-confirmed pending transactions related to this
    await Transaction.deleteMany({
      scheduledTransactionId: st._id,
      isPending: true
    }).session(session);

    // 2. Delete the schedule
    await ScheduledTransaction.findByIdAndDelete(st._id).session(session);

    await session.commitTransaction();
    invalidateDashboardCache(req.user.id);
    res.json({ message: 'Scheduled transaction and upcoming occurrences removed successfully' });
  } catch (error) {
    await session.abortTransaction();
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  } finally {
    session.endSession();
  }
};

// 6. Confirm a pending transaction
export const confirmPendingTransaction = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { amount } = req.body; // Can optionally modify the amount before confirming
    const tx = await Transaction.findOne({ _id: req.params.id, userId: req.user.id, isPending: true });
    
    if (!tx) return res.status(404).json({ message: 'Pending transaction not found' });

    if (amount !== undefined) tx.amount = amount;
    tx.isPending = false;
    
    await tx.save({ session });

    // Update bank balances
    if (tx.type === 'transfer') {
      if (!tx.toAccountId) throw new Error('toAccountId is required for transfer');
      await updateAccountBalance(tx.accountId, tx.amount, 'expense', session);
      await updateAccountBalance(tx.toAccountId, tx.amount, 'income', session);
    } else {
      await updateAccountBalance(tx.accountId, tx.amount, tx.type, session);
    }

    await session.commitTransaction();
    invalidateDashboardCache(req.user.id);
    res.json({ message: 'Transaction confirmed successfully', transaction: tx });
  } catch (error) {
    await session.abortTransaction();
    console.error(error);
    res.status(500).json({ message: error.message || 'Server Error' });
  } finally {
    session.endSession();
  }
};

// 7. Skip a pending transaction
export const skipPendingTransaction = async (req, res) => {
  try {
    const tx = await Transaction.findOne({ _id: req.params.id, userId: req.user.id, isPending: true });
    if (!tx) return res.status(404).json({ message: 'Pending transaction not found' });

    // Just delete the pending transaction. NextDate is already advanced by scheduledProcessor
    await Transaction.findByIdAndDelete(tx._id);
    invalidateDashboardCache(req.user.id);
    res.json({ message: 'Occurrence skipped successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// 8. Upcoming transactions for the next N days
export const getUpcomingTransactions = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const now = new Date();
    const futureLimit = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + days, 23, 59, 59, 999));

    const scheduledTxs = await ScheduledTransaction.find({
      userId: req.user.id,
      isActive: true,
      nextDate: { $lte: futureLimit }
    }).populate('categoryId', 'name icon color type').populate('accountId', 'name color icon');

    const upcoming = [];

    scheduledTxs.forEach(st => {
      let curr = new Date(st.nextDate);
      let timesLeft = st.numberOfTimes > 0 ? (st.numberOfTimes - st.timesExecuted) : Infinity;
      let tempTimesExecuted = st.timesExecuted;

      while (curr <= futureLimit && timesLeft > 0) {
        if (st.endDate && curr > st.endDate) break;

        upcoming.push({
          _id: `upcoming-${st._id}-${curr.getTime()}`,
          scheduledTransactionId: st._id,
          description: st.description,
          note: st.note,
          type: st.type,
          amount: st.amount,
          date: new Date(curr),
          frequency: st.frequency,
          categoryId: st.categoryId,
          accountId: st.accountId,
          isSubscription: st.isSubscription,
          autoConfirm: st.autoConfirm
        });

        // Move to next date deterministically using calculateNextDate
        tempTimesExecuted++;
        curr = calculateNextDate(st.startDate, tempTimesExecuted, st.frequency.every, st.frequency.unit);

        timesLeft--;
      }
    });

    // Sort by date ascending
    upcoming.sort((a, b) => a.date - b.date);

    res.json(upcoming);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};
