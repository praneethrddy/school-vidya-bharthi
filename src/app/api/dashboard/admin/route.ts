import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { errorResponse, forbiddenResponse, successResponse, unauthorizedResponse } from '@/lib/api-helpers'
import {
  getAdminDashboardData,
  isAdminDashboardRole,
  resolveAdminDashboardSchoolId,
} from '@/lib/admin-dashboard'
import { getPermissionsForRole } from '@/lib/permissions'
import { logger } from '@/lib/logger'

export async function GET(_req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return unauthorizedResponse('No valid session')
    }

    const role = session.user.role
    if (!isAdminDashboardRole(role)) {
      return forbiddenResponse('Only admin roles can access the admin dashboard')
    }

    const schoolId = await resolveAdminDashboardSchoolId(session.user.schoolId, role)

    if (!schoolId) {
      return errorResponse('SCHOOL_REQUIRED', 'No school identified for dashboard access', 400)
    }

    const permissions = await getPermissionsForRole(schoolId, role)
    const payload = await getAdminDashboardData({
      schoolId,
      userId: session.user.id,
      role,
      permissions,
    })

    return successResponse(payload)
  } catch (error) {
    logger.error({ error }, 'Admin dashboard API failed')
    return errorResponse('INTERNAL_SERVER_ERROR', 'Failed to fetch dashboard data', 500)
  }
}
