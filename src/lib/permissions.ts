import { cacheDel, cacheGet, cacheSet } from './cache'
import { prisma } from './prisma'
import { logger } from './logger'
import {
  PRINCIPAL_ONLY_PERMISSION_SET,
  ROLE_PERMISSION_DEFAULTS,
  type AppRole,
  type ConfigurableRole,
} from './permission-config'

const FIXED_ROLE_PERMISSIONS: Record<'STUDENT' | 'PARENT', string[]> = {
  STUDENT: [
    'ATTENDANCE.view_own_class',
    'GRADES.view_own_subject',
    'FEES.view_structure',
    'TIMETABLE.view',
    'HOMEWORK.view',
    'ANNOUNCEMENTS.view',
  ],
  PARENT: [
    'ATTENDANCE.view_own_class',
    'GRADES.view_own_subject',
    'FEES.view_structure',
    'TIMETABLE.view',
    'ANNOUNCEMENTS.view',
  ],
}

export async function hasPermission(
  schoolId: string | null | undefined,
  role: AppRole | string,
  permissionCode: string
): Promise<boolean> {
  if (role === 'SUPER_ADMIN' || role === 'PRINCIPAL') {
    return true
  }

  if (role === 'STUDENT' || role === 'PARENT') {
    return FIXED_ROLE_PERMISSIONS[role].includes(permissionCode)
  }

  if (!schoolId) {
    return false
  }

  const cacheKey = `permissions:${schoolId}:${role}`
  try {
    const cached = await cacheGet<string[]>(cacheKey)
    if (cached) {
      return cached.includes(permissionCode)
    }
  } catch {
    // Fall through to DB query
  }

  const rolePermissions = await prisma.rolePermission.findMany({
    where: { school_id: schoolId, role: role as ConfigurableRole },
    include: { permission: true },
  })

  const codes = rolePermissions.map((rolePermission) => rolePermission.permission.code)
  try {
    await cacheSet(cacheKey, codes, 3600)
  } catch (error) {
    logger.warn({ error, cacheKey }, 'Permission cache set failed')
  }

  return codes.includes(permissionCode)
}

export async function getPermissionsForRole(
  schoolId: string | null | undefined,
  role: AppRole | string
): Promise<string[]> {
  if (role === 'SUPER_ADMIN' || role === 'PRINCIPAL') {
    const allPermissions = await prisma.permission.findMany({
      select: { code: true },
    })
    return allPermissions.map((permission) => permission.code)
  }

  if (role === 'STUDENT' || role === 'PARENT') {
    return FIXED_ROLE_PERMISSIONS[role]
  }

  if (!schoolId) {
    return []
  }

  const cacheKey = `permissions:${schoolId}:${role}`
  try {
    const cached = await cacheGet<string[]>(cacheKey)
    if (cached) {
      return cached
    }
  } catch {
    // Graceful fallback to DB
  }

  const rolePermissions = await prisma.rolePermission.findMany({
    where: { school_id: schoolId, role: role as ConfigurableRole },
    include: { permission: true },
  })

  const codes = rolePermissions.map((rolePermission) => rolePermission.permission.code)
  try {
    await cacheSet(cacheKey, codes, 3600)
  } catch {
    // Graceful fallback to DB only
  }
  return codes
}

export function isPrincipalOnly(permissionCode: string): boolean {
  return PRINCIPAL_ONLY_PERMISSION_SET.has(permissionCode)
}

export function getDefaultPermissionsForRole(role: ConfigurableRole): string[] {
  return ROLE_PERMISSION_DEFAULTS[role]
}

export async function invalidatePermissionCache(
  schoolId: string,
  role: ConfigurableRole | string
): Promise<void> {
  const cacheKey = `permissions:${schoolId}:${role}`
  try {
    await cacheDel(cacheKey)
  } catch (error) {
    logger.warn({ error, cacheKey }, 'Failed to invalidate permission cache')
  }
}
