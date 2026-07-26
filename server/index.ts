import http from 'http';
import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import morgan from 'morgan';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import cookieParser from 'cookie-parser';

import { logger } from './utils/logger';
import authRoutes from './routes/authRoutes';
import accountRoutes from './routes/accountRoutes';
import categoryRoutes from './routes/categoryRoutes';
import transactionRoutes from './routes/transactionRoutes';
import budgetRoutes from './routes/budgetRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import scheduledRoutes from './routes/scheduledRoutes';
import chartRoutes from './routes/chartRoutes';
import userRoutes from './routes/userRoutes';
import savedFilterRoutes from './routes/savedFilterRoutes';
import insightRoutes from './routes/insightRoutes';
import savingsGoalRoutes from './routes/savingsGoalRoutes';
import notificationRoutes from './routes/notificationRoutes';
import monthlyReportRoutes from './routes/monthlyReportRoutes';
import webauthnRoutes from './routes/webauthnRoutes';
import tagRoutes from './routes/tagRoutes';
import shareRoutes from './routes/shareRoutes';
import UserCredential from './models/UserCredential';
import { processScheduledTransactions, cleanupStaleLocks } from './utils/scheduledProcessor';
import { initWebPush } from './utils/pushNotification';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec, { customCss } from './utils/swagger';
import { AppRequest, AppResponse } from './types';
import { env } from './utils/env';
import requestIdMiddleware from './middleware/requestIdMiddleware';
import './listeners/alertListener';

initWebPush();

// Global Error Handlers (Uncaught Exceptions & Unhandled Rejections)
process.on('uncaughtException', (err) => {
  logger.error('CRITICAL: Uncaught Exception - Shutting down', { error: err });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('CRITICAL: Unhandled Rejection', { promise, reason });
  process.exit(1);
});

const app = express();

// Trust proxy for rate limiting (behind reverse proxies like Heroku, Nginx, Vercel)
app.set('trust proxy', 1);

// Dynamic CORS Configuration — doit être avant les autres middlewares pour gérer le preflight OPTIONS
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : [];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  // CORS headers manuels pour garantir le preflight OPTIONS fonctionne
  if (origin && (allowedOrigins.includes(origin) || (isDevelopment && (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:'))))) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Idempotency-Key');
    res.header('Access-Control-Max-Age', '86400');
  }
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Workaround for express-mongo-sanitize compatibility with Express 5 (where req.query is read-only)
app.use((req, res, next) => {
  Object.defineProperty(req, 'query', {
    value: { ...req.query },
    writable: true,
    configurable: true,
    enumerable: true,
  });
  next();
});

// Middleware
app.use(requestIdMiddleware);
app.use(express.json());
app.use(cookieParser());

// Security Middleware
if (process.env.NODE_ENV === 'production') {
  app.use(helmet());
} else {
  // En développement, on désactive HSTS pour éviter les conflits avec http://localhost
  app.use(helmet({
    hsts: false,
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: false
  }));
}
app.use(mongoSanitize());

// Logging Middleware
if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined'));
} else {
  app.use(morgan('dev'));
}

// Global Rate Limiter for API routes — appliqué après CORS pour ne pas bloquer le preflight OPTIONS
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: env.RATE_LIMIT_MAX_REQUESTS,
  message: {
    status: 'fail',
    message: 'Too many requests from this IP, please try again after 1 minute'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});
app.use('/api', apiLimiter);

// Swagger API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss,
  customSiteTitle: 'Budgetizer API Documentation'
}));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/scheduled', scheduledRoutes);
app.use('/api/charts', chartRoutes);
app.use('/api/users', userRoutes);
app.use('/api/saved-filters', savedFilterRoutes);
app.use('/api/insights', insightRoutes);
app.use('/api/savings-goals', savingsGoalRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/monthly-reports', monthlyReportRoutes);
app.use('/api/webauthn', webauthnRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/shares', shareRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  const health = {
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    mongoose: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  };
  res.status(200).json(health);
});

// Secure scheduled job endpoint for external trigger
app.post('/api/jobs/process-scheduled', async (req: AppRequest, res: AppResponse) => {
  const jobKey = req.headers['x-job-key'];
  const expectedKey = process.env.SCHEDULED_JOBS_SECRET;
  
  if (process.env.NODE_ENV === 'production' && (!expectedKey || jobKey !== expectedKey)) {
    return res.status(401).json({ message: 'Unauthorized job execution key' });
  }
  
  try {
    logger.info('[Jobs] Manually triggering scheduled transactions processor');
    await processScheduledTransactions();
    res.json({ message: 'Scheduled transactions processed successfully' });
  } catch (err) {
    logger.error('[Jobs] Error in manual job execution', { error: err });
    res.status(500).json({ message: 'Error processing scheduled transactions' });
  }
});

// Error Handler to log and format error responses
app.use((err: unknown, req: AppRequest, res: AppResponse, _next: (err?: unknown) => void) => {
  const status = (err as { status?: number })?.status || 500;
  const message = (err as Error)?.message || 'Internal Server Error';
  const stack = (err as Error)?.stack;

  logger.error('Express Error', {
    method: req.method,
    path: req.originalUrl,
    ip: req.ip || req.socket?.remoteAddress,
    status,
    error: err,
  });

  const responsePayload: Record<string, unknown> = {
    status: 'error',
    message,
  };

  if (process.env.NODE_ENV !== 'production' && stack) {
    responsePayload.stack = stack;
  }

  res.status(status).json(responsePayload);
});

