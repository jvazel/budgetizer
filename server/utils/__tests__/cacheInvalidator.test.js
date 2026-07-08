import { vi, describe, it, expect, beforeEach } from 'vitest';
import { invalidateMonthlyReport } from '../cacheInvalidator';
import MonthlyReport from '../../models/MonthlyReport';

vi.mock('../../models/MonthlyReport.js', () => ({
  default: {
    deleteOne: vi.fn()
  }
}));

describe('cacheInvalidator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should delete report with correct monthKey for a valid date', async () => {
    MonthlyReport.deleteOne.mockResolvedValue({ deletedCount: 1 });

    await invalidateMonthlyReport('user123', '2026-07-15');

    expect(MonthlyReport.deleteOne).toHaveBeenCalledWith({
      userId: 'user123',
      monthKey: '2026-07'
    });
  });

  it('should format monthKey correctly for single digit months (e.g., March)', async () => {
    MonthlyReport.deleteOne.mockResolvedValue({ deletedCount: 1 });

    await invalidateMonthlyReport('user123', new Date(Date.UTC(2026, 2, 10))); // Month index 2 is March

    expect(MonthlyReport.deleteOne).toHaveBeenCalledWith({
      userId: 'user123',
      monthKey: '2026-03'
    });
  });

  it('should return early and do nothing if date is invalid', async () => {
    await invalidateMonthlyReport('user123', 'invalid-date-string');

    expect(MonthlyReport.deleteOne).not.toHaveBeenCalled();
  });

  it('should handle errors thrown by deleteOne without throwing/crashing', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    MonthlyReport.deleteOne.mockRejectedValue(new Error('DB Connection Failed'));

    await expect(invalidateMonthlyReport('user123', '2026-07-15')).resolves.not.toThrow();

    expect(MonthlyReport.deleteOne).toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalled();
    
    consoleErrorSpy.mockRestore();
  });
});
