import { z } from 'zod';

export const profileSchema = z.object({
  name: z.string()
    .min(2, 'Le nom doit contenir au moins 2 caractères')
    .max(50, 'Le nom ne peut pas dépasser 50 caractères'),
  email: z.string()
    .min(1, 'L\'email est requis')
    .email('Email invalide'),
});

export const passwordSchema = z.object({
  oldPassword: z.string()
    .min(1, 'Le mot de passe actuel est requis'),
  newPassword: z.string()
    .min(6, 'Le nouveau mot de passe doit contenir au moins 6 caractères')
    .regex(/[A-Z]/, 'Le mot de passe doit contenir au moins une majuscule')
    .regex(/[a-z]/, 'Le mot de passe doit contenir au moins une minuscule')
    .regex(/[0-9]/, 'Le mot de passe doit contenir au moins un chiffre'),
  confirmPassword: z.string()
    .min(1, 'La confirmation est requise'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword'],
});

export const currencyCodeEnum = z.enum(['EUR', 'USD', 'GBP', 'CHF', 'JPY']);

export const preferencesSchema = z.object({
  currencyCode: z.enum(['EUR', 'USD', 'GBP', 'CHF', 'JPY']).default('EUR'),
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

export const accountSchema = z.object({
  name: z.string()
    .min(1, 'Le nom du compte est requis')
    .max(50, 'Le nom ne peut pas dépasser 50 caractères'),
  type: z.enum(['checking', 'savings', 'cash', 'credit', 'investment']),
  balance: z.string()
    .transform((val) => parseFloat(val))
    .refine((val) => !isNaN(val), { message: 'Le solde doit être un nombre valide' }),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Couleur invalide'),
  includeInTotal: z.boolean(),
});

export const creditAccountSchema = z.object({
  name: z.string()
    .min(1, 'Le nom du compte est requis')
    .max(50, 'Le nom ne peut pas dépasser 50 caractères'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Couleur invalide'),
  initialAmount: z.string()
    .transform((val) => parseFloat(val))
    .refine((val) => !isNaN(val) && val > 0, { message: 'Le montant initial doit être supérieur à 0' }),
  interestRate: z.string()
    .transform((val) => parseFloat(val))
    .refine((val) => !isNaN(val), { message: 'Le taux d\'intérêt doit être un nombre valide' }),
  durationMonths: z.string()
    .transform((val) => parseInt(val))
    .refine((val) => !isNaN(val) && val > 0, { message: 'La durée doit être supérieure à 0 mois' }),
  startDate: z.string()
    .min(1, 'La date de début est requise'),
  sourceAccountId: z.string()
    .min(1, 'Le compte source est requis'),
});

export const transactionSchema = z.object({
  type: z.enum(['expense', 'income']),
  amount: z.string()
    .transform((val) => parseFloat(val))
    .refine((val) => !isNaN(val) && val > 0, { message: 'Le montant doit être supérieur à 0' }),
  accountId: z.string()
    .min(1, 'Le compte est requis'),
  categoryId: z.string()
    .optional(),
  note: z.string().optional(),
  date: z.string()
    .min(1, 'La date est requise'),
  selectedTagIds: z.array(z.string()).default([]),
});

export const budgetSchema = z.object({
  name: z.string()
    .min(1, 'Le nom du budget est requis')
    .max(50, 'Le nom ne peut pas dépasser 50 caractères'),
  amount: z.string()
    .transform((val) => parseFloat(val))
    .refine((val) => !isNaN(val) && val > 0, { message: 'Le montant doit être supérieur à 0' }),
  categoryId: z.string()
    .min(1, 'La catégorie est requise'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Couleur invalide'),
  period: z.enum(['weekly', 'monthly', 'yearly']),
});

export const categorySchema = z.object({
  name: z.string()
    .min(1, 'Le nom de la catégorie est requis')
    .max(30, 'Le nom ne peut pas dépasser 30 caractères'),
  type: z.enum(['expense', 'income', 'both']),
  icon: z.string().default('📒'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Couleur invalide').default('#8b5cf6'),
});

export const savingsGoalSchema = z.object({
  name: z.string()
    .min(1, 'Le nom de l\'objectif est requis')
    .max(50, 'Le nom ne peut pas dépasser 50 caractères'),
  targetAmount: z.string()
    .transform((val) => parseFloat(val))
    .refine((val) => !isNaN(val) && val > 0, { message: 'Le montant cible doit être supérieur à 0' }),
  targetDate: z.string()
    .min(1, 'La date cible est requise'),
  icon: z.string().default('🎯'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Couleur invalide').default('#3b82f6'),
  accountId: z.string().optional(),
});

export const savingsActionSchema = z.object({
  amount: z.string()
    .transform((val) => parseFloat(val))
    .refine((val) => !isNaN(val) && val > 0, { message: 'Le montant doit être supérieur à 0' }),
  accountId: z.string()
    .min(1, 'Le compte est requis'),
  date: z.string()
    .min(1, 'La date est requise'),
  note: z.string().optional(),
  categoryId: z.string().optional(),
});

export const scheduledSchema = z.object({
  type: z.enum(['expense', 'income', 'transfer']),
  amount: z.string()
    .transform((val) => parseFloat(val))
    .refine((val) => !isNaN(val) && val > 0, { message: 'Le montant doit être supérieur à 0' }),
  accountId: z.string()
    .min(1, 'Le compte est requis'),
  categoryId: z.string().optional(),
  description: z.string()
    .min(1, 'La description est requise')
    .max(100, 'La description ne peut pas dépasser 100 caractères'),
  note: z.string().optional(),
  frequencyEvery: z.number().int().min(1),
  frequencyUnit: z.enum(['day', 'week', 'month', 'year']),
  startDate: z.string()
    .min(1, 'La date de début est requise'),
  numberOfTimes: z.number().int().min(0).optional(),
  endDate: z.string().optional(),
  autoConfirm: z.boolean(),
  isSubscription: z.boolean(),
  toAccountId: z.string().optional(),
});

export const userValidators = { profileSchema, passwordSchema, preferencesSchema };
export const accountValidators = { accountSchema, creditAccountSchema };
export const transactionValidators = { transactionSchema };
export const budgetValidators = { budgetSchema };
export const categoryValidators = { categorySchema };
export const savingsValidators = { savingsGoalSchema, savingsActionSchema };
export const scheduledValidators = { scheduledSchema };
