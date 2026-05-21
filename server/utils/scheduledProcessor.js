import ScheduledTransaction from '../models/ScheduledTransaction.js';
import Transaction from '../models/Transaction.js';
import Account from '../models/Account.js';
import mongoose from 'mongoose';

const calculateNextDate = (currentDate, every, unit) => {
  const next = new Date(currentDate);
  if (unit === 'day') next.setDate(next.getDate() + every);
  else if (unit === 'week') next.setDate(next.getDate() + every * 7);
  else if (unit === 'month') next.setMonth(next.getMonth() + every);
  else if (unit === 'year') next.setFullYear(next.getFullYear() + every);
  return next;
};

const updateAccountBalance = async (accountId, amount, type, session) => {
  const account = await Account.findById(accountId).session(session);
  if (!account) throw new Error(`Account ${accountId} not found`);
  
  if (type === 'expense') {
    account.balance -= amount;
  } else if (type === 'income') {
    account.balance += amount;
  }
  await account.save({ session });
};

export const processScheduledTransactions = async () => {
  const now = new Date();
  const session = await mongoose.startSession();
  
  try {
    session.startTransaction();
    
    // Find all active scheduled transactions whose nextDate has arrived or passed
    const activeSchedules = await ScheduledTransaction.find({
      isActive: true,
      nextDate: { $lte: now }
    }).session(session);

    for (const st of activeSchedules) {
      // Safeguard: Check if timesExecuted limit reached
      if (st.numberOfTimes > 0 && st.timesExecuted >= st.numberOfTimes) {
        st.isActive = false;
        await st.save({ session });
        continue;
      }

      // Check if end date has passed
      if (st.endDate && st.nextDate > st.endDate) {
        st.isActive = false;
        await st.save({ session });
        continue;
      }

      // Create the transaction (either pending or final)
      const txData = {
        userId: st.userId,
        accountId: st.accountId,
        categoryId: st.categoryId,
        type: st.type,
        amount: st.amount,
        description: st.description,
        note: st.note,
        date: new Date(st.nextDate), // Set date to when it was scheduled
        isScheduled: true,
        scheduledTransactionId: st._id,
        isPending: !st.autoConfirm, // If autoConfirm is false, it's pending
        toAccountId: st.toAccountId
      };

      const newTx = new Transaction(txData);
      await newTx.save({ session });

      // If auto-confirmed, update the bank account balances immediately
      if (st.autoConfirm) {
        if (st.type === 'transfer') {
          if (!st.toAccountId) throw new Error('toAccountId is required for transfers');
          await updateAccountBalance(st.accountId, st.amount, 'expense', session);
          await updateAccountBalance(st.toAccountId, st.amount, 'income', session);
        } else {
          await updateAccountBalance(st.accountId, st.amount, st.type, session);
        }
      }

      // Update the scheduled transaction execution state
      st.timesExecuted += 1;
      
      // Calculate next occurrence date
      const nextDate = calculateNextDate(st.nextDate, st.frequency.every, st.frequency.unit);
      st.nextDate = nextDate;

      // Check if limit is now reached
      if (st.numberOfTimes > 0 && st.timesExecuted >= st.numberOfTimes) {
        st.isActive = false;
      }
      
      // Check if end date exceeded
      if (st.endDate && nextDate > st.endDate) {
        st.isActive = false;
      }

      await st.save({ session });
    }

    await session.commitTransaction();
    if (activeSchedules.length > 0) {
      console.log(`[ScheduledProcessor] Processed ${activeSchedules.length} scheduled transactions successfully.`);
      // Emit generic global change event so UI refreshes if tab is open
      // Since this runs in node environment, we don't have window object, which is normal.
    }
  } catch (error) {
    await session.abortTransaction();
    console.error('[ScheduledProcessor] Error processing scheduled transactions:', error);
  } finally {
    session.endSession();
  }
};
