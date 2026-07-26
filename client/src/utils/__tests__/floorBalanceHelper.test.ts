import { describe, it, expect } from 'vitest';
import {
  getEstimatedPaycheckDate,
  calculateFloorBalance,
  calculateFloorProjection
} from '../floorBalanceHelper';

describe('floorBalanceHelper', () => {
  describe('getEstimatedPaycheckDate', () => {
    it('uses user configured day if provided and today is before that day', () => {
      const today = new Date(2026, 5, 10); // 10 Juin 2026
      const res = getEstimatedPaycheckDate(today, [], 25);
      expect(res.getDate()).toBe(25);
      expect(res.getMonth()).toBe(5); // Juin
    });

    it('uses user configured day for next month if today is after that day', () => {
      const today = new Date(2026, 5, 26); // 26 Juin 2026
      const res = getEstimatedPaycheckDate(today, [], 25);
      expect(res.getDate()).toBe(25);
      expect(res.getMonth()).toBe(6); // Juillet
    });

    it('handles user configured day edge case like 31st for a 30-day month (April)', () => {
      const today = new Date(2026, 3, 10); // 10 Avril 2026
      const res = getEstimatedPaycheckDate(today, [], 31);
      // April has 30 days, so should return April 30th
      expect(res.getDate()).toBe(30);
      expect(res.getMonth()).toBe(3); // Avril
    });

    it('detects next paycheck based on the largest upcoming income', () => {
      const today = new Date(2026, 5, 10); // 10 Juin 2026
      const upcomingIncomes = [
        { _id: 'inc1', type: 'income', amount: 100, date: new Date(2026, 5, 15) },
        { _id: 'inc2', type: 'income', amount: 2500, date: new Date(2026, 5, 20) }, // Revenu majeur
        { _id: 'inc3', type: 'income', amount: 50, date: new Date(2026, 5, 22) }
      ];
      const res = getEstimatedPaycheckDate(today, upcomingIncomes, 'auto');
      expect(res.getDate()).toBe(20);
      expect(res.getMonth()).toBe(5); // Juin
    });

    it('falls back to 25th of current month by default if today is before the 25th', () => {
      const today = new Date(2026, 5, 12); // 12 Juin 2026
      const res = getEstimatedPaycheckDate(today, [], null);
      expect(res.getDate()).toBe(25);
      expect(res.getMonth()).toBe(5);
    });

    it('falls back to 1st of next month by default if today is on or after the 25th', () => {
      const today = new Date(2026, 5, 26); // 26 Juin 2026
      const res = getEstimatedPaycheckDate(today, [], null);
      expect(res.getDate()).toBe(1);
      expect(res.getMonth()).toBe(6); // Juillet
    });
  });

  describe('calculateFloorBalance', () => {
    it('returns actual balance if next paycheck date is null', () => {
      const res = calculateFloorBalance(1500, new Date(), [], null);
      expect(res).toBe(1500);
    });

    it('deducts expenses within the window (today <= date < nextPaycheck)', () => {
      const today = new Date(2026, 5, 10); // 10 Juin 2026
      const nextPaycheck = new Date(2026, 5, 25); // 25 Juin 2026
      
      const upcomingExpenses = [
        { _id: 'exp1', type: 'expense', amount: 100, date: new Date(2026, 5, 12) }, // In
        { _id: 'exp2', type: 'expense', amount: 200, date: new Date(2026, 5, 24) }, // In
        { _id: 'exp3', type: 'expense', amount: 300, date: new Date(2026, 5, 25) }, // Out (exactly on paycheck date)
        { _id: 'exp4', type: 'expense', amount: 400, date: new Date(2026, 5, 8) }    // Out (before today)
      ];

      const res = calculateFloorBalance(1500, today, upcomingExpenses, nextPaycheck);
      // 1500 - 100 - 200 = 1200
      expect(res).toBe(1200);
    });

    it('ignores excluded expenses', () => {
      const today = new Date(2026, 5, 10);
      const nextPaycheck = new Date(2026, 5, 25);
      
      const upcomingExpenses = [
        { _id: 'exp1', type: 'expense', amount: 100, date: new Date(2026, 5, 12) }, // Excluded
        { _id: 'exp2', type: 'expense', amount: 200, date: new Date(2026, 5, 24) }  // Included
      ];

      const res = calculateFloorBalance(1500, today, upcomingExpenses, nextPaycheck, ['exp1']);
      // 1500 - 200 = 1300
      expect(res).toBe(1300);
    });
  });

  describe('calculateFloorProjection', () => {
    it('generates a 30-day projection array with correct daily adjustments', () => {
      const today = new Date(2026, 5, 10); // 10 Juin 2026
      const upcomingTransactions = [
        { _id: 'tx1', type: 'expense', amount: 50, date: new Date(2026, 5, 11) },
        { _id: 'tx2', type: 'income', amount: 1000, date: new Date(2026, 5, 20) },
        { _id: 'tx3', type: 'expense', amount: 100, date: new Date(2026, 5, 20) }, // Excluded later
        { _id: 'tx4', type: 'expense', amount: 200, date: new Date(2026, 5, 25) }
      ];

      const points = calculateFloorProjection(1000, today, upcomingTransactions, ['tx3']);
      expect(points.length).toBe(30);

      // Day 0: 10 Juin -> Balance = 1000
      expect(points[0]?.balance).toBe(1000);
      
      // Day 1: 11 Juin -> Balance = 1000 - 50 = 950
      expect(points[1]?.balance).toBe(950);

      // Day 10: 20 Juin -> Balance = 950 + 1000 = 1950 (tx3 is excluded)
      expect(points[10]?.balance).toBe(1950);

      // Day 15: 25 Juin -> Balance = 1950 - 200 = 1750
      expect(points[15]?.balance).toBe(1750);
      
      // Day 29: 9 Juillet -> Balance = 1750
      expect(points[29]?.balance).toBe(1750);
    });
  });
});
