import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextResponse } from 'next/server'

const mocks = vi.hoisted(() => ({
  requireSuperAdmin: vi.fn(),
  listPlatformSchools: vi.fn(),
  loggerError: vi.fn(),
}))

vi.mock('@/lib/platform-auth', () => ({
  requireSuperAdmin: mocks.requireSuperAdmin,
}))

vi.mock('@/lib/saas', () => ({
  listPlatformSchools: mocks.listPlatformSchools,
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

describe('/api/super-admin/schools GET', () => {
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

    mocks.listPlatformSchools.mockResolvedValue([
      {
        id: 'school-1',
        name: 'Vidhya Bharthi High School',
        slug: 'vbhs',
        email: 'contact@vbhs.edu',
        logo_url: null,
        city: 'Bengaluru',
        state: 'Karnataka',
        is_active: true,
        created_at: '2026-01-01T00:00:00.000Z',
        principal_email: 'principal@vbhs.edu',
        student_count: 720,
        staff_count: 48,
        user_count: 52,
        total_revenue: 2400000,
        custom_domain: 'school.vbhs.edu',
        platform_plan: 'GROWTH',
        platform_status: 'TRIAL',
      },
    ])
  })

  it('TEST-SA-002: returns platform schools list for super admin', async () => {
    const response = await GET()
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          schools: expect.any(Array),
        }),
      })
    )
    expect(payload.data.schools[0]).toEqual(
      expect.objectContaining({
        id: 'school-1',
        name: 'Vidhya Bharthi High School',
        is_active: true,
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

  it('TEST-SA-007: allows SUPER_ADMIN with school_id = null', async () => {
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
    expect(mocks.listPlatformSchools).toHaveBeenCalledTimes(1)
  })

  it('returns 500 with structured payload when list operation fails', async () => {
    mocks.listPlatformSchools.mockRejectedValueOnce(new Error('database unavailable'))

    const response = await GET()
    const payload = await response.json()

    expect(response.status).toBe(500)
    expectErrorShape(payload, 'INTERNAL_SERVER_ERROR')
    expect(mocks.loggerError).toHaveBeenCalled()
  })
})
