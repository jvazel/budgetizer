import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import LoginAttemptModel from '../models/LoginAttempt';
import { logger } from '../utils/logger';

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 60 * 1000;

setInterval(async () => {
  if (mongoose.connection.readyState !== 1) return;
  try {
    await LoginAttemptModel.deleteMany({
      $or: [
        { attempts: 0 },
        { lockedUntil: { $lt: new Date() } },
      ],
    });
  } catch {
    // Silently ignore cleanup errors
  }
}, CLEANUP_INTERVAL_MS);

const getIdentifier = (req: Request): string => {
  const email = (req.body as { email?: string })?.email?.toLowerCase().trim();
  if (email) return `email:${email}`;
  return `ip:${req.ip || req.socket?.remoteAddress || req.connection?.remoteAddress || 'unknown'}`;
};

export const bruteForceProtection = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (mongoose.connection.readyState !== 1) {
    return next();
  }

  try {
    const identifier = getIdentifier(req);
    const ip = req.ip || req.socket?.remoteAddress || req.connection?.remoteAddress || 'unknown';

    let attempt;
    try {
      attempt = await LoginAttemptModel.findOne({ identifier, ip });
      if (!attempt) {
        attempt = await LoginAttemptModel.create({ identifier, ip, attempts: 0, lockedUntil: null });
      }
    } catch {
      // Silently ignore DB errors in brute force check
      return next();
    }

    if (attempt && attempt.lockedUntil && attempt.lockedUntil > new Date()) {
      const remainingMs = attempt.lockedUntil.getTime() - Date.now();
      const remainingMin = Math.ceil(remainingMs / 60000);
      res.status(429).json({
        message: `Trop de tentatives échouées. Réessayez dans ${remainingMin} minute(s).`,
        retryAfter: Math.ceil(remainingMs / 1000),
      });
      return;
    }

    next();
  } catch {
    next();
  }
};

export const recordFailedAttempt = async (req: Request): Promise<void> => {
  if (mongoose.connection.readyState !== 1) return;

  try {
    const identifier = getIdentifier(req);
    const ip = req.ip || req.socket?.remoteAddress || req.connection?.remoteAddress || 'unknown';

    const attempt = await LoginAttemptModel.findOne({ identifier, ip });

    if (attempt) {
      attempt.attempts += 1;
      attempt.lastAttemptAt = new Date();

      if (attempt.attempts >= MAX_ATTEMPTS) {
        attempt.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
      }

      await attempt.save();
    }
  } catch (error) {
    logger.error('[BruteForce] Error recording attempt', { error: (error as Error).message });
  }
};

export const recordSuccessfulAttempt = async (req: Request): Promise<void> => {
  if (mongoose.connection.readyState !== 1) return;

  try {
    const identifier = getIdentifier(req);
    const ip = req.ip || req.socket?.remoteAddress || req.connection?.remoteAddress || 'unknown';

    await LoginAttemptModel.deleteOne({ identifier, ip });
  } catch (error) {
    // Silently ignore
  }
};