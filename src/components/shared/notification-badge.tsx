'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Bell } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface NotificationBadgeProps {
  href?: string
  enabled?: boolean
  className?: string
}

interface UnreadCountPayload {
  success?: boolean
  data?: {
    unread_count?: number
  }
}

const POLL_INTERVAL_MS = 30_000

export function NotificationBadge({
  href = '/notifications',
  enabled = true,
  className,
}: NotificationBadgeProps) {
  const [unreadCount, setUnreadCount] = useState(0)

  const loadUnreadCount = useCallback(async () => {
    if (!enabled) {
      setUnreadCount(0)
      return
    }

    try {
      const response = await fetch('/api/notifications/unread-count', { cache: 'no-store' })
      if (!response.ok) {
        return
      }

      const payload = (await response.json()) as UnreadCountPayload
      setUnreadCount(payload.data?.unread_count ?? 0)
    } catch {
      // Non-blocking UI: keep the previous count on transient fetch errors.
    }
  }, [enabled])

  useEffect(() => {
    void loadUnreadCount()
  }, [loadUnreadCount])

  useEffect(() => {
    if (!enabled) {
      return
    }

    const intervalId = window.setInterval(() => {
      void loadUnreadCount()
    }, POLL_INTERVAL_MS)

    return () => window.clearInterval(intervalId)
  }, [enabled, loadUnreadCount])

  const badgeText = useMemo(() => {
    if (unreadCount > 99) {
      return '99+'
    }

    return String(unreadCount)
  }, [unreadCount])

  return (
    <Button asChild variant="ghost" size="icon" className={cn('relative', className)} aria-label="Notifications">
      <Link href={href}>
        <Bell className="h-5 w-5" />
        {enabled && unreadCount > 0 ? (
          <Badge
            className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1 text-[10px]"
            variant="destructive"
          >
            {badgeText}
          </Badge>
        ) : null}
        <span className="sr-only">Notifications</span>
      </Link>
    </Button>
  )
}
