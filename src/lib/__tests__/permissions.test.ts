import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  rolePermissionFindMany: vi.fn(),
  permissionFindMany: vi.fn(),
  cacheGet: vi.fn(),
  cacheSet: vi.fn(),
  cacheDel: vi.fn(),
  loggerWarn: vi.fn(),
}))

vi.mock('../prisma', () => ({
  prisma: {
    rolePermission: {
      findMany: mocks.rolePermissionFindMany,
    },
    permission: {
      findMany: mocks.permissionFindMany,
    },
  },
}))

vi.mock('../cache', () => ({
  cacheGet: mocks.cacheGet,
  cacheSet: mocks.cacheSet,
  cacheDel: mocks.cacheDel,
}))

vi.mock('../logger', () => ({
  logger: {
    warn: mocks.loggerWarn,
  },
}))

import {
  getDefaultPermissionsForRole,
  getPermissionsForRole,
  hasPermission,
  invalidatePermissionCache,
  isPrincipalOnly,
} from '../permissions'
import { ROLE_PERMISSION_DEFAULTS } from '../permission-config'

describe('permissions library', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.cacheGet.mockResolvedValue(null)
    mocks.cacheSet.mockResolvedValue(undefined)
    mocks.cacheDel.mockResolvedValue(undefined)
  })

  it('hasPermission returns true for SUPER_ADMIN regardless of code', async () => {
    const allowed = await hasPermission(null, 'SUPER_ADMIN', 'ANY.permission')
    expect(allowed).toBe(true)
  })

  it('hasPermission returns true for PRINCIPAL regardless of code', async () => {
    const allowed = await hasPermission('school-1', 'PRINCIPAL', 'SETTINGS.manage_permissions')
    expect(allowed).toBe(true)
  })

  it('hasPermission checks role_permissions for configurable roles', async () => {
    mocks.rolePermissionFindMany.mockResolvedValue([
      { permission: { code: 'FEES.record_payment' } },
      { permission: { code: 'FEES.generate_receipt' } },
    ])

    const allowed = await hasPermission('school-1', 'ACCOUNTANT', 'FEES.record_payment')

    expect(allowed).toBe(true)
    expect(mocks.rolePermissionFindMany).toHaveBeenCalledWith({
      where: { school_id: 'school-1', role: 'ACCOUNTANT' },
      include: { permission: true },
    })
  })

  it('isPrincipalOnly correctly identifies locked permissions', () => {
    expect(isPrincipalOnly('FEES.approve_concession')).toBe(true)
    expect(isPrincipalOnly('SETTINGS.manage_permissions')).toBe(true)
    expect(isPrincipalOnly('FEES.record_payment')).toBe(false)
  })

  it('getPermissionsForRole returns role permission codes for configurable roles', async () => {
    mocks.rolePermissionFindMany.mockResolvedValue([
      { permission: { code: 'ATTENDANCE.mark' } },
      { permission: { code: 'HOMEWORK.create' } },
    ])

    const permissions = await getPermissionsForRole('school-1', 'TEACHER')

    expect(permissions).toEqual(['ATTENDANCE.mark', 'HOMEWORK.create'])
    expect(mocks.cacheSet).toHaveBeenCalledWith(
      'permissions:school-1:TEACHER',
      ['ATTENDANCE.mark', 'HOMEWORK.create'],
      3600
    )
  })

  it('supports cache invalidation per school and role', async () => {
    await invalidatePermissionCache('school-1', 'TEACHER')
    expect(mocks.cacheDel).toHaveBeenCalledWith('permissions:school-1:TEACHER')
  })

  it('permission defaults match expected configuration', () => {
    expect(getDefaultPermissionsForRole('STAFF_ADMIN')).toEqual(ROLE_PERMISSION_DEFAULTS.STAFF_ADMIN)
    expect(getDefaultPermissionsForRole('STUDENT_ADMIN')).toEqual(
      ROLE_PERMISSION_DEFAULTS.STUDENT_ADMIN
    )
    expect(getDefaultPermissionsForRole('ACCOUNTANT')).toEqual(ROLE_PERMISSION_DEFAULTS.ACCOUNTANT)
    expect(getDefaultPermissionsForRole('TEACHER')).toEqual(ROLE_PERMISSION_DEFAULTS.TEACHER)
  })
})
