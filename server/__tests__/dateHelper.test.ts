import { describe, it, expect } from 'vitest';
import { calculateNextDate } from '../utils/dateHelper';

describe('dateHelper unit tests', () => {
  it('should correctly increment days', () => {
    const startDate = new Date('2026-01-01T00:00:00.000Z');
    const next = calculateNextDate(startDate, 5, 1, 'day');
    expect(next.toISOString().startsWith('2026-01-06')).toBe(true);
  });

  it('should correctly increment weeks', () => {
    const startDate = new Date('2026-01-01T00:00:00.000Z');
    const next = calculateNextDate(startDate, 2, 1, 'week');
    expect(next.toISOString().startsWith('2026-01-15')).toBe(true);
  });

  it('should handle month increments with clamp for leap years or shorter months', () => {
    const startDate = new Date('2026-01-31T00:00:00.000Z');
    const febNext = calculateNextDate(startDate, 1, 1, 'month');
    // February 2026 has 28 days
    expect(febNext.getUTCMonth()).toBe(1); // 0-indexed February
    expect(febNext.getUTCDate()).toBe(28);
  });

  it('should handle yearly increments', () => {
    const startDate = new Date('2024-02-29T00:00:00.000Z'); // Leap year
    const nextYear = calculateNextDate(startDate, 1, 1, 'year');
    // 2025 is not a leap year, capped at Feb 28
    expect(nextYear.getUTCFullYear()).toBe(2025);
    expect(nextYear.getUTCMonth()).toBe(1);
    expect(nextYear.getUTCDate()).toBe(28);
  });
});
