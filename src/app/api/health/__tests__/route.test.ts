import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  prismaQuery: vi.fn(),
  redisPing: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRaw: mocks.prismaQuery,
  },
}))

vi.mock('@/lib/redis', () => ({
  redis: {
    ping: mocks.redisPing,
  },
}))

import { GET } from '../route'

describe('/api/health', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.prismaQuery.mockResolvedValue([{ '?column?': 1 }])
    mocks.redisPing.mockResolvedValue('PONG')
  })

  it('TEST-HEALTH-001: returns healthy when database and redis checks pass', async () => {
    const response = await GET()
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual(
      expect.objectContaining({
        status: 'healthy',
        version: expect.any(String),
        timestamp: expect.any(String),
        checks: {
          database: 'ok',
          redis: 'ok',
        },
      })
    )
  })

  it('TEST-HEALTH-002: returns degraded when a dependency check fails', async () => {
    mocks.redisPing.mockRejectedValue(new Error('redis offline'))

    const response = await GET()
    const payload = await response.json()

    expect(response.status).toBe(503)
    expect(payload).toEqual(
      expect.objectContaining({
        status: 'degraded',
        checks: {
          database: 'ok',
          redis: 'error',
        },
      })
    )
  })
})
