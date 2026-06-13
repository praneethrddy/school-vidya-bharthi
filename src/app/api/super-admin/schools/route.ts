import { errorResponse, successResponse } from '@/lib/api-helpers'
import { logger } from '@/lib/logger'
import { requireSuperAdmin } from '@/lib/platform-auth'
import { listPlatformSchools } from '@/lib/saas'

export async function GET() {
  try {
    const access = await requireSuperAdmin()
    if (access.error) {
      return access.error
    }

    const schools = await listPlatformSchools()
    return successResponse({
      schools,
    })
  } catch (error) {
    logger.error({ error }, 'Failed to list platform schools')
    return errorResponse(
      'INTERNAL_SERVER_ERROR',
      'Failed to list platform schools',
      500
    )
  }
}
