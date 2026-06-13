import { errorResponse, successResponse } from '@/lib/api-helpers'
import { logger } from '@/lib/logger'
import { requireSuperAdmin } from '@/lib/platform-auth'
import { getPlatformAnalytics } from '@/lib/saas'

export async function GET() {
  try {
    const access = await requireSuperAdmin()
    if (access.error) {
      return access.error
    }

    const analytics = await getPlatformAnalytics()
    return successResponse(analytics)
  } catch (error) {
    logger.error({ error }, 'Failed to fetch platform analytics')
    return errorResponse(
      'INTERNAL_SERVER_ERROR',
      'Failed to fetch platform analytics',
      500
    )
  }
}
