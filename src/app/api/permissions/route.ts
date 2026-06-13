import { auth } from '@/lib/auth'
import { createAuditLog } from '@/lib/audit'
import {
  errorResponse,
  forbiddenResponse,
  successResponse,
  unauthorizedResponse,
} from '@/lib/api-helpers'
import { logger } from '@/lib/logger'
import {
  CONFIGURABLE_ROLES,
  PERMISSION_MODULE_ORDER,
  isConfigurableRole,
  type ConfigurableRole,
} from '@/lib/permission-config'
import { invalidatePermissionCache } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { z } from 'zod'

interface SessionUser {
  id: string
  role: string
  schoolId: string | null
}

interface PermissionRow {
  id: string
  code: string
  module: string
  action: string
  name: string
  description: string | null
  is_principal_only: boolean
  is_granted: boolean
}

const updatePermissionsSchema = z.object({
  role: z.enum(CONFIGURABLE_ROLES),
  permissions: z.array(
    z.object({
      permission_id: z.string().uuid(),
      granted: z.boolean(),
    })
  ),
})

function getSchoolScope(request: NextRequest, user: SessionUser): string | null {
  if (user.schoolId) {
    return user.schoolId
  }

  if (user.role === 'SUPER_ADMIN') {
    const schoolId = request.nextUrl.searchParams.get('school_id')
    return schoolId || null
  }

  return null
}

function canManagePermissions(role: string): boolean {
  return role === 'PRINCIPAL' || role === 'SUPER_ADMIN'
}

function toGroupedPermissions(rows: PermissionRow[]): Array<{ module: string; permissions: PermissionRow[] }> {
  const groupedMap = rows.reduce<Record<string, PermissionRow[]>>((accumulator, row) => {
    if (!accumulator[row.module]) {
      accumulator[row.module] = []
    }
    accumulator[row.module].push(row)
    return accumulator
  }, {})

  return [...PERMISSION_MODULE_ORDER]
    .map((module) => ({ module, permissions: groupedMap[module] || [] }))
    .filter((entry) => entry.permissions.length > 0)
}

