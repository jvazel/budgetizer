import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import morgan from 'morgan';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';

import authRoutes from './routes/authRoutes.js';
import accountRoutes from './routes/accountRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import transactionRoutes from './routes/transactionRoutes.js';
import budgetRoutes from './routes/budgetRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import scheduledRoutes from './routes/scheduledRoutes.js';
import chartRoutes from './routes/chartRoutes.js';
import userRoutes from './routes/userRoutes.js';
import { processScheduledTransactions } from './utils/scheduledProcessor.js';

dotenv.config({ override: true });

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

// Security Middleware
app.use(helmet());
app.use(mongoSanitize());

// Middleware
app.use(express.json());

// Dynamic CORS Configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : [];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const isDevelopment = process.env.NODE_ENV !== 'production';
    if (
      allowedOrigins.includes(origin) ||
      (isDevelopment && (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')))
    ) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
};
app.use(cors(corsOptions));

// Logging Middleware
if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined'));
} else {
  app.use(morgan('dev'));
}

// Global Rate Limiter for API routes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
  message: {
    status: 'fail',
    message: 'Too many requests from this IP, please try again after 15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', apiLimiter);

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

// Error Handler to log and format error responses
app.use((err, req, res, next) => {
  console.error('Express Error:', err);
  res.status(err.status || 500).json({
    status: 'error',
    message: err.message || 'Internal Server Error'
  });
});

// MongoDB connection
let server;
const mongoOptions = {
  maxPoolSize: parseInt(process.env.MONGODB_MAX_POOL_SIZE, 10) || 10,
};

mongoose.connect(process.env.MONGODB_URI, mongoOptions)
  .then(() => {
    console.log('Connected to MongoDB');
    const PORT = process.env.PORT || 5000;
    server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      
      // Run scheduled processor based on RUN_SCHEDULED_JOBS environment variable
      const shouldRunJobs = process.env.RUN_SCHEDULED_JOBS === 'true' || 
        (process.env.NODE_ENV !== 'production' && process.env.RUN_SCHEDULED_JOBS !== 'false');

      if (shouldRunJobs) {
        processScheduledTransactions();
        const intervalMs = parseInt(process.env.SCHEDULED_JOB_INTERVAL_MS, 10) || 3600000;
        setInterval(processScheduledTransactions, intervalMs);
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
