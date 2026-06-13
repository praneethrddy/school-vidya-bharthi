import { NotificationType } from '@prisma/client'
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { createAuditLog } from '@/lib/audit'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-helpers'
import { logger } from '@/lib/logger'
import {
  getNotificationsByUser,
  getUnreadCount,
  markAllAsRead,
  markAsRead,
} from '@/lib/notification-service'
import { isNotificationType, toPositiveInt } from '@/lib/notification-utils'

interface SessionUser {
  id: string
  role: string
  schoolId: string | null
}

const markReadSchema = z
  .object({
    notification_ids: z.array(z.string().uuid()).optional(),
    mark_all: z.boolean().optional(),
  })
  .refine((value) => value.mark_all === true || (value.notification_ids?.length ?? 0) > 0, {
    message: 'Provide notification_ids or mark_all=true',
  })

function getRequestMetadata(request: NextRequest): { ip_address?: string; user_agent?: string } {
  const forwardedFor = request.headers.get('x-forwarded-for')
  const ipAddress = forwardedFor?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || undefined

  return {
    ip_address: ipAddress,
    user_agent: request.headers.get('user-agent') || undefined,
  }
}

async function requireSchoolUser() {
  const session = await auth()
  if (!session?.user) {
    return { error: unauthorizedResponse('No valid session'), user: null }
  }

  const user = session.user as SessionUser
  if (!user.schoolId) {
    return { error: errorResponse('SCHOOL_REQUIRED', 'School context is missing', 400), user: null }
  }

  return {
    error: null,
    user: {
      id: user.id,
      role: user.role,
      schoolId: user.schoolId,
    },
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<Record<string, string>> }
) {
  await params

  const sessionCheck = await requireSchoolUser()
  if (sessionCheck.error) {
    return sessionCheck.error
  }

  try {
    const { searchParams } = new URL(request.url)
    const isReadParam = searchParams.get('is_read')
    const typeParam = searchParams.get('type')

    if (isReadParam && isReadParam !== 'true' && isReadParam !== 'false') {
      return errorResponse('VALIDATION_ERROR', 'is_read must be true or false', 400)
    }

    if (typeParam && !isNotificationType(typeParam)) {
      return errorResponse(
        'VALIDATION_ERROR',
        'type must be one of ATTENDANCE, FEE, GRADE, ANNOUNCEMENT, HOMEWORK, PTM, GENERAL',
        400
      )
    }

    const page = toPositiveInt(searchParams.get('page'), 1, { min: 1 })
    const limit = toPositiveInt(searchParams.get('limit'), 20, { min: 1, max: 100 })

    const data = await getNotificationsByUser(sessionCheck.user.id, sessionCheck.user.schoolId, {
      is_read: isReadParam ? isReadParam === 'true' : undefined,
      type: (typeParam as NotificationType | null) ?? undefined,
      page,
      limit,
    })

    return successResponse(data)
  } catch (error) {
    logger.error({ error }, 'Failed to fetch notifications')
    return errorResponse('INTERNAL_SERVER_ERROR', 'Failed to fetch notifications', 500)
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<Record<string, string>> }
) {
  await params

  const sessionCheck = await requireSchoolUser()
  if (sessionCheck.error) {
    return sessionCheck.error
  }

  const payload = await request.json().catch(() => null)
  const parsed = markReadSchema.safeParse(payload)
  if (!parsed.success) {
    return errorResponse('VALIDATION_ERROR', parsed.error.issues[0]?.message || 'Invalid payload', 400)
  }

  const { user } = sessionCheck
  const ids = Array.from(new Set(parsed.data.notification_ids ?? []))
  const markAll = parsed.data.mark_all === true

  try {
    let updatedCount = 0

    if (markAll) {
      updatedCount = await markAllAsRead(user.id, user.schoolId)
    } else {
      updatedCount = await markAsRead(ids, user.id, user.schoolId)
    }

    const unreadCount = await getUnreadCount(user.id, user.schoolId)

    await createAuditLog({
      school_id: user.schoolId,
      user_id: user.id,
      action: 'UPDATE',
      entity_type: 'notification',
      entity_id: markAll ? user.id : ids[0] || user.id,
      old_value: {
        mark_all: markAll,
        notification_ids: ids,
      },
      new_value: {
        updated_count: updatedCount,
        unread_count: unreadCount,
      },
      ...getRequestMetadata(request),
    })

    return successResponse({
      unread_count: unreadCount,
    })
  } catch (error) {
    logger.error({ error }, 'Failed to update notifications')
    return errorResponse('INTERNAL_SERVER_ERROR', 'Failed to update notifications', 500)
  }
}
