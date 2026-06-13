import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  createSchoolOnboarding: vi.fn(),
  safeParse: vi.fn(),
  loggerError: vi.fn(),
}))

vi.mock('@/lib/api-helpers', () => ({
  errorResponse: (code: string, message: string, status = 400) =>
    Response.json({ success: false, error: { code, message } }, { status }),
  successResponse: (data: unknown) => Response.json({ success: true, data }),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    error: mocks.loggerError,
  },
}))

vi.mock('@/lib/saas', () => ({
  createSchoolOnboarding: mocks.createSchoolOnboarding,
  onboardingRegisterSchema: {
    safeParse: mocks.safeParse,
  },
}))

import { POST } from '../route'

describe('/api/onboarding/register', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.safeParse.mockImplementation((payload: unknown) => ({
      success: true,
      data: payload,
    }))
  })

  it('TEST-PUB-010: registers a school and returns onboarding response shape', async () => {
    mocks.createSchoolOnboarding.mockResolvedValue({
      school: {
        id: 'school-1',
        name: 'Green Valley School',
        slug: 'green-valley-school',
        email: 'hello@greenvalley.school',
      },
      principal: {
        email: 'principal@greenvalley.school',
        temporaryPassword: 'Temp@1234',
      },
      academicYear: {
        id: 'ay-1',
        name: '2026-2027',
      },
      loginUrl: 'https://green-valley-school.schoolos.test/login',
    })

    const request = new NextRequest('http://localhost/api/onboarding/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        school_name: 'Green Valley School',
        slug: 'green-valley-school',
        school_email: 'hello@greenvalley.school',
        principal_name: 'Asha Verma',
        principal_email: 'principal@greenvalley.school',
      }),
    })

    const response = await POST(request)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual({
      success: true,
      data: {
        school: {
          id: 'school-1',
          name: 'Green Valley School',
          slug: 'green-valley-school',
          email: 'hello@greenvalley.school',
        },
        principal: {
          email: 'principal@greenvalley.school',
          temporary_password: 'Temp@1234',
        },
        current_academic_year: {
          id: 'ay-1',
          name: '2026-2027',
        },
        login_url: 'https://green-valley-school.schoolos.test/login',
      },
    })
  })

  it('TEST-PUB-010: returns 400 validation error when schema parsing fails', async () => {
    mocks.safeParse.mockReturnValue({
      success: false,
      error: {
        issues: [{ message: 'Slug is required' }],
      },
    })

    const request = new NextRequest('http://localhost/api/onboarding/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ school_name: 'Missing slug school' }),
    })

    const response = await POST(request)
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.success).toBe(false)
    expect(payload.error.code).toBe('VALIDATION_ERROR')
    expect(payload.error.message).toBe('Slug is required')
    expect(mocks.createSchoolOnboarding).not.toHaveBeenCalled()
  })

  it('TEST-PUB-010: returns onboarding failure payload when service throws', async () => {
    mocks.createSchoolOnboarding.mockRejectedValue(new Error('Slug already exists'))

    const request = new NextRequest('http://localhost/api/onboarding/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        school_name: 'Duplicate Slug School',
        slug: 'duplicate-school',
      }),
    })

    const response = await POST(request)
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.success).toBe(false)
    expect(payload.error.code).toBe('ONBOARDING_FAILED')
    expect(payload.error.message).toBe('Slug already exists')
    expect(mocks.loggerError).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.any(Error),
      }),
      'School onboarding failed'
    )
  })
})
