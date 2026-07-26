import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getCacheValue, getOutbox, generateIdempotencyKey } from '../idbHelper';

describe('idbHelper', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('gracefully returns undefined for missing keys or if IndexedDB is not fully initialized', async () => {
    const val = await getCacheValue('non-existent-key');
    expect(val).toBeUndefined();
  });

  it('gracefully returns an empty array for getOutbox if IndexedDB is not fully initialized', async () => {
    const outbox = await getOutbox();
    expect(outbox).toEqual([]);
  });

  describe('generateIdempotencyKey', () => {
    it('generates a 32-character SHA-256 hex string idempotency key', async () => {
      const key = await generateIdempotencyKey('POST', '/api/transactions', { amount: 50 });
      expect(typeof key).toBe('string');
      expect(key.length).toBe(32);
    });

    it('produces identical keys for identical requests (deterministic hashing)', async () => {
      const key1 = await generateIdempotencyKey('POST', '/api/transactions', { amount: 50, category: 'food' });
      const key2 = await generateIdempotencyKey('POST', '/api/transactions', { amount: 50, category: 'food' });
      expect(key1).toBe(key2);
    });

    it('produces different keys for different endpoints or payloads', async () => {
      const key1 = await generateIdempotencyKey('POST', '/api/transactions', { amount: 50 });
      const key2 = await generateIdempotencyKey('POST', '/api/transactions', { amount: 100 });
      expect(key1).not.toBe(key2);
    });
  });
});

