// TODO: Implement Redis-based rate limiting
// Using in-memory sliding window counter for development

interface RateLimitEntry {
  timestamps: number[]
}

const store = new Map<string, RateLimitEntry>()

interface RateLimitConfig {
  windowMs: number
  maxRequests: number
}

const defaultLimits: Record<string, RateLimitConfig> = {
  public: { windowMs: 60_000, maxRequests: 30 },
  authenticated: { windowMs: 60_000, maxRequests: 120 },
  login: { windowMs: 15 * 60_000, maxRequests: 5 },
  upload: { windowMs: 60_000, maxRequests: 10 },
  contact: { windowMs: 60 * 60_000, maxRequests: 5 },
}

export async function checkRateLimit(
  key: string,
  tier: keyof typeof defaultLimits = 'public'
): Promise<{ allowed: boolean; retryAfter?: number; remaining: number }> {
  const config = defaultLimits[tier]
  const now = Date.now()
  const entry = store.get(key) || { timestamps: [] }

  // Remove expired timestamps
  entry.timestamps = entry.timestamps.filter((ts) => now - ts < config.windowMs)

  if (entry.timestamps.length >= config.maxRequests) {
    const oldestInWindow = entry.timestamps[0]
    const retryAfter = Math.ceil((oldestInWindow + config.windowMs - now) / 1000)
    store.set(key, entry)
    return { allowed: false, retryAfter, remaining: 0 }
  }

  entry.timestamps.push(now)
  store.set(key, entry)
  return { allowed: true, remaining: config.maxRequests - entry.timestamps.length }
}

export function getRateLimitHeaders(
  remaining: number,
  retryAfter?: number
): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Remaining': String(remaining),
  }
  if (retryAfter) {
    headers['Retry-After'] = String(retryAfter)
  }
  return headers
}

export function resetRateLimitStore(): void {
  store.clear()
}
