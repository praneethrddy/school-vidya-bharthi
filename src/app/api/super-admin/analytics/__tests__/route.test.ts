import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextResponse } from 'next/server'

const mocks = vi.hoisted(() => ({
  requireSuperAdmin: vi.fn(),
  getPlatformAnalytics: vi.fn(),
  loggerError: vi.fn(),
}))

vi.mock('@/lib/platform-auth', () => ({
  requireSuperAdmin: mocks.requireSuperAdmin,
}))

vi.mock('@/lib/saas', () => ({
  getPlatformAnalytics: mocks.getPlatformAnalytics,
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    error: mocks.loggerError,
  },
}))

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

import { GET } from '../route'

function expectErrorShape(payload: unknown, code: string) {
  expect(payload).toEqual(
    expect.objectContaining({
      success: false,
      error: expect.objectContaining({
        code,
        message: expect.any(String),
      }),
    })
  )
}

describe('/api/super-admin/analytics GET', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mocks.requireSuperAdmin.mockResolvedValue({
      error: null,
      user: {
        id: 'super-1',
        role: 'SUPER_ADMIN',
        schoolId: null,
      },
    })

    mocks.getPlatformAnalytics.mockResolvedValue({
      total_schools: 12,
      active_schools: 10,
      suspended_schools: 2,
      total_users: 680,
      total_students: 6100,
      total_staff: 410,
      total_mrr: 2450000,
    })
  })

  it('TEST-SA-005: returns platform analytics with status and shape', async () => {
    const response = await GET()
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          total_schools: 12,
          active_schools: 10,
          total_mrr: 2450000,
        }),
      })
    )
  })

  it('returns 401 when session is missing', async () => {
    mocks.requireSuperAdmin.mockResolvedValueOnce({
      error: NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'No valid session' } },
        { status: 401 }
      ),
      user: null,
    })

    const response = await GET()
    const payload = await response.json()

    expect(response.status).toBe(401)
    expectErrorShape(payload, 'UNAUTHORIZED')
  })

  it('TEST-SA-006: returns 403 for non-super-admin role', async () => {
    mocks.requireSuperAdmin.mockResolvedValueOnce({
      error: NextResponse.json(
        {
          success: false,
          error: { code: 'FORBIDDEN', message: 'Only SUPER_ADMIN can access this route' },
        },
        { status: 403 }
      ),
      user: null,
    })

    const response = await GET()
    const payload = await response.json()

    expect(response.status).toBe(403)
    expectErrorShape(payload, 'FORBIDDEN')
  })

  it('TEST-SA-007: allows SUPER_ADMIN school_id = null to access analytics', async () => {
    mocks.requireSuperAdmin.mockResolvedValueOnce({
      error: null,
      user: {
        id: 'super-2',
        role: 'SUPER_ADMIN',
        schoolId: null,
      },
    })

    const response = await GET()
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.success).toBe(true)
    expect(mocks.getPlatformAnalytics).toHaveBeenCalledTimes(1)
  })

  it('returns 500 with structured payload on unexpected errors', async () => {
    mocks.getPlatformAnalytics.mockRejectedValueOnce(new Error('aggregation failed'))

    const response = await GET()
    const payload = await response.json()

    expect(response.status).toBe(500)
    expectErrorShape(payload, 'INTERNAL_SERVER_ERROR')
    expect(mocks.loggerError).toHaveBeenCalled()
  })
})
