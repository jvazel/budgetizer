import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import morgan from 'morgan';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import cookieParser from 'cookie-parser';

import authRoutes from './routes/authRoutes.js';
import accountRoutes from './routes/accountRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import transactionRoutes from './routes/transactionRoutes.js';
import budgetRoutes from './routes/budgetRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import scheduledRoutes from './routes/scheduledRoutes.js';
import chartRoutes from './routes/chartRoutes.js';
import userRoutes from './routes/userRoutes.js';
import savedFilterRoutes from './routes/savedFilterRoutes.js';
import insightRoutes from './routes/insightRoutes.js';
import savingsGoalRoutes from './routes/savingsGoalRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import monthlyReportRoutes from './routes/monthlyReportRoutes.js';
import webauthnRoutes from './routes/webauthnRoutes.js';
import tagRoutes from './routes/tagRoutes.js';
import shareRoutes from './routes/shareRoutes.js';
import UserCredential from './models/UserCredential.js';
import { processScheduledTransactions, cleanupStaleLocks } from './utils/scheduledProcessor.js';
import { initWebPush } from './utils/pushNotification.js';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec, { customCss } from './utils/swagger.js';
import './listeners/alertListener.js';

dotenv.config({ override: true });
initWebPush();

// Global Error Handlers (Uncaught Exceptions & Unhandled Rejections)
process.on('uncaughtException', (err) => {
  console.error('CRITICAL: Uncaught Exception! Shutting down...', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('CRITICAL: Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Validate critical environment variables
const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error(`FATAL: Missing critical environment variables: ${missingEnvVars.join(', ')}`);
  process.exit(1);
}

if (process.env.NODE_ENV === 'production' && process.env.JWT_SECRET === 'your_super_secret_key_here') {
  console.error('FATAL: JWT_SECRET cannot be left as the default development value in production!');
  process.exit(1);
}

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
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 80,
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
  customSiteTitle: "Budgetizer API Documentation"
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

// Secure scheduled job endpoint for external trigger
app.post('/api/jobs/process-scheduled', async (req, res) => {
  const jobKey = req.headers['x-job-key'];
  const expectedKey = process.env.SCHEDULED_JOBS_SECRET;
  
  if (process.env.NODE_ENV === 'production' && (!expectedKey || jobKey !== expectedKey)) {
    return res.status(401).json({ message: 'Unauthorized job execution key' });
  }
  
  try {
    console.log('[Jobs] Manually triggering scheduled transactions processor...');
    await processScheduledTransactions();
    res.json({ message: 'Scheduled transactions processed successfully' });
  } catch (err) {
    console.error('[Jobs] Error in manual job execution:', err);
    res.status(500).json({ message: 'Error processing scheduled transactions' });
  }
});

// Error Handler to log and format error responses
app.use((err, req, res, next) => {
  console.error('Express Error:', err);
  res.status(err.status || 500).json({
    status: 'error',
    message: err.message || 'Internal Server Error'
  });
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
          console.log(`[Migration] Fixing double-encoded WebAuthn credential ID for device "${cred.deviceName}": "${cred.credentialID}" -> "${decoded}"`);
          cred.credentialID = decoded;
          await cred.save();
          fixedCount++;
        }
      } catch (e) {
        // Ignore parsing errors or non-double-encoded IDs
      }
    }
    if (fixedCount > 0) {
      console.log(`[Migration] Successfully repaired ${fixedCount} double-encoded WebAuthn credentials.`);
    }
  } catch (error) {
    console.error('[Migration] Error running WebAuthn credential migration:', error);
  }
};

// Migration: Clean up legacy corrupt credentials containing commas
const cleanLegacyCorruptCredentials = async () => {
  try {
    const result = await UserCredential.deleteMany({ credentialID: { $regex: /,/ } });
    if (result.deletedCount > 0) {
      console.log(`[Migration] Supprimé ${result.deletedCount} credentials WebAuthn corrompus contenant des virgules.`);
    }
  } catch (error) {
    console.error('[Migration] Erreur lors du nettoyage des credentials corrompus:', error);
  }
};

let server;
const mongoOptions = {
  maxPoolSize: parseInt(process.env.MONGODB_MAX_POOL_SIZE, 10) || 10,
};

mongoose.connect(process.env.MONGODB_URI, mongoOptions)
  .then(() => {
    console.log('Connected to MongoDB');
    
    // Run WebAuthn credential migration asynchronously
    migrateDoubleEncodedCredentials();
    cleanLegacyCorruptCredentials();

    // Clean up stale job locks from previous crashed instances
    cleanupStaleLocks(mongoose);

    const PORT = process.env.PORT || 5000;
    server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      
      // Run scheduled processor based on RUN_SCHEDULED_JOBS environment variable
      const shouldRunJobs = process.env.RUN_SCHEDULED_JOBS === 'true' || 
        (process.env.NODE_ENV !== 'production' && process.env.RUN_SCHEDULED_JOBS !== 'false');

      if (shouldRunJobs) {
        // MongoDB document lock ensures exclusive execution across PM2 instances.
        // The in-memory flag is kept as a secondary safeguard within the same process.
        let isProcessingScheduledJobs = false;

        const runScheduledJobsSafe = async () => {
          if (isProcessingScheduledJobs) {
            console.log('[ScheduledProcessor] Previous job still running, skipping this interval...');
            return;
          }
          isProcessingScheduledJobs = true;
          try {
            await processScheduledTransactions();
          } catch (err) {
            console.error('[ScheduledProcessor] Error in scheduled run:', err);
          } finally {
            isProcessingScheduledJobs = false;
          }
        };

        runScheduledJobsSafe();
        const intervalMs = parseInt(process.env.SCHEDULED_JOB_INTERVAL_MS, 10) || 3600000;
        setInterval(runScheduledJobsSafe, intervalMs);
        console.log(`Scheduled jobs runner initialized (interval: ${intervalMs}ms)`);
      } else {
        console.log('Scheduled jobs runner disabled for this instance');
      }
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
  });

// Graceful shutdown
const gracefulShutdown = (signal) => {
  console.log(`\n👋 Received ${signal}. Starting graceful shutdown...`);
  
  if (server) {
    server.close(() => {
      console.log('HTTP server closed.');
      
      mongoose.connection.close()
        .then(() => {
          console.log('MongoDB connection closed.');
          process.exit(0);
        })
        .catch((err) => {
          console.error('Error closing MongoDB connection:', err);
          process.exit(1);
        });
    });
    
    // Force shutdown after 10s if connections are hanging
    setTimeout(() => {
      console.error('Could not close connections in time, forcefully shutting down.');
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
