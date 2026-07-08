import { describe, it, expect } from 'vitest';
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema
} from '../authValidators';

describe('Auth Validators', () => {
  describe('loginSchema', () => {
    it('should validate a correct login', () => {
      const validLogin = {
        email: 'user@example.com',
        password: 'password123'
      };
      const result = loginSchema.safeParse(validLogin);
      expect(result.success).toBe(true);
    });

    it('should fail if email is empty', () => {
      const invalid = { email: '', password: 'password123' };
      const result = loginSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("L'email est requis");
      }
    });

    it('should fail if email is invalid', () => {
      const invalid = { email: 'invalid-email', password: 'password123' };
      const result = loginSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Email invalide');
      }
    });

    it('should fail if password is empty', () => {
      const invalid = { email: 'user@example.com', password: '' };
      const result = loginSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Le mot de passe est requis');
      }
    });
  });

  describe('registerSchema', () => {
    it('should validate a correct registration', () => {
      const validRegister = {
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: 'Password123',
        confirmPassword: 'Password123'
      };
      const result = registerSchema.safeParse(validRegister);
      expect(result.success).toBe(true);
    });

    it('should fail if name is less than 2 characters', () => {
      const invalid = {
        name: 'J',
        email: 'jane@example.com',
        password: 'Password123',
        confirmPassword: 'Password123'
      };
      const result = registerSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Le nom doit contenir au moins 2 caractères');
      }
    });

    it('should fail if name is greater than 50 characters', () => {
      const invalid = {
        name: 'a'.repeat(51),
        email: 'jane@example.com',
        password: 'Password123',
        confirmPassword: 'Password123'
      };
      const result = registerSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Le nom ne peut pas dépasser 50 caractères');
      }
    });

    it('should fail if password is less than 6 characters', () => {
      const invalid = {
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: 'Pa1',
        confirmPassword: 'Pa1'
      };
      const result = registerSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Le mot de passe doit contenir au moins 6 caractères');
      }
    });

    it('should fail if password has no uppercase letter', () => {
      const invalid = {
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: 'password123',
        confirmPassword: 'password123'
      };
      const result = registerSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should fail if password has no lowercase letter', () => {
      const invalid = {
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: 'PASSWORD123',
        confirmPassword: 'PASSWORD123'
      };
      const result = registerSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should fail if password has no number', () => {
      const invalid = {
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: 'Password',
        confirmPassword: 'Password'
      };
      const result = registerSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should fail if confirmPassword does not match password', () => {
      const invalid = {
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: 'Password123',
        confirmPassword: 'Password456'
      };
      const result = registerSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Les mots de passe ne correspondent pas');
        expect(result.error.issues[0].path).toEqual(['confirmPassword']);
      }
    });
  });

  describe('forgotPasswordSchema', () => {
    it('should validate a correct forgot password email request', () => {
      const valid = { email: 'user@example.com' };
      const result = forgotPasswordSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should fail on invalid email', () => {
      const invalid = { email: 'invalid-email' };
      const result = forgotPasswordSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('resetPasswordSchema', () => {
    it('should validate a correct reset password request', () => {
      const valid = {
        password: 'NewPassword123',
        confirmPassword: 'NewPassword123'
      };
      const result = resetPasswordSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should fail if password fails complexity requirements', () => {
      const invalid = {
        password: '123',
        confirmPassword: '123'
      };
      const result = resetPasswordSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should fail if confirmPassword does not match password', () => {
      const invalid = {
        password: 'NewPassword123',
        confirmPassword: 'DifferentPassword123'
      };
      const result = resetPasswordSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Les mots de passe ne correspondent pas');
      }
    });
  });
});
