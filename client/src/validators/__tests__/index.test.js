import { describe, it, expect } from 'vitest';
import {
  profileSchema,
  passwordSchema,
  preferencesSchema,
  accountSchema,
  creditAccountSchema,
  transactionSchema,
  budgetSchema,
  categorySchema,
  savingsGoalSchema,
  savingsActionSchema,
  scheduledSchema
} from '../index';

describe('General Validators', () => {
  describe('profileSchema', () => {
    it('should validate a correct profile', () => {
      const validProfile = { name: 'John Doe', email: 'john.doe@example.com' };
      const result = profileSchema.safeParse(validProfile);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validProfile);
    });

    it('should fail if name is less than 2 characters', () => {
      const invalidProfile = { name: 'J', email: 'john.doe@example.com' };
      const result = profileSchema.safeParse(invalidProfile);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Le nom doit contenir au moins 2 caractères');
      }
    });

    it('should fail if name is longer than 50 characters', () => {
      const longName = 'a'.repeat(51);
      const invalidProfile = { name: longName, email: 'john.doe@example.com' };
      const result = profileSchema.safeParse(invalidProfile);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Le nom ne peut pas dépasser 50 caractères');
      }
    });

    it('should fail if email is empty', () => {
      const invalidProfile = { name: 'John Doe', email: '' };
      const result = profileSchema.safeParse(invalidProfile);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("L'email est requis");
      }
    });

    it('should fail if email format is invalid', () => {
      const invalidProfile = { name: 'John Doe', email: 'invalid-email' };
      const result = profileSchema.safeParse(invalidProfile);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Email invalide');
      }
    });
  });

  describe('passwordSchema', () => {
    it('should validate a correct password change', () => {
      const validPasswords = {
        oldPassword: 'CurrentPassword1',
        newPassword: 'NewSecurePassword2',
        confirmPassword: 'NewSecurePassword2'
      };
      const result = passwordSchema.safeParse(validPasswords);
      expect(result.success).toBe(true);
    });

    it('should fail if oldPassword is empty', () => {
      const invalid = {
        oldPassword: '',
        newPassword: 'NewSecurePassword2',
        confirmPassword: 'NewSecurePassword2'
      };
      const result = passwordSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Le mot de passe actuel est requis');
      }
    });

    it('should fail if newPassword is less than 6 characters', () => {
      const invalid = {
        oldPassword: 'CurrentPassword1',
        newPassword: 'Ab1',
        confirmPassword: 'Ab1'
      };
      const result = passwordSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Le nouveau mot de passe doit contenir au moins 6 caractères');
      }
    });

    it('should fail if newPassword does not contain an uppercase letter', () => {
      const invalid = {
        oldPassword: 'CurrentPassword1',
        newPassword: 'newsecurepassword2',
        confirmPassword: 'newsecurepassword2'
      };
      const result = passwordSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Le mot de passe doit contenir au moins une majuscule');
      }
    });

    it('should fail if newPassword does not contain a lowercase letter', () => {
      const invalid = {
        oldPassword: 'CurrentPassword1',
        newPassword: 'NEWSECUREPASSWORD2',
        confirmPassword: 'NEWSECUREPASSWORD2'
      };
      const result = passwordSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Le mot de passe doit contenir au moins une minuscule');
      }
    });

    it('should fail if newPassword does not contain a number', () => {
      const invalid = {
        oldPassword: 'CurrentPassword1',
        newPassword: 'NewSecurePassword',
        confirmPassword: 'NewSecurePassword'
      };
      const result = passwordSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Le mot de passe doit contenir au moins un chiffre');
      }
    });

    it('should fail if newPassword and confirmPassword do not match', () => {
      const invalid = {
        oldPassword: 'CurrentPassword1',
        newPassword: 'NewSecurePassword2',
        confirmPassword: 'DifferentPassword3'
      };
      const result = passwordSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Les mots de passe ne correspondent pas');
        expect(result.error.issues[0].path).toEqual(['confirmPassword']);
      }
    });
  });

  describe('preferencesSchema', () => {
    it('should parse successfully and fill default values if input is empty', () => {
      const result = preferencesSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({
          currencyCode: 'EUR',
          theme: 'dark',
          dateFormat: 'DD/MM/YYYY',
          firstDayOfWeek: 1,
          anomalyThreshold: 30,
          lowBalanceThreshold: 100,
          enableBudgetAlerts: true,
          enableScheduledAlerts: true,
          enableSavingsAlerts: true,
          enableLowBalanceAlerts: true,
          enableAiInsightsAlerts: true
        });
      }
    });

    it('should validate custom settings successfully', () => {
      const customPreferences = {
        currencyCode: 'USD',
        theme: 'light',
        dateFormat: 'YYYY-MM-DD',
        firstDayOfWeek: 0,
        anomalyThreshold: 50,
        lowBalanceThreshold: 50,
        enableBudgetAlerts: false,
        enableScheduledAlerts: false,
        enableSavingsAlerts: false,
        enableLowBalanceAlerts: false,
        enableAiInsightsAlerts: false
      };
      const result = preferencesSchema.safeParse(customPreferences);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(customPreferences);
      }
    });

    it('should fail if currencyCode is not in enum', () => {
      const result = preferencesSchema.safeParse({ currencyCode: 'CAD' });
      expect(result.success).toBe(false);
    });

    it('should fail if theme is invalid', () => {
      const result = preferencesSchema.safeParse({ theme: 'blue' });
      expect(result.success).toBe(false);
    });

    it('should fail if firstDayOfWeek is out of bounds', () => {
      const result = preferencesSchema.safeParse({ firstDayOfWeek: 7 });
      expect(result.success).toBe(false);
    });

    it('should fail if anomalyThreshold is out of bounds', () => {
      const resultLower = preferencesSchema.safeParse({ anomalyThreshold: 9 });
      const resultUpper = preferencesSchema.safeParse({ anomalyThreshold: 91 });
      expect(resultLower.success).toBe(false);
      expect(resultUpper.success).toBe(false);
    });

    it('should fail if lowBalanceThreshold is negative', () => {
      const result = preferencesSchema.safeParse({ lowBalanceThreshold: -10 });
      expect(result.success).toBe(false);
    });
  });

  describe('accountSchema', () => {
    it('should validate and transform balance correctly', () => {
      const accountData = {
        name: 'Compte Courant',
        type: 'checking',
        balance: '1500.50',
        color: '#123456',
        includeInTotal: true
      };
      const result = accountSchema.safeParse(accountData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.balance).toBe(1500.50);
        expect(typeof result.data.balance).toBe('number');
      }
    });

    it('should fail if name is empty', () => {
      const result = accountSchema.safeParse({
        name: '',
        type: 'checking',
        balance: '0',
        color: '#ffffff',
        includeInTotal: true
      });
      expect(result.success).toBe(false);
    });

    it('should fail if type is invalid', () => {
      const result = accountSchema.safeParse({
        name: 'Compte',
        type: 'invalid-type',
        balance: '0',
        color: '#ffffff',
        includeInTotal: true
      });
      expect(result.success).toBe(false);
    });

    it('should fail if balance is not a valid number', () => {
      const result = accountSchema.safeParse({
        name: 'Compte',
        type: 'checking',
        balance: 'not-a-number',
        color: '#ffffff',
        includeInTotal: true
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Le solde doit être un nombre valide');
      }
    });

    it('should fail if color is not a valid hex color', () => {
      const result = accountSchema.safeParse({
        name: 'Compte',
        type: 'checking',
        balance: '0',
        color: 'red',
        includeInTotal: true
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Couleur invalide');
      }
    });
  });

  describe('creditAccountSchema', () => {
    it('should validate and transform credit account values correctly', () => {
      const creditData = {
        name: 'Prêt Auto',
        color: '#aabbcc',
        initialAmount: '12000.00',
        interestRate: '4.5',
        durationMonths: '48',
        startDate: '2026-07-07',
        sourceAccountId: 'acc123'
      };
      const result = creditAccountSchema.safeParse(creditData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.initialAmount).toBe(12000.00);
        expect(result.data.interestRate).toBe(4.5);
        expect(result.data.durationMonths).toBe(48);
      }
    });

    it('should fail if initialAmount is <= 0', () => {
      const creditData = {
        name: 'Prêt',
        color: '#aabbcc',
        initialAmount: '0',
        interestRate: '4.5',
        durationMonths: '48',
        startDate: '2026-07-07',
        sourceAccountId: 'acc123'
      };
      const result = creditAccountSchema.safeParse(creditData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Le montant initial doit être supérieur à 0');
      }
    });

    it('should fail if durationMonths is <= 0', () => {
      const creditData = {
        name: 'Prêt',
        color: '#aabbcc',
        initialAmount: '1000',
        interestRate: '4.5',
        durationMonths: '-5',
        startDate: '2026-07-07',
        sourceAccountId: 'acc123'
      };
      const result = creditAccountSchema.safeParse(creditData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('La durée doit être supérieure à 0 mois');
      }
    });

    it('should fail if interestRate is invalid', () => {
      const creditData = {
        name: 'Prêt',
        color: '#aabbcc',
        initialAmount: '1000',
        interestRate: 'invalid',
        durationMonths: '12',
        startDate: '2026-07-07',
        sourceAccountId: 'acc123'
      };
      const result = creditAccountSchema.safeParse(creditData);
      expect(result.success).toBe(false);
    });
  });

  describe('transactionSchema', () => {
    it('should validate and transform transaction data correctly', () => {
      const transactionData = {
        type: 'expense',
        amount: '45.99',
        accountId: 'acc-1',
        categoryId: 'cat-2',
        note: 'Courses de la semaine',
        date: '2026-07-07',
        selectedTagIds: ['tag1', 'tag2']
      };
      const result = transactionSchema.safeParse(transactionData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.amount).toBe(45.99);
        expect(result.data.selectedTagIds).toEqual(['tag1', 'tag2']);
      }
    });

    it('should fill defaults for selectedTagIds', () => {
      const transactionData = {
        type: 'income',
        amount: '1000',
        accountId: 'acc-1',
        date: '2026-07-07'
      };
      const result = transactionSchema.safeParse(transactionData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.selectedTagIds).toEqual([]);
      }
    });

    it('should fail if amount is <= 0', () => {
      const transactionData = {
        type: 'expense',
        amount: '-1.50',
        accountId: 'acc-1',
        date: '2026-07-07'
      };
      const result = transactionSchema.safeParse(transactionData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Le montant doit être supérieur à 0');
      }
    });
  });

  describe('budgetSchema', () => {
    it('should validate a correct budget and transform amount', () => {
      const budgetData = {
        name: 'Alimentation',
        amount: '300.00',
        categoryId: 'cat-1',
        color: '#ff0000',
        period: 'monthly'
      };
      const result = budgetSchema.safeParse(budgetData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.amount).toBe(300.00);
      }
    });

    it('should fail if budget amount is <= 0', () => {
      const budgetData = {
        name: 'Alimentation',
        amount: '0',
        categoryId: 'cat-1',
        color: '#ff0000',
        period: 'monthly'
      };
      const result = budgetSchema.safeParse(budgetData);
      expect(result.success).toBe(false);
    });

    it('should fail if period is invalid', () => {
      const budgetData = {
        name: 'Alimentation',
        amount: '100',
        categoryId: 'cat-1',
        color: '#ff0000',
        period: 'daily'
      };
      const result = budgetSchema.safeParse(budgetData);
      expect(result.success).toBe(false);
    });
  });

  describe('categorySchema', () => {
    it('should validate correct category and apply defaults', () => {
      const categoryData = {
        name: 'Loisirs',
        type: 'expense'
      };
      const result = categorySchema.safeParse(categoryData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.icon).toBe('📒');
        expect(result.data.color).toBe('#8b5cf6');
      }
    });

    it('should fail if name exceeds 30 characters', () => {
      const categoryData = {
        name: 'a'.repeat(31),
        type: 'expense'
      };
      const result = categorySchema.safeParse(categoryData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Le nom ne peut pas dépasser 30 caractères');
      }
    });
  });

  describe('savingsGoalSchema', () => {
    it('should validate and transform correct savings goal', () => {
      const savingsGoal = {
        name: 'Voyage Japon',
        targetAmount: '5000',
        targetDate: '2027-12-31'
      };
      const result = savingsGoalSchema.safeParse(savingsGoal);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.targetAmount).toBe(5000);
        expect(result.data.icon).toBe('🎯');
        expect(result.data.color).toBe('#3b82f6');
      }
    });

    it('should fail if targetAmount is <= 0', () => {
      const savingsGoal = {
        name: 'Voyage',
        targetAmount: '-50',
        targetDate: '2027-12-31'
      };
      const result = savingsGoalSchema.safeParse(savingsGoal);
      expect(result.success).toBe(false);
    });
  });

  describe('savingsActionSchema', () => {
    it('should validate and transform correct savings action', () => {
      const action = {
        amount: '150.00',
        accountId: 'acc-1',
        date: '2026-07-07'
      };
      const result = savingsActionSchema.safeParse(action);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.amount).toBe(150.00);
      }
    });

    it('should fail if amount is negative', () => {
      const action = {
        amount: '-150',
        accountId: 'acc-1',
        date: '2026-07-07'
      };
      const result = savingsActionSchema.safeParse(action);
      expect(result.success).toBe(false);
    });
  });

  describe('scheduledSchema', () => {
    it('should validate and transform correct scheduled transaction', () => {
      const data = {
        type: 'expense',
        amount: '30.00',
        accountId: 'acc-1',
        description: 'Abonnement Netflix',
        frequencyEvery: 1,
        frequencyUnit: 'month',
        startDate: '2026-07-07',
        autoConfirm: true,
        isSubscription: true
      };
      const result = scheduledSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.amount).toBe(30.00);
        expect(result.data.frequencyEvery).toBe(1);
      }
    });

    it('should fail if frequencyEvery is <= 0', () => {
      const data = {
        type: 'expense',
        amount: '30.00',
        accountId: 'acc-1',
        description: 'Abonnement Netflix',
        frequencyEvery: 0,
        frequencyUnit: 'month',
        startDate: '2026-07-07',
        autoConfirm: true,
        isSubscription: true
      };
      const result = scheduledSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should fail if frequencyUnit is invalid', () => {
      const data = {
        type: 'expense',
        amount: '30.00',
        accountId: 'acc-1',
        description: 'Netflix',
        frequencyEvery: 1,
        frequencyUnit: 'minute',
        startDate: '2026-07-07',
        autoConfirm: true,
        isSubscription: true
      };
      const result = scheduledSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });
});
