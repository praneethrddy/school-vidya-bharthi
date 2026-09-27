// TODO: Configure actual Redis cache when available
// Using in-memory cache with DB fallback pattern

interface CacheEntry<T> {
  value: T
  expiry: number
}

const memoryCache = new Map<string, CacheEntry<unknown>>()

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    // Try Redis first (mock)
    const { redis } = await import('./redis')
    const value = await redis.get(key)
    if (value) {
      return JSON.parse(value) as T
    }
  } catch {
    // Fallback to memory cache
  }

  const entry = memoryCache.get(key) as CacheEntry<T> | undefined
  if (entry && entry.expiry > Date.now()) {
    return entry.value
  }
  if (entry) {
    memoryCache.delete(key)
  }
  return null
}

export async function cacheSet<T>(key: string, value: T, ttlSeconds = 3600): Promise<void> {
  try {
    const { redis } = await import('./redis')
    await redis.set(key, JSON.stringify(value), ttlSeconds)
  } catch {
    // Fallback to memory cache
    memoryCache.set(key, { value, expiry: Date.now() + ttlSeconds * 1000 })
  }
}

export async function cacheDel(key: string): Promise<void> {
  try {
    const { redis } = await import('./redis')
    await redis.del(key)
  } catch {
    memoryCache.delete(key)
  }
}

export async function cacheInvalidate(pattern: string): Promise<void> {
  // TODO: Implement pattern-based invalidation with Redis
  // For now, clear matching memory cache entries
  for (const key of memoryCache.keys()) {
    if (key.includes(pattern)) {
      memoryCache.delete(key)
    }
  }
}
