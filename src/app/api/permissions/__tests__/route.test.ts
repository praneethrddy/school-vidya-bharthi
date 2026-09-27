import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  permissionFindMany: vi.fn(),
  rolePermissionFindMany: vi.fn(),
  rolePermissionDeleteMany: vi.fn(),
  rolePermissionCreateMany: vi.fn(),
  transaction: vi.fn(),
  invalidatePermissionCache: vi.fn(),
  createAuditLog: vi.fn(),
  loggerError: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  auth: mocks.auth,
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

vi.mock('@/lib/permissions', () => ({
  invalidatePermissionCache: mocks.invalidatePermissionCache,
}))

vi.mock('@/lib/audit', () => ({
  createAuditLog: mocks.createAuditLog,
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    error: mocks.loggerError,
  },
}))

import { GET, PUT } from '../route'

const teacherRole = 'TEACHER'
const teacherPermissionId = '11111111-1111-1111-1111-111111111111'
const attendancePermissionId = '22222222-2222-2222-2222-222222222222'
const feesApproveConcessionId = '33333333-3333-3333-3333-333333333333'
const settingsManagePermissionsId = '44444444-4444-4444-4444-444444444444'
const studentsDeleteId = '55555555-5555-5555-5555-555555555555'
const staffDeleteId = '66666666-6666-6666-6666-666666666666'

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

function expectSuccessShape(payload: unknown) {
  expect(payload).toEqual(
    expect.objectContaining({
      success: true,
      data: expect.any(Object),
    })
  )
}

