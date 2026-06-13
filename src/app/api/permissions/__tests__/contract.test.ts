import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import {
  PermissionsResponseSchema,
  ErrorResponseSchema,
} from '@/test/contracts/schemas'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  hasPermission: vi.fn(),
  permissionFindMany: vi.fn(),
  rolePermissionFindMany: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  auth: mocks.auth,
}))

vi.mock('@/lib/permissions', () => ({
  hasPermission: mocks.hasPermission,
  invalidatePermissionCache: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    permission: {
      findMany: mocks.permissionFindMany,
    },
    rolePermission: {
      findMany: mocks.rolePermissionFindMany,
    },
  },
}))

import { GET } from '../route'

describe('Permissions API Contract Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.auth.mockResolvedValue({
      user: { id: '00000000-0000-0000-0000-000000000000', role: 'PRINCIPAL', schoolId: '00000000-0000-0000-0000-000000000001' },
    })
    mocks.permissionFindMany.mockResolvedValue([
      {
        id: '22222222-2222-2222-2222-222222222222',
        code: 'STUDENTS.view',
        module: 'STUDENTS',
        action: 'view',
        name: 'View Students',
        description: 'Allows viewing student list and details',
        is_principal_only: false,
      },
    ])
    mocks.rolePermissionFindMany.mockResolvedValue([
      {
        permission_id: '22222222-2222-2222-2222-222222222222',
      },
    ])
  })

  it('[TEST-CONTRACT-018] GET /api/permissions returns valid PermissionsResponse shape', async () => {
    const request = new NextRequest('http://localhost/api/permissions?role=TEACHER')
    const response = await GET(request)
    const payload = await response.json()

    expect(response.status).toBe(200)
    const result = PermissionsResponseSchema.safeParse(payload)
    expect(result.success).toBe(true)
  })

  it('[TEST-CONTRACT-020] GET /api/permissions fails with unauthorized error response shape', async () => {
    mocks.auth.mockResolvedValue(null)
    const request = new NextRequest('http://localhost/api/permissions?role=TEACHER')
    const response = await GET(request)
    const payload = await response.json()

    expect(response.status).toBe(401)
    const result = ErrorResponseSchema.safeParse(payload)
    expect(result.success).toBe(true)
  })
})
