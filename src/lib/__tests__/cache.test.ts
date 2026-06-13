import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  redisGet: vi.fn(),
  redisSet: vi.fn(),
  redisDel: vi.fn(),
}))

vi.mock('../redis', () => ({
  redis: {
    get: mocks.redisGet,
    set: mocks.redisSet,
    del: mocks.redisDel,
  },
}))

import { cacheDel, cacheGet, cacheInvalidate, cacheSet } from '../cache'

describe('cache', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  it('TEST-CACHE-001 cache set/get/del/invalidate works in redis and memory fallback paths', async () => {
    const redisKey = 'cross-cutting:redis:key'
    await cacheSet(redisKey, { ok: true }, 120)
    expect(mocks.redisSet).toHaveBeenCalledWith(redisKey, JSON.stringify({ ok: true }), 120)

    mocks.redisGet.mockResolvedValueOnce(JSON.stringify({ ok: true }))
    await expect(cacheGet<{ ok: boolean }>(redisKey)).resolves.toEqual({ ok: true })

    await cacheDel(redisKey)
    expect(mocks.redisDel).toHaveBeenCalledWith(redisKey)

    const memoryKey = 'cross-cutting:memory:key'
    mocks.redisSet.mockRejectedValueOnce(new Error('Redis unavailable'))
    await cacheSet(memoryKey, { ok: 'fallback' }, 60)

    mocks.redisGet.mockRejectedValueOnce(new Error('Redis unavailable'))
    await expect(cacheGet<{ ok: string }>(memoryKey)).resolves.toEqual({ ok: 'fallback' })

    await cacheInvalidate('cross-cutting:memory:')
    mocks.redisGet.mockRejectedValueOnce(new Error('Redis unavailable'))
    await expect(cacheGet(memoryKey)).resolves.toBeNull()
  })

  it('TEST-CACHE-002 redis down gracefully falls back to in-memory cache for get and delete', async () => {
    const key = 'cross-cutting:fallback:delete'
    mocks.redisSet.mockRejectedValueOnce(new Error('Redis down'))
    await cacheSet(key, { value: 7 }, 60)

    mocks.redisGet.mockRejectedValueOnce(new Error('Redis down'))
    await expect(cacheGet<{ value: number }>(key)).resolves.toEqual({ value: 7 })

    mocks.redisDel.mockRejectedValueOnce(new Error('Redis down'))
    await cacheDel(key)

    mocks.redisGet.mockRejectedValueOnce(new Error('Redis down'))
    await expect(cacheGet(key)).resolves.toBeNull()
  })

  it('TEST-CACHE-003 in-memory fallback entries respect TTL expiration', async () => {
    vi.useFakeTimers()

    const key = 'cross-cutting:ttl:key'
    mocks.redisSet.mockRejectedValueOnce(new Error('Redis down'))
    await cacheSet(key, { ttl: true }, 1)

    mocks.redisGet.mockRejectedValueOnce(new Error('Redis down'))
    await expect(cacheGet<{ ttl: boolean }>(key)).resolves.toEqual({ ttl: true })

    vi.advanceTimersByTime(1_100)

    mocks.redisGet.mockRejectedValueOnce(new Error('Redis down'))
    await expect(cacheGet(key)).resolves.toBeNull()
  })
})
