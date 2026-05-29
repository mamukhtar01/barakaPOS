/**
 * Lightweight browser localStorage cache with TTL.
 * All functions are SSR-safe (no-ops on the server).
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const PREFIX = "bpos_";

function isClient(): boolean {
  return typeof window !== "undefined";
}

/**
 * Read a value from cache. Returns null if missing or expired.
 * @param key   Cache key (prefix is added automatically)
 * @param ttlMs Maximum age in milliseconds
 */
export function getCache<T>(key: string, ttlMs: number): T | null {
  if (!isClient()) return null;
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry<T>;
    if (Date.now() - entry.timestamp > ttlMs) return null;
    return entry.data;
  } catch {
    return null;
  }
}

/**
 * Write a value to cache with the current timestamp.
 */
export function setCache<T>(key: string, data: T): void {
  if (!isClient()) return;
  try {
    const entry: CacheEntry<T> = { data, timestamp: Date.now() };
    localStorage.setItem(PREFIX + key, JSON.stringify(entry));
  } catch {
    // localStorage may be full or unavailable — silently ignore
  }
}

/**
 * Remove a specific cache entry so the next read triggers a fresh fetch.
 */
export function invalidateCache(key: string): void {
  if (!isClient()) return;
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    // ignore
  }
}
