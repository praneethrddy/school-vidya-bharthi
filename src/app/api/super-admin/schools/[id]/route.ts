import { errorResponse, notFoundResponse, successResponse } from '@/lib/api-helpers'
import { logger } from '@/lib/logger'
import { requireSuperAdmin } from '@/lib/platform-auth'
import { getPlatformSchoolDetail } from '@/lib/saas'

interface RouteContext {
  params: Promise<{
    id: string
  }>
}

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const access = await requireSuperAdmin()
    if (access.error) {
      return access.error
    }

    const { id } = await params
    const school = await getPlatformSchoolDetail(id)

    if (!school) {
      return notFoundResponse('School not found')
    }

    return successResponse({
      school,
    })
  } catch (error) {
    logger.error({ error }, 'Failed to fetch platform school detail')
    return errorResponse(
      'INTERNAL_SERVER_ERROR',
      'Failed to fetch platform school detail',
      500
    )
  }
}
