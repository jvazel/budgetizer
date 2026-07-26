import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import StructuredLogger from '../logger';

describe('StructuredLogger', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('serializes Error objects in context properly with name, message, and stack', () => {
    const logger = new StructuredLogger();
    const testError = new Error('Database query failed');

    logger.error('An error occurred', { error: testError });

    expect(consoleSpy).toHaveBeenCalled();
    const loggedJson = JSON.parse(consoleSpy.mock.calls[0][0]);

    expect(loggedJson.level).toBe('ERROR');
    expect(loggedJson.message).toBe('An error occurred');
    expect(loggedJson.context.error).toBeDefined();
    expect(loggedJson.context.error.name).toBe('Error');
    expect(loggedJson.context.error.message).toBe('Database query failed');
    expect(loggedJson.context.error.stack).toBeDefined();
  });
});
