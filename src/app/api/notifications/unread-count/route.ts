import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-helpers'
import { logger } from '@/lib/logger'
import { getUnreadCount } from '@/lib/notification-service'

interface SessionUser {
  id: string
  schoolId: string | null
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<Record<string, string>> }
) {
  await params

  try {
    const session = await auth()
    if (!session?.user) {
      return unauthorizedResponse('No valid session')
    }

    const user = session.user as SessionUser
    if (!user.schoolId) {
      return errorResponse('SCHOOL_REQUIRED', 'School context is missing', 400)
    }

    const unreadCount = await getUnreadCount(user.id, user.schoolId)
    return successResponse({ unread_count: unreadCount })
  } catch (error) {
    logger.error({ error }, 'Failed to fetch unread notification count')
    return errorResponse('INTERNAL_SERVER_ERROR', 'Failed to fetch unread notification count', 500)
  }
}
