'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BellRing, CheckCheck, Loader2 } from 'lucide-react'
import { NotificationList } from '@/components/shared/notification-list'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { NOTIFICATION_TYPES, type AppNotificationType } from '@/lib/notification-utils'

type NotificationApiItem = {
  id: string
  title: string
  message: string
  type: AppNotificationType
  is_read: boolean
  link: string | null
  created_at: string
}

interface NotificationsPayload {
  success?: boolean
  data?: {
    notifications?: NotificationApiItem[]
    unread_count?: number
    pagination?: {
      total?: number
      page?: number
      limit?: number
      total_pages?: number
    }
  }
}

interface MarkReadPayload {
  success?: boolean
  data?: {
    unread_count?: number
  }
}

const PAGE_SIZE = 20

const FILTER_LABELS: Record<NotificationFilterValue, string> = {
  ALL: 'All',
  UNREAD: 'Unread',
  ATTENDANCE: 'Attendance',
  FEE: 'Fees',
  GRADE: 'Grades',
  ANNOUNCEMENT: 'Announcements',
  HOMEWORK: 'Homework',
  PTM: 'PTM',
  GENERAL: 'General',
}

const FILTER_ORDER: NotificationFilterValue[] = [
  'ALL',
  'UNREAD',
  'ATTENDANCE',
  'FEE',
  'GRADE',
  'ANNOUNCEMENT',
  'HOMEWORK',
  'PTM',
]

export type NotificationFilterValue = 'ALL' | 'UNREAD' | AppNotificationType

interface NotificationsClientProps {
  initialFilter: NotificationFilterValue
}

function toFilterType(filter: NotificationFilterValue): AppNotificationType | null {
  if ((NOTIFICATION_TYPES as readonly string[]).includes(filter)) {
    return filter as AppNotificationType
  }

  return null
}

function buildEmptyStateMessage(filter: NotificationFilterValue): string {
  if (filter === 'ALL') {
    return "You're all caught up! No notifications."
  }

  if (filter === 'UNREAD') {
    return 'All notifications read ✓'
  }

  return `No ${FILTER_LABELS[filter]} notifications`
}

export default function NotificationsClient({ initialFilter }: NotificationsClientProps) {
  const router = useRouter()
  const [activeFilter, setActiveFilter] = useState<NotificationFilterValue>(initialFilter)
  const [notifications, setNotifications] = useState<NotificationApiItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [isMarkingAll, setIsMarkingAll] = useState(false)
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set())

  const fetchNotifications = useCallback(
    async (targetPage: number, append: boolean) => {
      const params = new URLSearchParams()
      params.set('page', String(targetPage))
      params.set('limit', String(PAGE_SIZE))

      if (activeFilter === 'UNREAD') {
        params.set('is_read', 'false')
      } else {
        const type = toFilterType(activeFilter)
        if (type) {
          params.set('type', type)
        }
      }

      if (append) {
        setIsLoadingMore(true)
      } else {
        setIsLoading(true)
      }

      try {
        const response = await fetch(`/api/notifications?${params.toString()}`, {
          cache: 'no-store',
        })

        if (!response.ok) {
          throw new Error('Failed to fetch notifications')
        }

        const payload = (await response.json()) as NotificationsPayload
        const list = payload.data?.notifications ?? []
        const pagination = payload.data?.pagination

        setNotifications((previous) => (append ? [...previous, ...list] : list))
        setUnreadCount(payload.data?.unread_count ?? 0)
        setPage(pagination?.page ?? targetPage)
        setTotalPages(pagination?.total_pages ?? 0)
      } catch (error) {
        console.error(error)
        toast.error('Unable to load notifications right now.')
      } finally {
        setIsLoading(false)
        setIsLoadingMore(false)
      }
    },
    [activeFilter]
  )

  useEffect(() => {
    void fetchNotifications(1, false)
  }, [fetchNotifications])

  const handleMarkReadRequest = useCallback(async (body: Record<string, unknown>) => {
    const response = await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      throw new Error('Failed to update notification status')
    }

    const payload = (await response.json()) as MarkReadPayload
    return payload.data?.unread_count ?? 0
  }, [])

  const handleMarkAllAsRead = useCallback(async () => {
    if (unreadCount === 0 || isMarkingAll) {
      return
    }

    setIsMarkingAll(true)
    try {
      const unread = await handleMarkReadRequest({ mark_all: true })
      setNotifications((current) => current.map((item) => ({ ...item, is_read: true })))
      setUnreadCount(unread)
      toast.success('All notifications marked as read.')
    } catch (error) {
      console.error(error)
      toast.error('Could not mark all notifications as read.')
    } finally {
      setIsMarkingAll(false)
    }
  }, [handleMarkReadRequest, isMarkingAll, unreadCount])

  const handleOpenNotification = useCallback(
    async (notification: NotificationApiItem) => {
      if (loadingIds.has(notification.id)) {
        return
      }

      if (!notification.is_read) {
        setLoadingIds((current) => new Set(current).add(notification.id))
        try {
          const unread = await handleMarkReadRequest({ notification_ids: [notification.id] })
          setNotifications((current) =>
            current.map((item) =>
              item.id === notification.id
                ? {
                    ...item,
                    is_read: true,
                  }
                : item
            )
          )
          setUnreadCount(unread)
        } catch (error) {
          console.error(error)
          toast.error('Could not mark this notification as read.')
        } finally {
          setLoadingIds((current) => {
            const next = new Set(current)
            next.delete(notification.id)
            return next
          })
        }
      }

      if (notification.link) {
        router.push(notification.link)
      }
    },
    [handleMarkReadRequest, loadingIds, router]
  )

  const canLoadMore = page < totalPages
  const emptyMessage = useMemo(() => buildEmptyStateMessage(activeFilter), [activeFilter])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Stay updated with attendance alerts, fees, grades, and announcements.
          </p>
        </div>

        <Button onClick={handleMarkAllAsRead} disabled={unreadCount === 0 || isMarkingAll}>
          {isMarkingAll ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <CheckCheck className="mr-2 h-4 w-4" />
          )}
          Mark all as read
        </Button>
      </div>

      <Tabs value={activeFilter} onValueChange={(value) => setActiveFilter(value as NotificationFilterValue)}>
        <TabsList className="h-auto w-full flex-wrap justify-start gap-2 bg-transparent p-0">
          {FILTER_ORDER.map((filter) => (
            <TabsTrigger
              key={filter}
              value={filter}
              className="rounded-full border px-3 py-1.5 text-xs data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              {FILTER_LABELS[filter]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="border-dashed">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-2/5 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-4/5 animate-pulse rounded bg-muted" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <Card>
          <CardContent className="flex min-h-48 flex-col items-center justify-center gap-3 text-center">
            <div className="rounded-full bg-muted p-3">
              <BellRing className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">{emptyMessage}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <NotificationList notifications={notifications} loadingIds={loadingIds} onOpen={handleOpenNotification} />

          {canLoadMore ? (
            <div className="flex justify-center">
              <Button variant="outline" onClick={() => void fetchNotifications(page + 1, true)} disabled={isLoadingMore}>
                {isLoadingMore ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Load More
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}
