type RedisEntry = {
  value: string
  expiresAtMs: number | null
}

type RedisFailureState = {
  get: boolean
  set: boolean
}

const redisStore = new Map<string, RedisEntry>()
const failureState: RedisFailureState = {
  get: false,
  set: false,
}

function isExpired(entry: RedisEntry): boolean {
  return entry.expiresAtMs !== null && Date.now() > entry.expiresAtMs
}

function assertNoFailure(method: 'get' | 'set'): void {
  if (failureState[method]) {
    throw new Error(`Mock Redis ${method.toUpperCase()} failure`)
  }
}

export const redisMock = {
  async get(key: string): Promise<string | null> {
    assertNoFailure('get')
    const entry = redisStore.get(key)
    if (!entry) {
      return null
    }
    if (isExpired(entry)) {
      redisStore.delete(key)
      return null
    }
    return entry.value
  },

  async set(key: string, value: string, ttlSeconds?: number): Promise<'OK'> {
    assertNoFailure('set')
    const expiresAtMs = typeof ttlSeconds === 'number' ? Date.now() + ttlSeconds * 1000 : null
    redisStore.set(key, { value, expiresAtMs })
    return 'OK'
  },

  async del(key: string): Promise<number> {
    return redisStore.delete(key) ? 1 : 0
  },

  async exists(key: string): Promise<number> {
    const value = await this.get(key)
    return value === null ? 0 : 1
  },

  async expire(key: string, ttlSeconds: number): Promise<number> {
    const entry = redisStore.get(key)
    if (!entry) {
      return 0
    }
    entry.expiresAtMs = Date.now() + ttlSeconds * 1000
    redisStore.set(key, entry)
    return 1
  },
}

export function setRedisFailure(options: Partial<RedisFailureState>): void {
  failureState.get = options.get ?? false
  failureState.set = options.set ?? false
}

export function resetRedisFailure(): void {
  failureState.get = false
  failureState.set = false
}

export function resetRedisMock(): void {
  redisStore.clear()
  resetRedisFailure()
}
