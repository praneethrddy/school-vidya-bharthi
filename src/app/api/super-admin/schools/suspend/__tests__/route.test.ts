import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

const mocks = vi.hoisted(() => ({
  requireSuperAdmin: vi.fn(),
  suspendSchool: vi.fn(),
  getRequestMetadata: vi.fn(),
  loggerError: vi.fn(),
}))

vi.mock('@/lib/platform-auth', () => ({
  requireSuperAdmin: mocks.requireSuperAdmin,
}))

vi.mock('@/lib/saas', () => ({
  suspendSchool: mocks.suspendSchool,
}))

vi.mock('@/lib/settings-auth', () => ({
  getRequestMetadata: mocks.getRequestMetadata,
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    error: mocks.loggerError,
  },
}))

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

import { POST } from '../route'

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

function buildRequest(body: unknown) {
  return new NextRequest('http://localhost/api/super-admin/schools/suspend', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
}

describe('/api/super-admin/schools/suspend POST', () => {
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

    mocks.getRequestMetadata.mockReturnValue({
      ip_address: '127.0.0.1',
      user_agent: 'vitest-agent',
    })

    mocks.suspendSchool.mockResolvedValue({
      id: '4d4fbb16-a07e-429e-ad6a-00c2e13de7f6',
      name: 'Vidhya Bharthi High School',
      is_active: false,
    })
  })

  it('TEST-SA-004: suspends school and returns response shape with status 200', async () => {
    const schoolId = '4d4fbb16-a07e-429e-ad6a-00c2e13de7f6'
    const response = await POST(
      buildRequest({
        school_id: schoolId,
        is_active: false,
      })
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          school: expect.objectContaining({
            id: schoolId,
            is_active: false,
          }),
        }),
      })
    )
    expect(mocks.suspendSchool).toHaveBeenCalledWith(
      expect.objectContaining({
        schoolId,
        userId: 'super-1',
        isActive: false,
        metadata: {
          ip_address: '127.0.0.1',
          user_agent: 'vitest-agent',
        },
      })
    )
  })

  it('defaults to is_active=false when field is omitted', async () => {
    const schoolId = '7c6f7908-c0a9-4eca-9052-6409c8e3737b'

    await POST(
      buildRequest({
        school_id: schoolId,
      })
    )

    expect(mocks.suspendSchool).toHaveBeenCalledWith(
      expect.objectContaining({
        schoolId,
        isActive: false,
      })
    )
  })

  it('returns 400 with validation shape for invalid payload', async () => {
    const response = await POST(
      buildRequest({
        school_id: 'not-a-uuid',
        is_active: 'false',
      })
    )
    const payload = await response.json()

    expect(response.status).toBe(400)
    expectErrorShape(payload, 'VALIDATION_ERROR')
  })

  it('returns 401 when session is missing', async () => {
    mocks.requireSuperAdmin.mockResolvedValueOnce({
      error: NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'No valid session' } },
        { status: 401 }
      ),
      user: null,
    })

    const response = await POST(
      buildRequest({
        school_id: '4d4fbb16-a07e-429e-ad6a-00c2e13de7f6',
        is_active: false,
      })
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

    const response = await POST(
      buildRequest({
        school_id: '4d4fbb16-a07e-429e-ad6a-00c2e13de7f6',
        is_active: true,
      })
    )
    const payload = await response.json()

    expect(response.status).toBe(403)
    expectErrorShape(payload, 'FORBIDDEN')
  })

  it('TEST-SA-007: allows SUPER_ADMIN school_id = null to update school status', async () => {
    mocks.requireSuperAdmin.mockResolvedValueOnce({
      error: null,
      user: {
        id: 'super-2',
        role: 'SUPER_ADMIN',
        schoolId: null,
      },
    })

    const response = await POST(
      buildRequest({
        school_id: '4d4fbb16-a07e-429e-ad6a-00c2e13de7f6',
        is_active: true,
      })
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.success).toBe(true)
    expect(mocks.suspendSchool).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'super-2',
      })
    )
  })

  it('returns 400 with UPDATE_FAILED when suspendSchool throws', async () => {
    mocks.suspendSchool.mockRejectedValueOnce(new Error('School not found'))

    const response = await POST(
      buildRequest({
        school_id: '4d4fbb16-a07e-429e-ad6a-00c2e13de7f6',
        is_active: true,
      })
    )
    const payload = await response.json()

    expect(response.status).toBe(400)
    expectErrorShape(payload, 'UPDATE_FAILED')
    expect(payload.error.message).toContain('School not found')
    expect(mocks.loggerError).toHaveBeenCalled()
  })
})
