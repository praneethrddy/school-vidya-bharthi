import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  notificationCreate: vi.fn(),
  notificationCreateMany: vi.fn(),
  notificationFindMany: vi.fn(),
  notificationCount: vi.fn(),
  notificationUpdateMany: vi.fn(),
  cacheGet: vi.fn(),
  cacheSet: vi.fn(),
  cacheDel: vi.fn(),
  loggerError: vi.fn(),
  loggerWarn: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    notification: {
      create: mocks.notificationCreate,
      createMany: mocks.notificationCreateMany,
      findMany: mocks.notificationFindMany,
      count: mocks.notificationCount,
      updateMany: mocks.notificationUpdateMany,
    },
  },
}))

vi.mock('@/lib/cache', () => ({
  cacheGet: mocks.cacheGet,
  cacheSet: mocks.cacheSet,
  cacheDel: mocks.cacheDel,
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    error: mocks.loggerError,
    warn: mocks.loggerWarn,
  },
}))

import {
  createBulkNotifications,
  createNotification,
  getNotificationsByUser,
  getUnreadCount,
  markAllAsRead,
  markAsRead,
} from '@/lib/notification-service'

describe('notification-service', () => {
  const schoolId = 'school-1'
  const userId = 'user-1'

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.cacheGet.mockResolvedValue(null)
    mocks.cacheSet.mockResolvedValue(undefined)
    mocks.cacheDel.mockResolvedValue(undefined)
  })

  it('TEST-NS-001: createNotification writes a single notification and invalidates unread cache', async () => {
    mocks.notificationCreate.mockResolvedValue({
      id: 'notification-1',
    })

    await createNotification({
      school_id: schoolId,
      user_id: userId,
      title: 'Attendance alert',
      message: 'Student was absent today.',
      type: 'ATTENDANCE',
      link: '/attendance',
    })

    expect(mocks.notificationCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          school_id: schoolId,
          user_id: userId,
          type: 'ATTENDANCE',
        }),
      })
    )
    expect(mocks.cacheDel).toHaveBeenCalledWith('notifications:unread:user-1')
  })

  it('TEST-NS-002: createBulkNotifications writes many records and invalidates each user cache once', async () => {
    mocks.notificationCreateMany.mockResolvedValue({ count: 3 })

    await createBulkNotifications([
      {
        school_id: schoolId,
        user_id: 'user-1',
        title: 'Fee Reminder',
        message: 'Fee due this week',
        type: 'FEE',
      },
      {
        school_id: schoolId,
        user_id: 'user-2',
        title: 'Attendance Alert',
        message: 'Student absent',
        type: 'ATTENDANCE',
      },
      {
        school_id: schoolId,
        user_id: 'user-1',
        title: 'Grade Published',
        message: 'Term grade available',
        type: 'GRADE',
      },
    ])

    expect(mocks.notificationCreateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ school_id: schoolId, user_id: 'user-1', type: 'FEE' }),
          expect.objectContaining({ school_id: schoolId, user_id: 'user-2', type: 'ATTENDANCE' }),
          expect.objectContaining({ school_id: schoolId, user_id: 'user-1', type: 'GRADE' }),
        ]),
      })
    )
    expect(mocks.cacheDel).toHaveBeenCalledTimes(2)
    expect(mocks.cacheDel).toHaveBeenCalledWith('notifications:unread:user-1')
    expect(mocks.cacheDel).toHaveBeenCalledWith('notifications:unread:user-2')
  })

  it('createBulkNotifications no-ops when input list is empty', async () => {
    await createBulkNotifications([])

    expect(mocks.notificationCreateMany).not.toHaveBeenCalled()
    expect(mocks.cacheDel).not.toHaveBeenCalled()
  })

  it('getUnreadCount uses cache hit without querying database', async () => {
    mocks.cacheGet.mockResolvedValue(7)

    const unread = await getUnreadCount(userId, schoolId)

    expect(unread).toBe(7)
    expect(mocks.notificationCount).not.toHaveBeenCalled()
  })

  it('TEST-NS-003: getUnreadCount query is scoped by school_id + user_id on cache miss', async () => {
    mocks.notificationCount.mockResolvedValue(4)

    const unread = await getUnreadCount(userId, schoolId)

    expect(unread).toBe(4)
    expect(mocks.notificationCount).toHaveBeenCalledWith({
      where: {
        school_id: schoolId,
        user_id: userId,
        is_read: false,
      },
    })
    expect(mocks.cacheSet).toHaveBeenCalledWith('notifications:unread:user-1', 4, 30)
  })

  it('markAsRead scopes updates by school and user, then invalidates cache', async () => {
    mocks.notificationUpdateMany.mockResolvedValue({ count: 2 })

    const updatedCount = await markAsRead(['n1', 'n2'], userId, schoolId)

    expect(updatedCount).toBe(2)
    expect(mocks.notificationUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: { in: ['n1', 'n2'] },
          user_id: userId,
          school_id: schoolId,
        }),
      })
    )
    expect(mocks.cacheDel).toHaveBeenCalledWith('notifications:unread:user-1')
  })

  it('markAllAsRead scopes updates by school and user', async () => {
    mocks.notificationUpdateMany.mockResolvedValue({ count: 3 })

    const updatedCount = await markAllAsRead(userId, schoolId)

    expect(updatedCount).toBe(3)
    expect(mocks.notificationUpdateMany).toHaveBeenCalledWith({
      where: {
        user_id: userId,
        school_id: schoolId,
        is_read: false,
      },
      data: {
        is_read: true,
      },
    })
    expect(mocks.cacheDel).toHaveBeenCalledWith('notifications:unread:user-1')
  })

  it('getNotificationsByUser returns paginated result with unread count', async () => {
    mocks.notificationFindMany.mockResolvedValue([
      {
        id: 'n1',
        title: 'Fee reminder',
        message: 'Fees are due this week.',
        type: 'FEE',
        is_read: false,
        link: '/fees',
        created_at: new Date('2026-04-20T10:00:00.000Z'),
      },
    ])
    mocks.notificationCount.mockResolvedValueOnce(1).mockResolvedValueOnce(1)

    const result = await getNotificationsByUser(userId, schoolId, {
      page: 1,
      limit: 20,
      is_read: false,
    })

    expect(result.notifications).toHaveLength(1)
    expect(result.notifications[0].created_at).toBe('2026-04-20T10:00:00.000Z')
    expect(result.pagination).toEqual({
      total: 1,
      page: 1,
      limit: 20,
      total_pages: 1,
    })
    expect(result.unread_count).toBe(1)
    expect(mocks.notificationFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          school_id: schoolId,
          user_id: userId,
          is_read: false,
        },
      })
    )
  })
})
