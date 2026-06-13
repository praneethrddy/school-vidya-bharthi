import { auth } from '@/lib/auth'
import {
  errorResponse,
  successResponse,
  unauthorizedResponse,
} from '@/lib/api-helpers'
import { logger } from '@/lib/logger'
import { getPermissionsForRole } from '@/lib/permissions'
import { NextRequest } from 'next/server'

interface SessionUser {
  id: string
  role: string
  schoolId: string | null
}

export async function GET(_request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return unauthorizedResponse('No valid session')
    }

    const user = session.user as SessionUser
    const schoolId = user.schoolId || null

    if (!schoolId && user.role !== 'SUPER_ADMIN') {
      return errorResponse('SCHOOL_REQUIRED', 'School context is missing for this account', 400)
    }

    const permissions = await getPermissionsForRole(schoolId, user.role)

    return successResponse({
      user_id: user.id,
      role: user.role,
      school_id: schoolId,
      permissions,
    })
  } catch (error) {
    logger.error({ error }, 'Failed to fetch current user permissions')
    return errorResponse('INTERNAL_SERVER_ERROR', 'Failed to fetch current user permissions', 500)
  }
}
