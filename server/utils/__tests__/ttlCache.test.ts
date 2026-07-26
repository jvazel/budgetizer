import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TtlCache } from '../ttlCache';

describe('TtlCache', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should set and get values correctly', () => {
    const cache = new TtlCache(1000, 10);
    cache.set('key1', 'value1');
    expect(cache.get('key1')).toBe('value1');
  });

  it('should return null for non-existing keys', () => {
    const cache = new TtlCache(1000, 10);
    expect(cache.get('unknown')).toBeNull();
  });

  it('should evict expired items and return null', () => {
    const cache = new TtlCache(1000, 10);
    cache.set('key1', 'value1');
    
    // Advance time by 900ms (not yet expired)
    vi.advanceTimersByTime(900);
    expect(cache.get('key1')).toBe('value1');

    // Advance time by another 200ms (expired)
    vi.advanceTimersByTime(200);
    expect(cache.get('key1')).toBeNull();
  });

  it('should evict oldest items (FIFO) when cache is full', () => {
    const cache = new TtlCache(1000, 3); // Max size of 3
    cache.set('k1', 'v1');
    cache.set('k2', 'v2');
    cache.set('k3', 'v3');

    expect(cache.get('k1')).toBe('v1');

    // Set k4, should evict k1 (the first/oldest item)
    cache.set('k4', 'v4');
    expect(cache.get('k1')).toBeNull();
    expect(cache.get('k2')).toBe('v2');
    expect(cache.get('k3')).toBe('v3');
    expect(cache.get('k4')).toBe('v4');
  });

  it('should delete keys correctly', () => {
    const cache = new TtlCache(1000, 10);
    cache.set('key1', 'value1');
    cache.delete('key1');
    expect(cache.get('key1')).toBeNull();
  });

  it('should clear the cache correctly', () => {
    const cache = new TtlCache(1000, 10);
    cache.set('k1', 'v1');
    cache.set('k2', 'v2');
    cache.clear();
    expect(cache.get('k1')).toBeNull();
    expect(cache.get('k2')).toBeNull();
  });
});