describe('/api/permissions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.auth.mockResolvedValue({
      user: {
        id: 'user-1',
        role: 'PRINCIPAL',
        schoolId: 'school-1',
      },
    })

    const permissionCatalog = [
      {
        id: teacherPermissionId,
        code: 'HOMEWORK.create',
        module: 'HOMEWORK',
        action: 'create',
        name: 'Create Homework',
        description: 'Can create homework',
        is_principal_only: false,
      },
      {
        id: attendancePermissionId,
        code: 'ATTENDANCE.delete',
        module: 'ATTENDANCE',
        action: 'delete',
        name: 'Delete Attendance',
        description: 'Can delete attendance records',
        is_principal_only: true,
      },
      {
        id: feesApproveConcessionId,
        code: 'FEES.approve_concession',
        module: 'FEES',
        action: 'approve_concession',
        name: 'Approve Concession',
        description: null,
        is_principal_only: true,
      },
      {
        id: settingsManagePermissionsId,
        code: 'SETTINGS.manage_permissions',
        module: 'SETTINGS',
        action: 'manage_permissions',
        name: 'Manage Permissions',
        description: null,
        is_principal_only: true,
      },
      {
        id: studentsDeleteId,
        code: 'STUDENTS.delete',
        module: 'STUDENTS',
        action: 'delete',
        name: 'Delete Student',
        description: null,
        is_principal_only: true,
      },
      {
        id: staffDeleteId,
        code: 'STAFF.delete',
        module: 'STAFF',
        action: 'delete',
        name: 'Delete Staff',
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
        permission_id: teacherPermissionId,
      },
    ])

    mocks.rolePermissionDeleteMany.mockResolvedValue({ count: 1 })
    mocks.rolePermissionCreateMany.mockResolvedValue({ count: 1 })

    mocks.transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => {
      return callback({
        rolePermission: {
          findMany: mocks.rolePermissionFindMany,
          deleteMany: mocks.rolePermissionDeleteMany,
          createMany: mocks.rolePermissionCreateMany,
        },
      })
    })
  })

  it('GET returns grouped permissions for the requested school role', async () => {
    const request = new NextRequest(`http://localhost/api/permissions?role=${teacherRole}`)
    const response = await GET(request)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expectSuccessShape(payload)
    expect(payload.data.role).toBe(teacherRole)
    expect(payload.data.permissions).toEqual(expect.any(Array))
    expect(payload.data.grouped_permissions).toEqual(expect.any(Array))
    expect(payload.data.grouped_permissions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          module: 'HOMEWORK',
          permissions: expect.arrayContaining([
            expect.objectContaining({
              id: teacherPermissionId,
              code: 'HOMEWORK.create',
              is_granted: true,
              is_principal_only: false,
            }),
          ]),
        }),
      ])
    )
    expect(mocks.rolePermissionFindMany).toHaveBeenCalledWith({
      where: { school_id: 'school-1', role: teacherRole },
      select: { permission_id: true },
    })
  })

  it('GET returns 401 for missing session', async () => {
    mocks.auth.mockResolvedValue(null)

    const request = new NextRequest(`http://localhost/api/permissions?role=${teacherRole}`)
    const response = await GET(request)
    const payload = await response.json()

    expect(response.status).toBe(401)
    expectErrorShape(payload, 'UNAUTHORIZED')
  })

  it('GET as non-principal role returns 403', async () => {
    mocks.auth.mockResolvedValue({
      user: {
        id: 'teacher-user',
        role: 'TEACHER',
        schoolId: 'school-1',
      },
    })

    const request = new NextRequest(`http://localhost/api/permissions?role=${teacherRole}`)
    const response = await GET(request)
    const payload = await response.json()

    expect(response.status).toBe(403)
    expectErrorShape(payload, 'FORBIDDEN')
  })

  it('PUT with valid principal request updates role permissions and writes audit log', async () => {
    mocks.rolePermissionFindMany.mockResolvedValueOnce([]).mockResolvedValueOnce([
      {
        permission_id: teacherPermissionId,
      },
    ])

    const request = new NextRequest('http://localhost/api/permissions?school_id=school-1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: teacherRole,
        permissions: [{ permission_id: teacherPermissionId, granted: true }],
      }),
    })

    const response = await PUT(request)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expectSuccessShape(payload)
    expect(mocks.rolePermissionDeleteMany).toHaveBeenCalledWith({
      where: { school_id: 'school-1', role: teacherRole },
    })
    expect(mocks.rolePermissionCreateMany).toHaveBeenCalledWith({
      data: [
        {
          school_id: 'school-1',
          role: teacherRole,
          permission_id: teacherPermissionId,
          granted_by: 'user-1',
        },
      ],
    })
    expect(mocks.createAuditLog).toHaveBeenCalledTimes(1)
    expect(mocks.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        school_id: 'school-1',
        user_id: 'user-1',
        action: 'UPDATE',
        entity_type: 'role_permission',
        entity_id: teacherPermissionId,
      })
    )
    expect(mocks.invalidatePermissionCache).toHaveBeenCalledWith('school-1', teacherRole)
  })

  it('PUT as non-principal role returns 403', async () => {
    mocks.auth.mockResolvedValue({
      user: {
        id: 'teacher-user',
        role: 'TEACHER',
        schoolId: 'school-1',
      },
    })

    const request = new NextRequest('http://localhost/api/permissions', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: teacherRole,
        permissions: [{ permission_id: teacherPermissionId, granted: true }],
      }),
    })

    const response = await PUT(request)
    const payload = await response.json()

    expect(response.status).toBe(403)
    expectErrorShape(payload, 'FORBIDDEN')
  })

  it('PUT returns 401 for missing session', async () => {
    mocks.auth.mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/permissions', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: teacherRole,
        permissions: [{ permission_id: teacherPermissionId, granted: true }],
      }),
    })

    const response = await PUT(request)
    const payload = await response.json()

    expect(response.status).toBe(401)
    expectErrorShape(payload, 'UNAUTHORIZED')
  })

  it.each([
    ['ATTENDANCE.delete', attendancePermissionId],
    ['FEES.approve_concession', feesApproveConcessionId],
    ['SETTINGS.manage_permissions', settingsManagePermissionsId],
    ['STUDENTS.delete', studentsDeleteId],
    ['STAFF.delete', staffDeleteId],
  ])('PUT blocks delegation of principal-only permission %s', async (permissionCode, permissionId) => {
    const request = new NextRequest('http://localhost/api/permissions', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: teacherRole,
        permissions: [{ permission_id: permissionId, granted: true }],
      }),
    })

    const response = await PUT(request)
    const payload = await response.json()

    expect(response.status).toBe(403)
    expectErrorShape(payload, 'FORBIDDEN')
    expect(payload.error.message).toContain(permissionCode)
    expect(mocks.rolePermissionDeleteMany).not.toHaveBeenCalled()
    expect(mocks.rolePermissionCreateMany).not.toHaveBeenCalled()
    expect(mocks.createAuditLog).not.toHaveBeenCalled()
  })
})