async function buildPermissionPayload(schoolId: string, role: ConfigurableRole) {
  const [permissions, granted] = await Promise.all([
    prisma.permission.findMany({
      select: {
        id: true,
        code: true,
        module: true,
        action: true,
        name: true,
        description: true,
        is_principal_only: true,
      },
      orderBy: [{ module: 'asc' }, { action: 'asc' }],
    }),
    prisma.rolePermission.findMany({
      where: { school_id: schoolId, role },
      select: { permission_id: true },
    }),
  ])

  const grantedIds = new Set(granted.map((entry) => entry.permission_id))
  const rows: PermissionRow[] = permissions.map((permission) => ({
    ...permission,
    is_granted: grantedIds.has(permission.id),
  }))

  return {
    role,
    permissions: rows,
    grouped_permissions: toGroupedPermissions(rows),
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return unauthorizedResponse('No valid session')
    }

    const user = session.user as SessionUser
    if (!canManagePermissions(user.role)) {
      return forbiddenResponse('Only Principal or Super Admin can view role permissions')
    }

    const role = request.nextUrl.searchParams.get('role')
    if (!role || !isConfigurableRole(role)) {
      return errorResponse(
        'INVALID_ROLE',
        'role query parameter is required and must be STAFF_ADMIN, STUDENT_ADMIN, ACCOUNTANT, or TEACHER',
        400
      )
    }

    const schoolId = getSchoolScope(request, user)
    if (!schoolId) {
      return errorResponse('SCHOOL_REQUIRED', 'School context is required to manage permissions', 400)
    }

    const payload = await buildPermissionPayload(schoolId, role)
    return successResponse(payload)
  } catch (error) {
    logger.error({ error }, 'Failed to fetch permissions')
    return errorResponse('INTERNAL_SERVER_ERROR', 'Failed to fetch permissions', 500)
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return unauthorizedResponse('No valid session')
    }

    const user = session.user as SessionUser
    if (!canManagePermissions(user.role)) {
      return forbiddenResponse('Only Principal or Super Admin can update role permissions')
    }

    const schoolId = getSchoolScope(request, user)
    if (!schoolId) {
      return errorResponse('SCHOOL_REQUIRED', 'School context is required to manage permissions', 400)
    }

    const parsedBody = updatePermissionsSchema.safeParse(await request.json())
    if (!parsedBody.success) {
      return errorResponse(
        'VALIDATION_ERROR',
        parsedBody.error.issues[0]?.message || 'Invalid payload',
        400
      )
    }

    const { role, permissions } = parsedBody.data
    const permissionIds = permissions.map((permission) => permission.permission_id)

    if (new Set(permissionIds).size !== permissionIds.length) {
      return errorResponse('VALIDATION_ERROR', 'Duplicate permission_id values are not allowed', 400)
    }

    const permissionRecords = await prisma.permission.findMany({
      where: { id: { in: permissionIds } },
      select: {
        id: true,
        code: true,
        is_principal_only: true,
      },
    })

    if (permissionRecords.length !== permissionIds.length) {
      return errorResponse('INVALID_PERMISSION', 'One or more permission_ids do not exist', 400)
    }

    const payloadByPermissionId = new Map(
      permissions.map((permission) => [permission.permission_id, permission.granted])
    )
    const principalOnlyRecord = permissionRecords.find((permission) => {
      return permission.is_principal_only && payloadByPermissionId.get(permission.id) === true
    })
    if (principalOnlyRecord) {
      return forbiddenResponse(
        `Permission ${principalOnlyRecord.code} is reserved for Principal only and cannot be delegated`
      )
    }

    const permissionById = new Map(permissionRecords.map((record) => [record.id, record]))
    const grantedIds = permissions
      .filter((permission) => permission.granted)
      .map((permission) => permission.permission_id)

    const auditContext = {
      school_id: schoolId,
      user_id: user.id,
      ip_address:
        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        request.headers.get('x-real-ip') ||
        undefined,
      user_agent: request.headers.get('user-agent') || undefined,
    }

    await prisma.$transaction(async (transaction) => {
      const existing = await transaction.rolePermission.findMany({
        where: { school_id: schoolId, role },
        select: { permission_id: true },
      })

      const oldGrantedIds = new Set(existing.map((entry) => entry.permission_id))
      const newGrantedIds = new Set(grantedIds)
      const changedPermissionIds = [...new Set([...oldGrantedIds, ...newGrantedIds])].filter(
        (permissionId) => oldGrantedIds.has(permissionId) !== newGrantedIds.has(permissionId)
      )

      await transaction.rolePermission.deleteMany({
        where: { school_id: schoolId, role },
      })

      if (grantedIds.length > 0) {
        await transaction.rolePermission.createMany({
          data: grantedIds.map((permissionId) => ({
            school_id: schoolId,
            role,
            permission_id: permissionId,
            granted_by: user.id,
          })),
        })
      }

      await Promise.all(
        changedPermissionIds.map(async (permissionId) => {
          const permissionMeta = permissionById.get(permissionId)
          await createAuditLog({
            ...auditContext,
            action: 'UPDATE',
            entity_type: 'role_permission',
            entity_id: permissionId,
            old_value: {
              role,
              permission_id: permissionId,
              permission_code: permissionMeta?.code,
              granted: oldGrantedIds.has(permissionId),
            },
            new_value: {
              role,
              permission_id: permissionId,
              permission_code: permissionMeta?.code,
              granted: newGrantedIds.has(permissionId),
            },
          })
        })
      )
    })

    await invalidatePermissionCache(schoolId, role)
    const payload = await buildPermissionPayload(schoolId, role)
    return successResponse(payload)
  } catch (error) {
    logger.error({ error }, 'Failed to update permissions')
    return errorResponse('INTERNAL_SERVER_ERROR', 'Failed to update permissions', 500)
  }
}
