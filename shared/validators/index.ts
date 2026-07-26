import { z } from 'zod';

export const profileSchema = z.object({
  name: z.string()
    .min(2, 'Le nom doit contenir au moins 2 caractères')
    .max(50, 'Le nom ne peut pas dépasser 50 caractères'),
  email: z.string()
    .min(1, 'L\'email est requis')
    .email('Email invalide'),
});

export const currencyCodeEnum = z.enum(['EUR', 'USD', 'GBP', 'CHF', 'JPY']);

export const preferencesSchema = z.object({
  currencyCode: currencyCodeEnum.default('EUR'),
  theme: z.enum(['dark', 'light']).default('dark'),
  dateFormat: z.string().default('DD/MM/YYYY'),
  firstDayOfWeek: z.number().min(0).max(6).default(1),
  anomalyThreshold: z.number().min(10).max(90).default(30),
  lowBalanceThreshold: z.number().min(0).default(100),
  enableBudgetAlerts: z.boolean().default(true),
  enableScheduledAlerts: z.boolean().default(true),
  enableSavingsAlerts: z.boolean().default(true),
  enableLowBalanceAlerts: z.boolean().default(true),
  enableAiInsightsAlerts: z.boolean().default(true),
});

export const accountTypeEnum = z.enum(['checking', 'savings', 'cash', 'credit', 'investment']);
export const transactionTypeEnum = z.enum(['expense', 'income', 'transfer']);
