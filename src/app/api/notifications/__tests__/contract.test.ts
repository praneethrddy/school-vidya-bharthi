import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import {
  NotificationsResponseSchema,
  ErrorResponseSchema,
} from '@/test/contracts/schemas'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  getNotificationsByUser: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  auth: mocks.auth,
}))

vi.mock('@/lib/notification-service', () => ({
  getNotificationsByUser: mocks.getNotificationsByUser,
  getUnreadCount: vi.fn(),
  markAllAsRead: vi.fn(),
  markAsRead: vi.fn(),
}))

import { GET } from '../route'

describe('Notifications API Contract Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.auth.mockResolvedValue({
      user: { id: '00000000-0000-0000-0000-000000000000', role: 'STUDENT', schoolId: '00000000-0000-0000-0000-000000000001' },
    })
  })

  it('[TEST-CONTRACT-018] GET /api/notifications returns valid NotificationsResponse shape', async () => {
    mocks.getNotificationsByUser.mockResolvedValue({
      notifications: [
        {
          id: '11111111-1111-1111-1111-111111111111',
          title: 'New Announcement',
          message: 'Announcing a new school holiday.',
          type: 'ANNOUNCEMENT',
          is_read: false,
          link: null,
          created_at: new Date('2026-05-20').toISOString(),
        },
      ],
      unread_count: 1,
      pagination: {
        total: 1,
        page: 1,
        limit: 20,
        total_pages: 1,
      },
    })

    const request = new NextRequest('http://localhost/api/notifications')
    const response = await GET(request, { params: Promise.resolve({}) })
    const payload = await response.json()

    expect(response.status).toBe(200)
    const result = NotificationsResponseSchema.safeParse(payload)
    expect(result.success).toBe(true)
  })

  it('[TEST-CONTRACT-020] GET /api/notifications fails with unauthorized error response shape', async () => {
    mocks.auth.mockResolvedValue(null)
    const request = new NextRequest('http://localhost/api/notifications')
    const response = await GET(request, { params: Promise.resolve({}) })
    const payload = await response.json()

    expect(response.status).toBe(401)
    const result = ErrorResponseSchema.safeParse(payload)
    expect(result.success).toBe(true)
  })
})
