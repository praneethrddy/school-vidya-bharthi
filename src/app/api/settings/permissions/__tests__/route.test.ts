import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

const mocks = vi.hoisted(() => ({
  requireSchoolPermission: vi.fn(),
  getRequestMetadata: vi.fn(),
  permissionFindMany: vi.fn(),
  rolePermissionFindMany: vi.fn(),
  rolePermissionDeleteMany: vi.fn(),
  rolePermissionCreateMany: vi.fn(),
  transaction: vi.fn(),
  createAuditLog: vi.fn(),
  invalidatePermissionCache: vi.fn(),
}))

vi.mock('@/lib/settings-auth', () => ({
  requireSchoolPermission: mocks.requireSchoolPermission,
  getRequestMetadata: mocks.getRequestMetadata,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    permission: {
      findMany: mocks.permissionFindMany,
    },
    rolePermission: {
      findMany: mocks.rolePermissionFindMany,
      deleteMany: mocks.rolePermissionDeleteMany,
      createMany: mocks.rolePermissionCreateMany,
    },
    $transaction: mocks.transaction,
  },
}))

vi.mock('@/lib/audit', () => ({
  createAuditLog: mocks.createAuditLog,
}))

vi.mock('@/lib/permissions', () => ({
  invalidatePermissionCache: mocks.invalidatePermissionCache,
}))

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

import { GET, PUT } from '../route'

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

describe('/api/settings/permissions', () => {
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
    mocks.getRequestMetadata.mockReturnValue({
      ip_address: '127.0.0.1',
      user_agent: 'vitest',
    })
    const permissionCatalog = [
      {
        id: '11111111-1111-1111-1111-111111111111',
        code: 'STUDENTS.promote',
        module: 'STUDENTS',
        name: 'Promote students',
        description: null,
        is_principal_only: false,
      },
      {
        id: '22222222-2222-2222-2222-222222222222',
        code: 'SETTINGS.manage_permissions',
        module: 'SETTINGS',
        name: 'Manage permissions',
        description: null,
        is_principal_only: true,
      },
    ]
    mocks.permissionFindMany.mockImplementation(async (args: any) => {
      const ids = args?.where?.id?.in as string[] | undefined
      if (!ids) {
        return permissionCatalog
      }
      return permissionCatalog.filter((permission) => ids.includes(permission.id))
    })
    mocks.rolePermissionFindMany.mockResolvedValue([
      {
        role: 'STUDENT_ADMIN',
        permission_id: '11111111-1111-1111-1111-111111111111',
      },
    ])
    mocks.rolePermissionDeleteMany.mockResolvedValue({ count: 1 })
    mocks.rolePermissionCreateMany.mockResolvedValue({ count: 1 })
    mocks.transaction.mockImplementation(async (callback: any) =>
      callback({
        rolePermission: {
          deleteMany: mocks.rolePermissionDeleteMany,
          createMany: mocks.rolePermissionCreateMany,
        },
      })
    )
  })

  it('GET returns grouped module permissions with granted roles', async () => {
    const response = await GET()
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.success).toBe(true)
    expect(payload.data.modules).toHaveLength(2)

    const studentsModule = payload.data.modules.find(
      (module: any) => module.module === 'STUDENTS'
    )
    expect(studentsModule).toBeTruthy()
    expect(studentsModule.permissions[0].granted_to).toContain('STUDENT_ADMIN')
  })

  it('GET returns 401 when access check fails for missing session', async () => {
    mocks.requireSchoolPermission.mockResolvedValueOnce({
      error: NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'No valid session',
          },
        },
        { status: 401 }
      ),
      user: null,
    })

    const response = await GET()
    const payload = await response.json()

    expect(response.status).toBe(401)
    expectErrorShape(payload, 'UNAUTHORIZED')
  })

  it('PUT rejects principal-only permissions for configurable roles', async () => {
    const request = new NextRequest('http://localhost/api/settings/permissions', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: 'TEACHER',
        permission_ids: ['22222222-2222-2222-2222-222222222222'],
      }),
    })

    const response = await PUT(request)
    const payload = await response.json()

    expect(response.status).toBe(403)
    expect(payload.success).toBe(false)
    expect(mocks.rolePermissionDeleteMany).not.toHaveBeenCalled()
  })

  it('PUT replaces role permissions and invalidates cache', async () => {
    const request = new NextRequest('http://localhost/api/settings/permissions', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: 'TEACHER',
        permission_ids: ['11111111-1111-1111-1111-111111111111'],
      }),
    })

    const response = await PUT(request)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.success).toBe(true)
    expect(mocks.rolePermissionDeleteMany).toHaveBeenCalledWith({
      where: {
        school_id: 'school-1',
        role: 'TEACHER',
      },
    })
    expect(mocks.rolePermissionCreateMany).toHaveBeenCalledWith({
      data: [
        {
          school_id: 'school-1',
          role: 'TEACHER',
          permission_id: '11111111-1111-1111-1111-111111111111',
          granted_by: 'user-1',
        },
      ],
    })
    expect(mocks.invalidatePermissionCache).toHaveBeenCalledWith('school-1', 'TEACHER')
    expect(mocks.createAuditLog).toHaveBeenCalledTimes(1)
  })

  it('PUT returns 401 when access check fails for missing session', async () => {
    mocks.requireSchoolPermission.mockResolvedValueOnce({
      error: NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'No valid session',
          },
        },
        { status: 401 }
      ),
      user: null,
    })

    const request = new NextRequest('http://localhost/api/settings/permissions', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: 'TEACHER',
        permission_ids: ['11111111-1111-1111-1111-111111111111'],
      }),
    })

    const response = await PUT(request)
    const payload = await response.json()

    expect(response.status).toBe(401)
    expectErrorShape(payload, 'UNAUTHORIZED')
  })
})
