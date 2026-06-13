import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import NotificationsClient from '../notifications-client'

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  toastError: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mocks.push,
  }),
}))

vi.mock('sonner', () => ({
  toast: {
    error: mocks.toastError,
    success: vi.fn(),
  },
}))

vi.mock('@/components/shared/notification-list', () => ({
  NotificationList: () => <div data-testid="notification-list">list</div>,
}))

describe('NotificationsClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL | Request) => {
        const url = typeof input === 'string' ? input : input.toString()

        if (url.startsWith('/api/notifications?')) {
          return {
            ok: true,
            json: async () => ({
              success: true,
              data: {
                notifications: [],
                unread_count: 0,
                pagination: {
                  total: 0,
                  page: 1,
                  limit: 20,
                  total_pages: 0,
                },
              },
            }),
          } as Response
        }

        return {
          ok: true,
          json: async () => ({
            success: true,
            data: {
              unread_count: 0,
            },
          }),
        } as Response
      })
    )
  })

  it('applies ATTENDANCE filter to API query and renders typed empty state', async () => {
    render(<NotificationsClient initialFilter="ATTENDANCE" />)

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/notifications?page=1&limit=20&type=ATTENDANCE'),
        expect.any(Object)
      )
    })

    expect(screen.getByText('No Attendance notifications')).toBeInTheDocument()
  })

  it('applies UNREAD filter to API query and renders unread empty state', async () => {
    render(<NotificationsClient initialFilter="UNREAD" />)

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/notifications?page=1&limit=20&is_read=false'),
        expect.any(Object)
      )
    })

    expect(screen.getByText(/All notifications read/i)).toBeInTheDocument()
  })
})

