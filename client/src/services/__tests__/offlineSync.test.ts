import { describe, it, expect } from 'vitest';
import { generateIdempotencyKey } from '../../utils/idbHelper';
import { forceSyncNow } from '../offlineSync';

describe('Offline Sync Helpers', () => {
  it('generates deterministic SHA-256 idempotency keys for identical requests', async () => {
    const key1 = await generateIdempotencyKey('POST', '/transactions', { amount: 50 });
    const key2 = await generateIdempotencyKey('POST', '/transactions', { amount: 50 });
    const key3 = await generateIdempotencyKey('POST', '/transactions', { amount: 100 });

    expect(key1).toBe(key2);
    expect(key1).not.toBe(key3);
    expect(key1).toHaveLength(32);
  });

  it('exposes forceSyncNow function without throwing when uninitialized', async () => {
    await expect(forceSyncNow()).resolves.toBeUndefined();
  });
});

