import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

const mocks = vi.hoisted(() => ({
  requireSchoolPermission: vi.fn(),
  registerSchoolCustomDomain: vi.fn(),
  schoolSettingFindFirst: vi.fn(),
}))

vi.mock('@/lib/settings-auth', () => ({
  requireSchoolPermission: mocks.requireSchoolPermission,
  getRequestMetadata: vi.fn(() => ({
    ip_address: '127.0.0.1',
    user_agent: 'vitest',
  })),
}))

vi.mock('@/lib/saas', () => ({
  customDomainSchema: {
    safeParse: (payload: { domain?: string }) =>
      payload?.domain
        ? { success: true, data: { domain: payload.domain } }
        : {
            success: false,
            error: { issues: [{ message: 'Invalid domain payload' }] },
          },
  },
  registerSchoolCustomDomain: mocks.registerSchoolCustomDomain,
}))

vi.mock('@/lib/prisma', () => ({
  createTenantPrisma: vi.fn(() => ({
    schoolSetting: {
      findFirst: mocks.schoolSettingFindFirst,
    },
  })),
}))

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

import { GET, POST } from '../route'

describe('/api/settings/domain', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireSchoolPermission.mockResolvedValue({
      error: null,
      user: {
        id: 'user-1',
        role: 'PRINCIPAL',
        schoolId: 'school-1',
      },
    })
  })

  it('GET returns the current tenant custom domain', async () => {
    mocks.schoolSettingFindFirst.mockResolvedValue({
      setting_value: 'school.example.com',
      updated_at: new Date('2026-01-01T00:00:00.000Z'),
    })

    const response = await GET()
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.data.domain).toBe('school.example.com')
  })

  it('POST registers the domain against the authenticated school only', async () => {
    mocks.registerSchoolCustomDomain.mockResolvedValue({
      domain: 'school.example.com',
      provider_status: 'mocked',
      cloudflare_hostname_id: null,
    })

    const request = new NextRequest('http://localhost/api/settings/domain', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        domain: 'school.example.com',
        school_id: 'school-2',
      }),
    })

    const response = await POST(request)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.success).toBe(true)
    expect(mocks.registerSchoolCustomDomain).toHaveBeenCalledWith(
      expect.objectContaining({
        schoolId: 'school-1',
        userId: 'user-1',
        domain: 'school.example.com',
      })
    )
  })

  it('TEST-SET-031: invalid domain payload returns 400', async () => {
    const request = new NextRequest('http://localhost/api/settings/domain', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ domain: '' }),
    })

    const response = await POST(request)
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.success).toBe(false)
    expect(payload.error.code).toBe('VALIDATION_ERROR')
  })

  it('TEST-SET-032: domain registration failures return 400 with message', async () => {
    mocks.registerSchoolCustomDomain.mockRejectedValueOnce(
      new Error('Cloudflare provisioning failed')
    )

    const request = new NextRequest('http://localhost/api/settings/domain', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ domain: 'school.example.com' }),
    })

    const response = await POST(request)
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.success).toBe(false)
    expect(payload.error.code).toBe('DOMAIN_REGISTRATION_FAILED')
    expect(payload.error.message).toContain('Cloudflare provisioning failed')
  })

  it('includes missing session negative case', async () => {
    mocks.requireSchoolPermission.mockResolvedValueOnce({
      error: NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'No valid session' } },
        { status: 401 }
      ),
      user: null,
    })

    const response = await GET()
    const payload = await response.json()

    expect(response.status).toBe(401)
    expect(payload.success).toBe(false)
    expect(payload.error.code).toBe('UNAUTHORIZED')
  })
})
