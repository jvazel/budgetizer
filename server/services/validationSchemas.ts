import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères').max(50),
  email: z.string().email('Email invalide'),
  password: z.string()
    .min(6, 'Le mot de passe doit contenir au moins 6 caractères')
    .regex(/[A-Z]/, 'Le mot de passe doit contenir au moins une majuscule')
    .regex(/[a-z]/, 'Le mot de passe doit contenir au moins une minuscule')
    .regex(/[0-9]/, 'Le mot de passe doit contenir au moins un chiffre'),
  confirmPassword: z.string().min(1, 'La confirmation est requise'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword'],
});

export const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Le mot de passe est requis'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Email invalide'),
});

export const resetPasswordSchema = z.object({
  password: z.string()
    .min(6, 'Le mot de passe doit contenir au moins 6 caractères')
    .regex(/[A-Z]/, 'Le mot de passe doit contenir au moins une majuscule')
    .regex(/[a-z]/, 'Le mot de passe doit contenir au moins une minuscule')
    .regex(/[0-9]/, 'Le mot de passe doit contenir au moins un chiffre'),
});

export const createAccountSchema = z.object({
  name: z.string().min(1, 'Le nom du compte est requis').max(100),
  type: z.enum(['checking', 'savings', 'cash', 'credit', 'investment']),
  currency: z.string().length(3, 'La devise doit être un code ISO 4217'),
  color: z.string().optional(),
  icon: z.string().optional(),
  includeInTotal: z.boolean().optional(),
  creditLimit: z.number().positive('La limite de crédit doit être positive').optional().nullable(),
  creditDetails: z.object({
    initialAmount: z.number().optional().nullable(),
    interestRate: z.number().optional().nullable(),
    durationMonths: z.number().optional().nullable(),
    startDate: z.string().optional().nullable(),
    monthlyPayment: z.number().optional().nullable(),
    scheduledTransactionId: z.string().optional().nullable(),
  }).optional().nullable(),
});

export const updateAccountSchema = createAccountSchema.partial();

export const createTransactionSchema = z.object({
  accountId: z.string().min(1, 'Le compte est requis'),
  categoryId: z.string().optional().nullable(),
  type: z.enum(['expense', 'income', 'transfer']),
  amount: z.number().positive('Le montant doit être supérieur à 0'),
  description: z.string().optional().default(''),
  note: z.string().optional().default(''),
  date: z.string().optional(),
  tags: z.array(z.string()).optional().default([]),
  toAccountId: z.string().optional().nullable(),
  savingsGoalId: z.string().optional().nullable(),
  isPending: z.boolean().optional(),
  isScheduled: z.boolean().optional(),
  scheduledTransactionId: z.string().optional().nullable(),
});

export const updateTransactionSchema = createTransactionSchema.partial();

export const createBudgetSchema = z.object({
  name: z.string().min(1, 'Le nom est requis').max(100),
  categoryId: z.string().min(1, 'La catégorie est requise'),
  amount: z.number().positive('Le montant doit être supérieur à 0'),
  period: z.enum(['weekly', 'monthly', 'yearly']).optional().default('monthly'),
  startDate: z.string().optional(),
  rollover: z.boolean().optional().default(false),
  alertAt: z.number().min(0).max(100).optional().default(80),
  color: z.string().optional(),
});

export const updateBudgetSchema = createBudgetSchema.partial();

export const createCategorySchema = z.object({
  name: z.string().min(1, 'Le nom est requis').max(50),
  type: z.enum(['expense', 'income', 'both']),
  icon: z.string().min(1, 'L\'icône est requise'),
  color: z.string().min(1, 'La couleur est requise'),
  parentId: z.string().optional().nullable(),
  isDefault: z.boolean().optional().default(false),
  order: z.number().int().min(0).optional().default(0),
});

export const createTagSchema = z.object({
  name: z.string().min(1, 'Le nom du tag est requis').max(30),
  color: z.string().optional().default('#6b7280'),
  isArchived: z.boolean().optional().default(false),
});

export const createSavingsGoalSchema = z.object({
  name: z.string().min(1, 'Le nom est requis').max(100),
  targetAmount: z.number().positive('Le montant cible doit être supérieur à 0'),
  targetDate: z.string().optional(),
  icon: z.string().optional().default('🎯'),
  color: z.string().optional().default('#4ade80'),
  accountId: z.string().optional().nullable(),
});

export const updateSavingsGoalSchema = createSavingsGoalSchema.partial();

export const createShareSchema = z.object({
  resourceType: z.enum(['account', 'budget']),
  resourceId: z.string().min(1, 'L\'identifiant de la ressource est requis'),
  shareeEmail: z.string().email('Email invalide'),
  permission: z.enum(['read', 'write']).optional().default('read'),
});

export const createScheduledSchema = z.object({
  accountId: z.string().min(1, 'Le compte est requis'),
  categoryId: z.string().optional().nullable(),
  type: z.enum(['expense', 'income', 'transfer']),
  amount: z.number().positive('Le montant doit être supérieur à 0'),
  description: z.string().optional().default(''),
  frequency: z.object({
    every: z.number().int().positive('La fréquence doit être un nombre positif'),
    unit: z.enum(['day', 'week', 'month', 'year']),
  }),
  startDate: z.string().optional(),
  endDate: z.string().optional().nullable(),
  numberOfTimes: z.number().int().positive('Le nombre d\'occurrences doit être un nombre positif').optional().default(0),
  autoConfirm: z.boolean().optional().default(false),
  isSubscription: z.boolean().optional().default(false),
  toAccountId: z.string().optional().nullable(),
});

export const updateScheduledSchema = createScheduledSchema.partial();

export const subscribePushSchema = z.object({
  subscription: z.object({
    endpoint: z.string().min(1, 'L\'endpoint est requis'),
    keys: z.object({
      p256dh: z.string().min(1, 'La clé p256dh est requise'),
      auth: z.string().min(1, 'La clé auth est requise'),
    }),
  }),
});

export const unsubscribePushSchema = z.object({
  endpoint: z.string().min(1, 'L\'endpoint est requis'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
export type CreateBudgetInput = z.infer<typeof createBudgetSchema>;
export type UpdateBudgetInput = z.infer<typeof updateBudgetSchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type CreateTagInput = z.infer<typeof createTagSchema>;
export type CreateSavingsGoalInput = z.infer<typeof createSavingsGoalSchema>;
export type UpdateSavingsGoalInput = z.infer<typeof updateSavingsGoalSchema>;
export type CreateShareInput = z.infer<typeof createShareSchema>;
export type CreateScheduledInput = z.infer<typeof createScheduledSchema>;
export type UpdateScheduledInput = z.infer<typeof updateScheduledSchema>;
export type SubscribePushInput = z.infer<typeof subscribePushSchema>;
export type UnsubscribePushInput = z.infer<typeof unsubscribePushSchema>;