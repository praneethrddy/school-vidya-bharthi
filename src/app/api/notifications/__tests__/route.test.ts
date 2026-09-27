import { NextRequest } from 'next/server'
import { z } from 'zod'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const notificationItemSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  message: z.string(),
  type: z.enum(['ATTENDANCE', 'FEE', 'GRADE', 'ANNOUNCEMENT', 'HOMEWORK', 'PTM', 'GENERAL']),
  is_read: z.boolean(),
  link: z.string().nullable(),
  created_at: z.string(),
})

const notificationListResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    notifications: z.array(notificationItemSchema),
    unread_count: z.number().int().nonnegative(),
    pagination: z.object({
      total: z.number().int().nonnegative(),
      page: z.number().int().min(1),
      limit: z.number().int().min(1),
      total_pages: z.number().int().nonnegative(),
    }),
  }),
})

const unreadCountResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    unread_count: z.number().int().nonnegative(),
  }),
})

const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
})

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  getNotificationsByUser: vi.fn(),
  markAsRead: vi.fn(),
  markAllAsRead: vi.fn(),
  getUnreadCount: vi.fn(),
  createAuditLog: vi.fn(),
  loggerError: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  auth: mocks.auth,
}))

vi.mock('@/lib/notification-service', () => ({
  getNotificationsByUser: mocks.getNotificationsByUser,
  markAsRead: mocks.markAsRead,
  markAllAsRead: mocks.markAllAsRead,
  getUnreadCount: mocks.getUnreadCount,
}))

vi.mock('@/lib/audit', () => ({
  createAuditLog: mocks.createAuditLog,
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    error: mocks.loggerError,
  },
}))

import { GET, PATCH } from '../route'

