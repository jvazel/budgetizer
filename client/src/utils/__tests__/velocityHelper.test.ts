import { describe, it, expect } from 'vitest';
import {
  getDaysRemaining,
  getTargetVelocity,
  getActualVelocity,
  getDepletionDate
} from '../velocityHelper';

describe('velocityHelper', () => {
  describe('getDaysRemaining', () => {
    it('calculates remaining days correctly at the start of a 30-day month (April)', () => {
      const today = new Date(2026, 3, 1); // 1er Avril 2026
      expect(getDaysRemaining(today)).toBe(30);
    });

    it('calculates remaining days correctly on the last day of a 31-day month (December)', () => {
      const today = new Date(2026, 11, 31); // 31 Décembre 2026
      expect(getDaysRemaining(today)).toBe(1);
    });

    it('handles normal February (28 days) correctly', () => {
      const today = new Date(2025, 1, 15); // 15 Février 2025 (non bissextile)
      // 28 - 15 + 1 = 14
      expect(getDaysRemaining(today)).toBe(14);
    });

    it('handles leap year February (29 days) correctly', () => {
      const today = new Date(2028, 1, 15); // 15 Février 2028 (bissextile)
      // 29 - 15 + 1 = 15
      expect(getDaysRemaining(today)).toBe(15);
    });
  });

  describe('getTargetVelocity', () => {
    it('calculates normal target velocity correctly', () => {
      expect(getTargetVelocity(150, 15)).toBe(10);
    });

    it('returns 0 when remaining budget is 0 or negative', () => {
      expect(getTargetVelocity(0, 10)).toBe(0);
      expect(getTargetVelocity(-50, 10)).toBe(0);
    });

    it('returns 0 when remaining days is 0 or negative', () => {
      expect(getTargetVelocity(100, 0)).toBe(0);
      expect(getTargetVelocity(100, -5)).toBe(0);
    });
  });

  describe('getActualVelocity', () => {
    it('calculates normal actual velocity correctly', () => {
      expect(getActualVelocity(140, 7)).toBe(20);
    });

    it('returns 0 if daysCount is 0 or negative', () => {
      expect(getActualVelocity(100, 0)).toBe(0);
      expect(getActualVelocity(100, -2)).toBe(0);
    });
  });

  describe('getDepletionDate', () => {
    it('calculates depletion date correctly with integers', () => {
      const today = new Date(2026, 5, 10); // 10 Juin 2026
      const remainingBudget = 100;
      const actualVelocity = 25; // 4 jours avant crash
      
      const res = getDepletionDate(remainingBudget, actualVelocity, today);
      expect(res?.getDate()).toBe(14); // 10 + 4 = 14 Juin
      expect(res?.getMonth()).toBe(5);
    });

    it('rounds up the remaining days to depletion using Math.ceil', () => {
      const today = new Date(2026, 5, 10); // 10 Juin 2026
      const remainingBudget = 100;
      const actualVelocity = 30; // 100 / 30 = 3.33 -> 4 jours arrondis supérieur
      
      const res = getDepletionDate(remainingBudget, actualVelocity, today);
      expect(res?.getDate()).toBe(14); // 10 + 4 = 14 Juin
    });

    it('returns null if budget is already exhausted or negative', () => {
      const today = new Date(2026, 5, 10);
      expect(getDepletionDate(0, 20, today)).toBeNull();
      expect(getDepletionDate(-10, 20, today)).toBeNull();
    });

    it('returns null if actual velocity is 0 or negative', () => {
      const today = new Date(2026, 5, 10);
      expect(getDepletionDate(100, 0, today)).toBeNull();
      expect(getDepletionDate(100, -5, today)).toBeNull();
    });
  });
});
