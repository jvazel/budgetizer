import ScheduledTransaction from '../models/ScheduledTransaction';
import Transaction from '../models/Transaction';
import Account from '../models/Account';
import JobLock from '../models/JobLock';
import mongoose from 'mongoose';
import { calculateNextDate } from './dateHelper';
import { logger } from './logger';
import os from 'os';

const LOCK_NAME = 'scheduled_transactions_processor';
const HOSTNAME = os.hostname();

// Acquire exclusive lock for this processor.
// Returns true if lock was acquired, false if another instance holds it.
const acquireLock = async (): Promise<boolean> => {
  try {
    const result = await JobLock.findOneAndUpdate(
       { lockName: LOCK_NAME },
       {
         $set: { holderId: HOSTNAME, acquiredAt: new Date() }
       },
       { upsert: true, returnDocument: 'before', sort: { createdAt: -1 } }
     );

     // If result is null, the document was just created by us (upsert) — lock acquired.
     // If result exists and holderId matches us, we re-acquired a stale lock — OK.
     // If result exists with a different holder, another instance owns it.
    if (!result || result.holderId === HOSTNAME) {
      return true;
     }

    logger.info(`[JobLock] Lock "${LOCK_NAME}" held by "${result.holderId}", skipping.`);
    return false;
   } catch (err: unknown) {
    logger.error('[JobLock] Error acquiring lock', { error: (err as Error).message });
    return false;
   }
};

// Release the lock so another instance can take over.
const releaseLock = async (): Promise<void> => {
  try {
    await JobLock.deleteOne({ lockName: LOCK_NAME, holderId: HOSTNAME });
   } catch (err: unknown) {
    logger.error('[JobLock] Error releasing lock', { error: (err as Error).message });
   }
};

// Clean up stale locks on startup (locks older than the TTL window).
const cleanupStaleLocks = async (): Promise<void> => {
  try {
    const result = await JobLock.deleteMany({
      acquiredAt: { $lt: new Date(Date.now() - 30 * 60 * 1000) } // older than 30 min
     });

    if (result.deletedCount > 0) {
      logger.info(`[JobLock] Cleaned up ${result.deletedCount} stale lock(s).`);
     }
   } catch (err: unknown) {
    logger.error('[JobLock] Error cleaning stale locks', { error: (err as Error).message });
   }
};

export const processScheduledTransactions = async (): Promise<void> => {
   // Try to acquire exclusive lock across PM2 instances
  const locked = await acquireLock();
  if (!locked) {
    return; // Another instance is processing, skip this run.
   }

  let session;

  try {
    session = await mongoose.startSession();
    session.startTransaction();

    const now = new Date();

     // Find all active scheduled transactions whose nextDate has arrived or passed
    const activeSchedules = await ScheduledTransaction.find({
      isActive: true,
      nextDate: { $lte: now }
     }).session(session);

    for (const st of activeSchedules) {
       // Loop to process all missed occurrences up to 'now'
      while (st.isActive && st.nextDate <= now) {
         // Safeguard: Check if timesExecuted limit reached
        if (st.numberOfTimes > 0 && st.timesExecuted >= st.numberOfTimes) {
          st.isActive = false;
          break;
         }

         // Check if end date has passed
        if (st.endDate && st.nextDate > st.endDate) {
          st.isActive = false;
          break;
         }

         // Create the transaction (either pending or final)
        const txData: Record<string, unknown> = {
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
            await (Account as unknown as { updateBalance: (id: unknown, amount: number, type: string, session: unknown) => Promise<void> }).updateBalance(st.accountId, st.amount, 'expense', session);
            await (Account as unknown as { updateBalance: (id: unknown, amount: number, type: string, session: unknown) => Promise<void> }).updateBalance(st.toAccountId, st.amount, 'income', session);
           } else {
            await (Account as unknown as { updateBalance: (id: unknown, amount: number, type: string, session: unknown) => Promise<void> }).updateBalance(st.accountId, st.amount, st.type, session);
           }
         }

         // Update the scheduled transaction execution state
        st.timesExecuted += 1;

         // Calculate next occurrence date relative to the original startDate and new timesExecuted
        const nextDate = calculateNextDate(st.startDate, st.timesExecuted, st.frequency!.every, st.frequency!.unit);
        st.nextDate = nextDate;

         // Check if limit is now reached
        if (st.numberOfTimes > 0 && st.timesExecuted >= st.numberOfTimes) {
          st.isActive = false;
         }

         // Check if end date exceeded
        if (st.endDate && nextDate > st.endDate) {
          st.isActive = false;
         }
       }

      await (st as any).save({ session });
     }

    await session.commitTransaction();
    session.endSession();

    if (activeSchedules.length > 0) {
      logger.info(`[ScheduledProcessor] Processed ${activeSchedules.length} scheduled transactions successfully.`);
     }
   } catch (error: unknown) {
    logger.error('[ScheduledProcessor] Error processing scheduled transactions:', { error: (error as Error).message });
    if (session && session.hasEnded === false) {
      await session.abortTransaction();
      session.endSession();
     }
   } finally {
     // Always release the lock after processing completes or fails
    await releaseLock();
   }
};

export { cleanupStaleLocks };
