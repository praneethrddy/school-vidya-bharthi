import { NotificationType } from '@prisma/client'
import { cacheDel, cacheGet, cacheSet } from './cache'
import { logger } from './logger'
import { prisma } from './prisma'

export interface CreateNotificationParams {
  school_id: string
  user_id: string
  title: string
  message: string
  type: NotificationType
  link?: string
}

export interface NotificationFilters {
  is_read?: boolean
  type?: NotificationType
  page?: number
  limit?: number
}

export interface NotificationListItem {
  id: string
  title: string
  message: string
  type: NotificationType
  is_read: boolean
  link: string | null
  created_at: string
}

export interface NotificationListResult {
  notifications: NotificationListItem[]
  unread_count: number
  pagination: {
    total: number
    page: number
    limit: number
    total_pages: number
  }
}

const UNREAD_CACHE_TTL_SECONDS = 30

function getUnreadCacheKey(userId: string): string {
  return `notifications:unread:${userId}`
}

export async function invalidateUnreadCountCache(userId: string): Promise<void> {
  try {
    await cacheDel(getUnreadCacheKey(userId))
  } catch (error) {
    logger.warn({ error, userId }, 'Failed to invalidate notification unread cache')
  }
}

export async function createNotification(params: CreateNotificationParams): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        school_id: params.school_id,
        user_id: params.user_id,
        title: params.title,
        message: params.message,
        type: params.type,
        link: params.link,
      },
    })

    await invalidateUnreadCountCache(params.user_id)
  } catch (error) {
    logger.error({ error, params }, 'Failed to create notification')
  }
}

export async function createBulkNotifications(params: CreateNotificationParams[]): Promise<void> {
  if (params.length === 0) {
    return
  }

  try {
    await prisma.notification.createMany({
      data: params,
    })

    await Promise.all(
      Array.from(new Set(params.map((item) => item.user_id))).map((userId) =>
        invalidateUnreadCountCache(userId)
      )
    )
  } catch (error) {
    logger.error({ error }, 'Failed to create bulk notifications')
  }
}

export async function getNotificationsByUser(
  userId: string,
  schoolId: string,
  filters: NotificationFilters = {}
): Promise<NotificationListResult> {
  const page = Math.max(1, filters.page ?? 1)
  const limit = Math.min(100, Math.max(1, filters.limit ?? 20))
  const skip = (page - 1) * limit

  const where = {
    school_id: schoolId,
    user_id: userId,
    ...(filters.is_read !== undefined ? { is_read: filters.is_read } : {}),
    ...(filters.type ? { type: filters.type } : {}),
  }

  const [rows, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { created_at: 'desc' },
      skip,
      take: limit,
    }),
    prisma.notification.count({ where }),
    getUnreadCount(userId, schoolId),
  ])

  return {
    notifications: rows.map((row) => ({
      id: row.id,
      title: row.title,
      message: row.message,
      type: row.type,
      is_read: row.is_read,
      link: row.link,
      created_at: row.created_at.toISOString(),
    })),
    unread_count: unreadCount,
    pagination: {
      total,
      page,
      limit,
      total_pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  }
}

export async function getUnreadCount(userId: string, schoolId: string): Promise<number> {
  const cacheKey = getUnreadCacheKey(userId)

  try {
    const cachedCount = await cacheGet<number>(cacheKey)
    if (typeof cachedCount === 'number') {
      return cachedCount
    }
  } catch (error) {
    logger.warn({ error, userId }, 'Failed to read notification unread cache')
  }

  try {
    const count = await prisma.notification.count({
      where: {
        school_id: schoolId,
        user_id: userId,
        is_read: false,
      },
    })

    await cacheSet(cacheKey, count, UNREAD_CACHE_TTL_SECONDS)
    return count
  } catch (error) {
    logger.error({ error, userId, schoolId }, 'Failed to get unread notifications count')
    return 0
  }
}

export async function markAsRead(
  notificationIds: string[],
  userId: string,
  schoolId: string
): Promise<number> {
  if (notificationIds.length === 0) {
    return 0
  }

  try {
    const result = await prisma.notification.updateMany({
      where: {
        id: { in: notificationIds },
        user_id: userId,
        school_id: schoolId,
        is_read: false,
      },
      data: { is_read: true },
    })

    if (result.count > 0) {
      await invalidateUnreadCountCache(userId)
    }

    return result.count
  } catch (error) {
    logger.error({ error }, 'Failed to mark notifications as read')
    return 0
  }
}

export async function markAllAsRead(userId: string, schoolId: string): Promise<number> {
  try {
    const result = await prisma.notification.updateMany({
      where: {
        user_id: userId,
        school_id: schoolId,
        is_read: false,
      },
      data: {
        is_read: true,
      },
    })

    if (result.count > 0) {
      await invalidateUnreadCountCache(userId)
    }

    return result.count
  } catch (error) {
    logger.error({ error }, 'Failed to mark all notifications as read')
    return 0
  }
}
