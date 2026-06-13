import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  auth: mocks.auth,
}))

import { requireSuperAdmin } from '@/lib/platform-auth'

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

describe('platform-auth requireSuperAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('TEST-PA-001: no session returns 401 response', async () => {
    mocks.auth.mockResolvedValue(null)

    const access = await requireSuperAdmin()

    expect(access.user).toBeNull()
    expect(access.error?.status).toBe(401)
    expectErrorShape(await access.error!.json(), 'UNAUTHORIZED')
  })

  it('TEST-PA-002: non-SUPER_ADMIN session returns 403 response', async () => {
    mocks.auth.mockResolvedValue({
      user: {
        id: 'principal-1',
        role: 'PRINCIPAL',
        schoolId: 'school-1',
      },
    })

    const access = await requireSuperAdmin()

    expect(access.user).toBeNull()
    expect(access.error?.status).toBe(403)
    expectErrorShape(await access.error!.json(), 'FORBIDDEN')
  })

  it('TEST-PA-003: SUPER_ADMIN session succeeds with user payload', async () => {
    mocks.auth.mockResolvedValue({
      user: {
        id: 'super-1',
        email: 'superadmin@vbhs.edu',
        role: 'SUPER_ADMIN',
        schoolId: null,
      },
    })

    const access = await requireSuperAdmin()

    expect(access.error).toBeNull()
    expect(access.user).toEqual(
      expect.objectContaining({
        id: 'super-1',
        role: 'SUPER_ADMIN',
        schoolId: null,
      })
    )
  })
})
