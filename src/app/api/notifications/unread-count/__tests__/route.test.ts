import { NextRequest } from 'next/server'
import { z } from 'zod'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const unreadCountResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    unread_count: z.number().int().nonnegative(),
  }),
})

const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
})

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  getUnreadCount: vi.fn(),
  loggerError: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  auth: mocks.auth,
}))

vi.mock('@/lib/notification-service', () => ({
  getUnreadCount: mocks.getUnreadCount,
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    error: mocks.loggerError,
  },
}))

import { GET } from '../route'

describe('/api/notifications/unread-count', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.auth.mockResolvedValue({
      user: {
        id: 'user-1',
        schoolId: 'school-1',
      },
    })
    mocks.getUnreadCount.mockResolvedValue(5)
  })

  it('TEST-NOTIF-004: returns 401 when no valid session exists', async () => {
    mocks.auth.mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/notifications/unread-count')
    const response = await GET(request, { params: Promise.resolve({}) })
    const payload = await response.json()

    expect(response.status).toBe(401)
    expect(errorResponseSchema.safeParse(payload).success).toBe(true)
    expect(payload.error.code).toBe('UNAUTHORIZED')
  })

  it('TEST-NOTIF-003 and TEST-NOTIF-005: returns unread count with user+school scoping', async () => {
    const request = new NextRequest('http://localhost/api/notifications/unread-count')
    const response = await GET(request, { params: Promise.resolve({}) })
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(unreadCountResponseSchema.safeParse(payload).success).toBe(true)
    expect(payload.data.unread_count).toBe(5)
    expect(mocks.getUnreadCount).toHaveBeenCalledWith('user-1', 'school-1')
  })

  it('returns 400 when school context is missing from session', async () => {
    mocks.auth.mockResolvedValueOnce({
      user: {
        id: 'user-1',
        schoolId: null,
      },
    })

    const request = new NextRequest('http://localhost/api/notifications/unread-count')
    const response = await GET(request, { params: Promise.resolve({}) })
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(errorResponseSchema.safeParse(payload).success).toBe(true)
    expect(payload.error.code).toBe('SCHOOL_REQUIRED')
  })
})
