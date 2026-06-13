import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  hasPermission: vi.fn(),
  headers: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  auth: mocks.auth,
}))

vi.mock('@/lib/permissions', () => ({
  hasPermission: mocks.hasPermission,
}))

vi.mock('next/headers', () => ({
  headers: mocks.headers,
}))

import {
  getRequestMetadata,
  isPrincipalRole,
  requireSchoolPermission,
} from '../settings-auth'

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

describe('settings-auth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.auth.mockResolvedValue({
      user: {
        id: 'user-1',
        role: 'TEACHER',
        schoolId: 'school-1',
      },
    })
    mocks.hasPermission.mockResolvedValue(true)
    mocks.headers.mockResolvedValue(new Headers())
  })

  it('requireSchoolPermission returns 401 when session is missing', async () => {
    mocks.auth.mockResolvedValue(null)

    const access = await requireSchoolPermission('SETTINGS.manage_permissions')

    expect(access.user).toBeNull()
    expect(access.error?.status).toBe(401)
    expectErrorShape(await access.error!.json(), 'UNAUTHORIZED')
  })

  it('requireSchoolPermission returns 400 when schoolId is missing', async () => {
    mocks.auth.mockResolvedValue({
      user: {
        id: 'user-1',
        role: 'TEACHER',
        schoolId: null,
      },
    })

    const access = await requireSchoolPermission('SETTINGS.manage_permissions')

    expect(access.user).toBeNull()
    expect(access.error?.status).toBe(400)
    expectErrorShape(await access.error!.json(), 'SCHOOL_REQUIRED')
  })

  it('requireSchoolPermission returns 403 for cross-tenant header mismatch', async () => {
    mocks.headers.mockResolvedValue(new Headers({ 'x-school-id': 'school-2' }))

    const access = await requireSchoolPermission('SETTINGS.manage_permissions')

    expect(access.user).toBeNull()
    expect(access.error?.status).toBe(403)
    const payload = await access.error!.json()
    expectErrorShape(payload, 'FORBIDDEN')
    expect(payload.error.message).toContain('Cross-tenant')
  })

  it('requireSchoolPermission returns 403 when required permission is missing', async () => {
    mocks.hasPermission.mockResolvedValue(false)

    const access = await requireSchoolPermission('SETTINGS.manage_permissions')

    expect(access.user).toBeNull()
    expect(access.error?.status).toBe(403)
    const payload = await access.error!.json()
    expectErrorShape(payload, 'FORBIDDEN')
    expect(payload.error.message).toContain('Missing permission')
  })

  it('requireSchoolPermission enforces principalOnly option for non-principal roles', async () => {
    const access = await requireSchoolPermission('SETTINGS.manage_permissions', {
      principalOnly: true,
    })

    expect(mocks.hasPermission).toHaveBeenCalledWith(
      'school-1',
      'TEACHER',
      'SETTINGS.manage_permissions'
    )
    expect(access.user).toBeNull()
    expect(access.error?.status).toBe(403)
    const payload = await access.error!.json()
    expectErrorShape(payload, 'FORBIDDEN')
    expect(payload.error.message).toContain('Only Principal')
  })

  it('isPrincipalRole returns true only for PRINCIPAL and SUPER_ADMIN', () => {
    expect(isPrincipalRole('PRINCIPAL')).toBe(true)
    expect(isPrincipalRole('SUPER_ADMIN')).toBe(true)
    expect(isPrincipalRole('TEACHER')).toBe(false)
  })

  it('getRequestMetadata extracts first forwarded IP and user-agent', () => {
    const request = new NextRequest('http://localhost/api/settings/permissions', {
      headers: {
        'x-forwarded-for': '10.0.0.1, 10.0.0.2',
        'user-agent': 'vitest-agent',
      },
    })

    expect(getRequestMetadata(request)).toEqual({
      ip_address: '10.0.0.1',
      user_agent: 'vitest-agent',
    })
  })
})