describe('/api/notifications route tests', () => {
  const singleNotificationId = '11111111-1111-4111-8111-111111111111'
  const secondNotificationId = '22222222-2222-4222-8222-222222222222'

  beforeEach(() => {
    vi.clearAllMocks()

    mocks.auth.mockResolvedValue({
      user: {
        id: 'user-1',
        role: 'STUDENT',
        schoolId: 'school-1',
      },
    })

    mocks.getNotificationsByUser.mockResolvedValue({
      notifications: [
        {
          id: singleNotificationId,
          title: 'Fee Reminder',
          message: 'Monthly fee due tomorrow',
          type: 'FEE',
          is_read: false,
          link: '/fees',
          created_at: '2026-04-20T10:00:00.000Z',
        },
      ],
      unread_count: 3,
      pagination: {
        total: 1,
        page: 2,
        limit: 10,
        total_pages: 1,
      },
    })

    mocks.markAsRead.mockResolvedValue(1)
    mocks.markAllAsRead.mockResolvedValue(3)
    mocks.getUnreadCount.mockResolvedValue(2)
    mocks.createAuditLog.mockResolvedValue(undefined)
  })

  it('TEST-NOTIF-004: GET returns 401 when session is missing', async () => {
    mocks.auth.mockResolvedValueOnce(null)

    const request = new NextRequest('http://localhost/api/notifications')
    const response = await GET(request, { params: Promise.resolve({}) })
    const payload = await response.json()

    expect(response.status).toBe(401)
    expect(errorResponseSchema.safeParse(payload).success).toBe(true)
    expect(payload.error.code).toBe('UNAUTHORIZED')
  })

  it('TEST-NOTIF-001: GET returns paginated notifications with status and response shape', async () => {
    const request = new NextRequest(
      'http://localhost/api/notifications?is_read=false&type=FEE&page=2&limit=10'
    )

    const response = await GET(request, { params: Promise.resolve({}) })
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(notificationListResponseSchema.safeParse(payload).success).toBe(true)
    expect(mocks.getNotificationsByUser).toHaveBeenCalledWith('user-1', 'school-1', {
      is_read: false,
      type: 'FEE',
      page: 2,
      limit: 10,
    })
  })

  it('TEST-NOTIF-005: GET enforces user_id + school_id scoping in service call', async () => {
    const request = new NextRequest(
      'http://localhost/api/notifications?user_id=attacker-user&school_id=other-school'
    )

    const response = await GET(request, { params: Promise.resolve({}) })
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(notificationListResponseSchema.safeParse(payload).success).toBe(true)
    expect(mocks.getNotificationsByUser).toHaveBeenCalledWith('user-1', 'school-1', {
      is_read: undefined,
      type: undefined,
      page: 1,
      limit: 20,
    })
  })

  it('GET rejects invalid type filter with validation error payload', async () => {
    const request = new NextRequest('http://localhost/api/notifications?type=INVALID')
    const response = await GET(request, { params: Promise.resolve({}) })
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(errorResponseSchema.safeParse(payload).success).toBe(true)
    expect(payload.error.code).toBe('VALIDATION_ERROR')
  })

  it('GET rejects invalid is_read filter with validation error payload', async () => {
    const request = new NextRequest('http://localhost/api/notifications?is_read=invalid')
    const response = await GET(request, { params: Promise.resolve({}) })
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(errorResponseSchema.safeParse(payload).success).toBe(true)
    expect(payload.error.code).toBe('VALIDATION_ERROR')
  })

  it('TEST-NOTIF-004: PATCH returns 401 when session is missing', async () => {
    mocks.auth.mockResolvedValueOnce(null)

    const request = new NextRequest('http://localhost/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mark_all: true }),
    })

    const response = await PATCH(request, { params: Promise.resolve({}) })
    const payload = await response.json()

    expect(response.status).toBe(401)
    expect(errorResponseSchema.safeParse(payload).success).toBe(true)
    expect(payload.error.code).toBe('UNAUTHORIZED')
  })

  it('TEST-NOTIF-002: PATCH marks selected notifications as read and writes audit log', async () => {
    const request = new NextRequest('http://localhost/api/notifications', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': '203.0.113.10, 198.51.100.5',
        'user-agent': 'vitest-agent',
      },
      body: JSON.stringify({
        notification_ids: [singleNotificationId, singleNotificationId, secondNotificationId],
      }),
    })

    const response = await PATCH(request, { params: Promise.resolve({}) })
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(unreadCountResponseSchema.safeParse(payload).success).toBe(true)
    expect(mocks.markAsRead).toHaveBeenCalledWith(
      [singleNotificationId, secondNotificationId],
      'user-1',
      'school-1'
    )
    expect(mocks.getUnreadCount).toHaveBeenCalledWith('user-1', 'school-1')
    expect(mocks.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        school_id: 'school-1',
        user_id: 'user-1',
        action: 'UPDATE',
        entity_type: 'notification',
        entity_id: singleNotificationId,
        old_value: {
          mark_all: false,
          notification_ids: [singleNotificationId, secondNotificationId],
        },
        new_value: {
          updated_count: 1,
          unread_count: 2,
        },
        ip_address: '203.0.113.10',
        user_agent: 'vitest-agent',
      })
    )
  })

  it('TEST-NOTIF-002: PATCH supports mark_all flow and records audit entry', async () => {
    const request = new NextRequest('http://localhost/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mark_all: true }),
    })

    const response = await PATCH(request, { params: Promise.resolve({}) })
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(unreadCountResponseSchema.safeParse(payload).success).toBe(true)
    expect(mocks.markAllAsRead).toHaveBeenCalledWith('user-1', 'school-1')
    expect(mocks.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        school_id: 'school-1',
        user_id: 'user-1',
        action: 'UPDATE',
        entity_type: 'notification',
        entity_id: 'user-1',
        old_value: {
          mark_all: true,
          notification_ids: [],
        },
      })
    )
  })

  it('PATCH validates payload and does not create audit log on validation failure', async () => {
    const request = new NextRequest('http://localhost/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notification_ids: [] }),
    })

    const response = await PATCH(request, { params: Promise.resolve({}) })
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(errorResponseSchema.safeParse(payload).success).toBe(true)
    expect(payload.error.code).toBe('VALIDATION_ERROR')
    expect(mocks.markAsRead).not.toHaveBeenCalled()
    expect(mocks.markAllAsRead).not.toHaveBeenCalled()
    expect(mocks.createAuditLog).not.toHaveBeenCalled()
  })
})