// MongoDB connection
// Migration: Repair double-encoded WebAuthn credential IDs
const migrateDoubleEncodedCredentials = async () => {
  try {
    const credentials = await UserCredential.find({});
    let fixedCount = 0;
    
    for (const cred of credentials) {
      try {
        const decoded = Buffer.from(cred.credentialID, 'base64url').toString('utf-8');
        // Check if the decoded string is a valid base64url string of typical length (20-100 characters)
        if (/^[A-Za-z0-9_-]{20,100}$/.test(decoded)) {
          logger.info('[Migration] Fixing double-encoded WebAuthn credential ID', { deviceName: cred.deviceName, oldId: cred.credentialID, newId: decoded });
          cred.credentialID = decoded;
          await cred.save();
          fixedCount++;
        }
      } catch {
        // Ignore parsing errors or non-double-encoded IDs
      }
    }
    if (fixedCount > 0) {
      logger.info(`[Migration] Successfully repaired ${fixedCount} double-encoded WebAuthn credentials.`);
    }
  } catch (error) {
    logger.error('[Migration] Error running WebAuthn credential migration', { error });
  }
};

// Migration: Clean up legacy corrupt credentials containing commas
const cleanLegacyCorruptCredentials = async () => {
  try {
    const result = await UserCredential.deleteMany({ credentialID: { $regex: /,/ } });
    if (result.deletedCount > 0) {
      logger.info(`[Migration] Supprimé ${result.deletedCount} credentials WebAuthn corrompus contenant des virgules.`);
    }
  } catch (error) {
    logger.error('[Migration] Error cleaning corrupt credentials', { error });
  }
};

let server: http.Server | undefined;
const mongoOptions = {
  maxPoolSize: parseInt(process.env.MONGODB_MAX_POOL_SIZE || '10', 10),
};

// Mongoose Connection Event Listeners
mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB connection lost. Attempting auto-reconnect...');
});

mongoose.connection.on('reconnected', () => {
  logger.info('MongoDB connection re-established.');
});

mongoose.connection.on('error', (err) => {
  logger.error('MongoDB runtime connection error', { error: err });
});

const connectDBWithRetry = async (maxRetries = 5, initialDelayMs = 2000): Promise<void> => {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      await mongoose.connect(process.env.MONGODB_URI || '', mongoOptions);
      logger.info('Connected to MongoDB');
      return;
    } catch (err) {
      attempt++;
      logger.error(`MongoDB connection attempt ${attempt}/${maxRetries} failed`, { error: err });
      if (attempt >= maxRetries) {
        throw err;
      }
      const delay = initialDelayMs * Math.pow(2, attempt - 1);
      logger.info(`Retrying MongoDB connection in ${delay}ms...`);
      await new Promise((res) => setTimeout(res, delay));
    }
  }
};

connectDBWithRetry()
  .then(() => {
    // Run WebAuthn credential migration asynchronously
    migrateDoubleEncodedCredentials();
    cleanLegacyCorruptCredentials();

    // Clean up stale job locks from previous crashed instances
    cleanupStaleLocks();

    const PORT = process.env.PORT || 5000;
    server = app.listen(PORT, () => {
      logger.info('Server running on port', { port: PORT });
      
      // Run scheduled processor based on RUN_SCHEDULED_JOBS environment variable
      const shouldRunJobs = process.env.RUN_SCHEDULED_JOBS === 'true' || 
        (process.env.NODE_ENV !== 'production' && process.env.RUN_SCHEDULED_JOBS !== 'false');

      if (shouldRunJobs) {
        // MongoDB document lock ensures exclusive execution across PM2 instances.
        // The in-memory flag is kept as a secondary safeguard within the same process.
        let isProcessingScheduledJobs = false;

        const runScheduledJobsSafe = async () => {
          if (isProcessingScheduledJobs) {
            logger.info('[ScheduledProcessor] Previous job still running, skipping interval');
            return;
          }
          isProcessingScheduledJobs = true;
          try {
            await processScheduledTransactions();
          } catch (err) {
            logger.error('[ScheduledProcessor] Error in scheduled run', { error: err });
          } finally {
            isProcessingScheduledJobs = false;
          }
        };

        runScheduledJobsSafe();
        const intervalMs = parseInt(process.env.SCHEDULED_JOB_INTERVAL_MS || '3600000', 10);
        setInterval(runScheduledJobsSafe, intervalMs);
        logger.info(`Scheduled jobs runner initialized (interval: ${intervalMs}ms)`);
      } else {
        logger.info('Scheduled jobs runner disabled for this instance');
      }
    });
  })
  .catch((err) => {
    logger.error('MongoDB connection error after max retries', { error: err });
  });


// Graceful shutdown
const gracefulShutdown = (signal: string) => {
  logger.info(`Received ${signal} - Starting graceful shutdown`);
  
  if (server) {
    server.close(() => {
      logger.info('HTTP server closed.');
      
      mongoose.connection.close()
        .then(() => {
          logger.info('MongoDB connection closed.');
          process.exit(0);
        })
        .catch((err) => {
          logger.error('Error closing MongoDB connection:', { error: (err as Error).message });
          process.exit(1);
        });
    });
    
    // Force shutdown after 10s if connections are hanging
    setTimeout(() => {
      logger.error('Could not close connections in time, forcefully shutting down.');
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
