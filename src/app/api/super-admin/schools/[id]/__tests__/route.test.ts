import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextResponse } from 'next/server'

const mocks = vi.hoisted(() => ({
  requireSuperAdmin: vi.fn(),
  getPlatformSchoolDetail: vi.fn(),
  loggerError: vi.fn(),
}))

vi.mock('@/lib/platform-auth', () => ({
  requireSuperAdmin: mocks.requireSuperAdmin,
}))

vi.mock('@/lib/saas', () => ({
  getPlatformSchoolDetail: mocks.getPlatformSchoolDetail,
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

function buildContext(id: string) {
  return {
    params: Promise.resolve({ id }),
  }
}

describe('/api/super-admin/schools/[id] GET', () => {
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

    mocks.getPlatformSchoolDetail.mockResolvedValue({
      id: 'school-1',
      name: 'Vidhya Bharthi High School',
      slug: 'vbhs',
      email: 'contact@vbhs.edu',
      phone: '+91-9000000000',
      city: 'Bengaluru',
      state: 'Karnataka',
      board: 'CBSE',
      logo_url: null,
      is_active: true,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-03-01T00:00:00.000Z',
      principal: {
        id: 'principal-1',
        email: 'principal@vbhs.edu',
        created_at: '2026-01-01T00:00:00.000Z',
      },
      current_academic_year: {
        id: 'ay-1',
        name: '2026-2027',
        start_date: '2026-06-01T00:00:00.000Z',
        end_date: '2027-05-31T00:00:00.000Z',
      },
      counts: {
        students: 720,
        staff: 48,
        users: 52,
        classes: 20,
        payments: 340,
        admissions: 90,
        pending_admissions: 7,
        unread_notifications: 3,
      },
      total_revenue: 2400000,
      custom_domain: 'school.vbhs.edu',
      platform_plan: 'GROWTH',
      platform_status: 'TRIAL',
      brand_primary: '#1d4ed8',
      brand_accent: '#f59e0b',
    })
  })

  it('TEST-SA-003: returns school detail payload for valid id', async () => {
    const response = await GET(
      new Request('http://localhost/api/super-admin/schools/school-1'),
      buildContext('school-1')
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          school: expect.objectContaining({
            id: 'school-1',
            name: 'Vidhya Bharthi High School',
            counts: expect.any(Object),
          }),
        }),
      })
    )
  })

  it('uses async params Promise contract from Next.js 15', async () => {
    let resolveParams: ((value: { id: string }) => void) | null = null
    const params = new Promise<{ id: string }>((resolve) => {
      resolveParams = resolve
    })

    const pending = GET(
      new Request('http://localhost/api/super-admin/schools/school-55'),
      { params }
    )

    await Promise.resolve()
    expect(mocks.getPlatformSchoolDetail).not.toHaveBeenCalled()

    resolveParams?.({ id: 'school-55' })
    const response = await pending

    expect(response.status).toBe(200)
    expect(mocks.getPlatformSchoolDetail).toHaveBeenCalledWith('school-55')
  })

  it('returns 401 when session is missing', async () => {
    mocks.requireSuperAdmin.mockResolvedValueOnce({
      error: NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'No valid session' } },
        { status: 401 }
      ),
      user: null,
    })

    const response = await GET(
      new Request('http://localhost/api/super-admin/schools/school-1'),
      buildContext('school-1')
    )
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

    const response = await GET(
      new Request('http://localhost/api/super-admin/schools/school-1'),
      buildContext('school-1')
    )
    const payload = await response.json()

    expect(response.status).toBe(403)
    expectErrorShape(payload, 'FORBIDDEN')
  })

  it('returns 404 when school does not exist', async () => {
    mocks.getPlatformSchoolDetail.mockResolvedValueOnce(null)

    const response = await GET(
      new Request('http://localhost/api/super-admin/schools/missing-school'),
      buildContext('missing-school')
    )
    const payload = await response.json()

    expect(response.status).toBe(404)
    expectErrorShape(payload, 'NOT_FOUND')
  })

  it('TEST-SA-007: allows SUPER_ADMIN school_id = null to fetch details', async () => {
    mocks.requireSuperAdmin.mockResolvedValueOnce({
      error: null,
      user: {
        id: 'super-2',
        role: 'SUPER_ADMIN',
        schoolId: null,
      },
    })

    const response = await GET(
      new Request('http://localhost/api/super-admin/schools/school-1'),
      buildContext('school-1')
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.success).toBe(true)
  })

  it('returns 500 with structured payload on unexpected errors', async () => {
    mocks.getPlatformSchoolDetail.mockRejectedValueOnce(new Error('database unavailable'))

    const response = await GET(
      new Request('http://localhost/api/super-admin/schools/school-1'),
      buildContext('school-1')
    )
    const payload = await response.json()

    expect(response.status).toBe(500)
    expectErrorShape(payload, 'INTERNAL_SERVER_ERROR')
    expect(mocks.loggerError).toHaveBeenCalled()
  })
})
