import { beforeEach, describe, expect, it } from 'vitest'
import { checkRateLimit, getRateLimitHeaders, resetRateLimitStore } from '../rate-limit'

describe('checkRateLimit', () => {
  beforeEach(() => {
    resetRateLimitStore()
  })

  it('TEST-RATE-001 requests within tier limit are allowed', async () => {
    const result = await checkRateLimit('test-ip', 'public')
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(29)
    expect(result.retryAfter).toBeUndefined()
  })

  it('TEST-RATE-002 requests exceeding limit return blocked state with retryAfter', async () => {
    const key = 'rate-test-ip'
    for (let i = 0; i < 30; i++) {
      await checkRateLimit(key, 'public')
    }

    const result = await checkRateLimit(key, 'public')

    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
    expect(result.retryAfter).toBeTypeOf('number')
    expect(result.retryAfter).toBeGreaterThan(0)
  })

  it('rate limit headers include retry hint only when blocked', () => {
    const allowedHeaders = getRateLimitHeaders(11)
    expect(allowedHeaders).toEqual({
      'X-RateLimit-Remaining': '11',
    })

    const blockedHeaders = getRateLimitHeaders(0, 42)
    expect(blockedHeaders).toEqual({
      'X-RateLimit-Remaining': '0',
      'Retry-After': '42',
    })
  })
})
