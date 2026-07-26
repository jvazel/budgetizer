/**
 * Simple in-memory Cache with TTL and Max Size limits.
 * Prevents memory leaks by automatically deleting expired entries
 * and evicting the oldest entries when the cache is full.
 */
export class TtlCache {
  private cache: Map<string, { value: unknown; expiresAt: number }>;
  private ttlMs: number;
  private maxSize: number;

  constructor(ttlMs = 120000, maxSize = 1000) {
    this.cache = new Map();
    this.ttlMs = ttlMs;
    this.maxSize = maxSize;
   }

  get(key: string): unknown {
    const item = this.cache.get(key);
    if (!item) return null;

      // Check if expired
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
      }

    return item.value;
   }

  set(key: string, value: unknown): void {
      // Prevent memory growth by capping max size (FIFO-like eviction)
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
       }
      }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + this.ttlMs
      });
   }

  delete(key: string): void {
    this.cache.delete(key);
   }

  clear(): void {
    this.cache.clear();
   }
}