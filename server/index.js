import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import morgan from 'morgan';
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



const app = express();

// Middleware
app.use(express.json());
app.use(cors());
app.use(morgan('dev'));

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

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      
      // Run scheduled processor at startup
      processScheduledTransactions();
      // Run scheduled processor every hour
      setInterval(processScheduledTransactions, 3600000);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
  });
