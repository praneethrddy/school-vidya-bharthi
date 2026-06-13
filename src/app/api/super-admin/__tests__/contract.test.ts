import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextResponse } from 'next/server'
import {
  SuperAdminSchoolsResponseSchema,
  ErrorResponseSchema,
} from '@/test/contracts/schemas'

const mocks = vi.hoisted(() => ({
  requireSuperAdmin: vi.fn(),
  listPlatformSchools: vi.fn(),
}))

vi.mock('@/lib/platform-auth', () => ({
  requireSuperAdmin: mocks.requireSuperAdmin,
}))

vi.mock('@/lib/saas', () => ({
  listPlatformSchools: mocks.listPlatformSchools,
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}))

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

import { GET } from '../schools/route'

describe('Super-Admin API Contract Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mocks.requireSuperAdmin.mockResolvedValue({
      error: null,
      user: {
        id: '11111111-1111-1111-1111-111111111111',
        role: 'SUPER_ADMIN',
        schoolId: null,
      },
    })

    mocks.listPlatformSchools.mockResolvedValue([
      {
        id: '22222222-2222-2222-2222-222222222222',
        name: 'Vidhya Bharthi High School',
        slug: 'vbhs',
        is_active: true,
      },
    ])
  })

  it('[TEST-CONTRACT-017] GET /api/super-admin/schools returns valid SuperAdminSchoolsResponse shape', async () => {
    const response = await GET()
    const payload = await response.json()

    expect(response.status).toBe(200)
    const result = SuperAdminSchoolsResponseSchema.safeParse(payload)
    expect(result.success).toBe(true)
  })

  it('[TEST-CONTRACT-020] GET /api/super-admin/schools fails with unauthorized error response shape', async () => {
    mocks.requireSuperAdmin.mockResolvedValue({
      error: NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'No valid session' } },
        { status: 401 }
      ),
      user: null,
    })

    const response = await GET()
    const payload = await response.json()

    expect(response.status).toBe(401)
    const result = ErrorResponseSchema.safeParse(payload)
    expect(result.success).toBe(true)
  })
})
