import { NextRequest } from 'next/server'
import { createAuditLog } from '@/lib/audit'
import { errorResponse, successResponse } from '@/lib/api-helpers'
import {
  configurableRoles,
  filterPrincipalOnlyPermissionIds,
  updateRolePermissionsSchema,
} from '@/lib/school-settings'
import {
  getRequestMetadata,
  requireSchoolPermission,
} from '@/lib/settings-auth'
import {
  invalidatePermissionCache,
} from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

interface PermissionWithRoles {
  id: string
  code: string
  module: string
  name: string
  description: string | null
  is_principal_only: boolean
  granted_to: string[]
}

function groupPermissionsByModule(rows: PermissionWithRoles[]) {
  const grouped = rows.reduce<Record<string, PermissionWithRoles[]>>(
    (accumulator, permission) => {
      if (!accumulator[permission.module]) {
        accumulator[permission.module] = []
      }
      accumulator[permission.module].push(permission)
      return accumulator
    },
    {}
  )

  return Object.keys(grouped)
    .sort((left, right) => left.localeCompare(right))
    .map((module) => ({
      module,
      permissions: grouped[module].sort((left, right) =>
        left.name.localeCompare(right.name)
      ),
    }))
}

async function buildPermissionResponse(schoolId: string) {
  const [permissions, rolePermissions] = await Promise.all([
    prisma.permission.findMany({
      select: {
        id: true,
        code: true,
        module: true,
        name: true,
        description: true,
        is_principal_only: true,
      },
      orderBy: [{ module: 'asc' }, { action: 'asc' }],
    }),
    prisma.rolePermission.findMany({
      where: {
        school_id: schoolId,
      },
      select: {
        role: true,
        permission_id: true,
      },
    }),
  ])

  const grantedRoleByPermissionId = rolePermissions.reduce<Record<string, string[]>>(
    (accumulator, rolePermission) => {
      if (!accumulator[rolePermission.permission_id]) {
        accumulator[rolePermission.permission_id] = []
      }
      accumulator[rolePermission.permission_id].push(rolePermission.role)
      return accumulator
    },
    {}
  )

  const rows: PermissionWithRoles[] = permissions.map((permission) => ({
    id: permission.id,
    code: permission.code,
    module: permission.module,
    name: permission.name,
    description: permission.description,
    is_principal_only: permission.is_principal_only,
    granted_to: (grantedRoleByPermissionId[permission.id] || []).sort(),
  }))

  return {
    modules: groupPermissionsByModule(rows),
    configurable_roles: configurableRoles,
  }
}

export async function GET() {
  const access = await requireSchoolPermission('SETTINGS.manage_permissions', {
    principalOnly: true,
  })
  if (access.error) {
    return access.error
  }

  const payload = await buildPermissionResponse(access.user.schoolId)
  return successResponse(payload)
}

export async function PUT(request: NextRequest) {
  const access = await requireSchoolPermission('SETTINGS.manage_permissions', {
    principalOnly: true,
  })
  if (access.error) {
    return access.error
  }

  const payload = await request.json().catch(() => null)
  const parsedBody = updateRolePermissionsSchema.safeParse(payload)
  if (!parsedBody.success) {
    return errorResponse(
      'VALIDATION_ERROR',
      parsedBody.error.issues[0]?.message || 'Invalid payload',
      400
    )
  }

  const uniquePermissionIds = [...new Set(parsedBody.data.permission_ids)]
  const schoolId = access.user.schoolId

  const permissionRows = await prisma.permission.findMany({
    where: {
      id: {
        in: uniquePermissionIds,
      },
    },
    select: {
      id: true,
      code: true,
      is_principal_only: true,
    },
  })

  if (permissionRows.length !== uniquePermissionIds.length) {
    return errorResponse(
      'VALIDATION_ERROR',
      'One or more permission_ids are invalid',
      400
    )
  }

  const filtered = filterPrincipalOnlyPermissionIds(
    uniquePermissionIds,
    permissionRows
  )

  if (filtered.blocked.length > 0) {
    const blockedPermission = permissionRows.find((permission) =>
      filtered.blocked.includes(permission.id)
    )
    return errorResponse(
      'FORBIDDEN',
      `Permission ${blockedPermission?.code || ''} is principal-only and cannot be delegated`,
      403
    )
  }

  const oldPermissions = await prisma.rolePermission.findMany({
    where: {
      school_id: schoolId,
      role: parsedBody.data.role,
    },
    select: {
      permission_id: true,
    },
  })

  await prisma.$transaction(async (transaction) => {
    await transaction.rolePermission.deleteMany({
      where: {
        school_id: schoolId,
        role: parsedBody.data.role,
      },
    })

    if (filtered.allowed.length > 0) {
      await transaction.rolePermission.createMany({
        data: filtered.allowed.map((permissionId) => ({
          school_id: schoolId,
          role: parsedBody.data.role,
          permission_id: permissionId,
          granted_by: access.user.id,
        })),
      })
    }
  })

  await invalidatePermissionCache(schoolId, parsedBody.data.role)

  await createAuditLog({
    school_id: schoolId,
    user_id: access.user.id,
    action: 'UPDATE',
    entity_type: 'role_permission',
    entity_id: parsedBody.data.role,
    old_value: {
      role: parsedBody.data.role,
      permission_ids: oldPermissions.map((entry) => entry.permission_id),
    },
    new_value: {
      role: parsedBody.data.role,
      permission_ids: filtered.allowed,
    },
    ...getRequestMetadata(request),
  })

  const refreshed = await buildPermissionResponse(schoolId)
  return successResponse({
    role: parsedBody.data.role,
    permission_ids: filtered.allowed,
    ...refreshed,
  })
}

