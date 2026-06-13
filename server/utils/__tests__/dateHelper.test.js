import { describe, it, expect } from 'vitest';
import { calculateNextDate } from '../dateHelper.js';

describe('calculateNextDate Utility', () => {
  describe('Standard frequencies (Days & Weeks)', () => {
    it('should calculate next date by adding days', () => {
      const start = new Date(Date.UTC(2026, 0, 15)); // 15 Jan 2026
      
      const next = calculateNextDate(start, 1, 3, 'day'); // 1 step of 3 days
      expect(next.getUTCDate()).toBe(18);
      expect(next.getUTCMonth()).toBe(0); // Jan
      
      const nextMultiple = calculateNextDate(start, 5, 2, 'day'); // 5 steps of 2 days = 10 days
      expect(nextMultiple.getUTCDate()).toBe(25);
      expect(nextMultiple.getUTCMonth()).toBe(0);
    });

    it('should calculate next date by adding weeks', () => {
      const start = new Date(Date.UTC(2026, 0, 15)); // 15 Jan 2026
      
      const next = calculateNextDate(start, 1, 1, 'week'); // 1 step of 1 week
      expect(next.getUTCDate()).toBe(22);
      expect(next.getUTCMonth()).toBe(0);
      
      const nextMultiple = calculateNextDate(start, 3, 2, 'week'); // 3 steps of 2 weeks = 6 weeks = 42 days
      // Jan 15 + 42 days = Feb 26 (Jan has 31 days. 31 - 15 = 16 days left in Jan. 42 - 16 = 26 days in Feb)
      expect(nextMultiple.getUTCDate()).toBe(26);
      expect(nextMultiple.getUTCMonth()).toBe(1); // Feb
    });
  });

  describe('Month-End Drift Prevention (31st day)', () => {
    it('should handle recurrence starting on the 31st of January correctly', () => {
      const start = new Date(Date.UTC(2026, 0, 31)); // 31 Jan 2026 (Jan has 31 days)

      // Step 1: February (should cap at 28th since Feb 2026 has 28 days)
      const nextFeb = calculateNextDate(start, 1, 1, 'month');
      expect(nextFeb.getUTCDate()).toBe(28);
      expect(nextFeb.getUTCMonth()).toBe(1); // Feb
      expect(nextFeb.getUTCFullYear()).toBe(2026);

      // Step 2: March (should return to 31st since March has 31 days)
      const nextMar = calculateNextDate(start, 2, 1, 'month');
      expect(nextMar.getUTCDate()).toBe(31);
      expect(nextMar.getUTCMonth()).toBe(2); // March
      expect(nextMar.getUTCFullYear()).toBe(2026);

      // Step 3: April (should cap at 30th since April has 30 days)
      const nextApr = calculateNextDate(start, 3, 1, 'month');
      expect(nextApr.getUTCDate()).toBe(30);
      expect(nextApr.getUTCMonth()).toBe(3); // April
      expect(nextApr.getUTCFullYear()).toBe(2026);
    });

    it('should handle recurrence starting on the 30th of a month correctly', () => {
      const start = new Date(Date.UTC(2026, 2, 30)); // 30 March 2026

      // Step 1: April (April has 30 days, should be 30th)
      const nextApr = calculateNextDate(start, 1, 1, 'month');
      expect(nextApr.getUTCDate()).toBe(30);
      expect(nextApr.getUTCMonth()).toBe(3); // April

      // Step 2: May (May has 31 days, should be 30th)
      const nextMay = calculateNextDate(start, 2, 1, 'month');
      expect(nextMay.getUTCDate()).toBe(30);
      expect(nextMay.getUTCMonth()).toBe(4); // May
    });
  });

  describe('Leap Year Calculations (29th of February)', () => {
    it('should handle yearly recurrence starting on leap day correctly', () => {
      const start = new Date(Date.UTC(2024, 1, 29)); // 29 Feb 2024 (Leap year)

      // Year 1 (2025: non-leap, should cap at 28 Feb)
      const nextYear1 = calculateNextDate(start, 1, 1, 'year');
      expect(nextYear1.getUTCDate()).toBe(28);
      expect(nextYear1.getUTCMonth()).toBe(1); // Feb
      expect(nextYear1.getUTCFullYear()).toBe(2025);

      // Year 4 (2028: leap year, should return to 29 Feb)
      const nextYear4 = calculateNextDate(start, 4, 1, 'year');
      expect(nextYear4.getUTCDate()).toBe(29);
      expect(nextYear4.getUTCMonth()).toBe(1); // Feb
      expect(nextYear4.getUTCFullYear()).toBe(2028);
    });
  });
});
