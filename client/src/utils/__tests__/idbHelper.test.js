import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getCacheValue, setCacheValue, deleteCacheValue, getOutbox, addToOutbox } from '../idbHelper';

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
});
