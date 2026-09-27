'use client'

import { ArrowUpRight } from 'lucide-react'
import { NotificationTypeIcon } from '@/components/shared/notification-type-icon'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { formatNotificationTimestamp, type AppNotificationType } from '@/lib/notification-utils'
import { cn } from '@/lib/utils'

export interface NotificationItemData {
  id: string
  title: string
  message: string
  type: AppNotificationType
  is_read: boolean
  link: string | null
  created_at: string
}

interface NotificationItemProps {
  notification: NotificationItemData
  disabled?: boolean
  onOpen?: (notification: NotificationItemData) => void | Promise<void>
}

export function NotificationItem({ notification, disabled, onOpen }: NotificationItemProps) {
  return (
    <Card
      className={cn(
        'transition-colors',
        notification.is_read ? 'bg-card' : 'border-primary/20 bg-primary/5',
        disabled ? 'opacity-70' : 'hover:bg-accent/40'
      )}
    >
      <button
        type="button"
        onClick={() => onOpen?.(notification)}
        disabled={disabled}
        className="flex w-full items-start gap-4 p-4 text-left"
      >
        <NotificationTypeIcon type={notification.type} />

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className={cn('text-sm', notification.is_read ? 'font-medium' : 'font-semibold')}>
              {notification.title}
            </h3>

            {!notification.is_read ? (
              <span className="inline-flex h-2 w-2 rounded-full bg-primary" aria-label="Unread notification" />
            ) : null}
          </div>

          <p className="overflow-hidden text-sm text-muted-foreground [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
            {notification.message}
          </p>

          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>{formatNotificationTimestamp(notification.created_at)}</span>
            <Badge variant="outline" className="px-2 py-0 text-[10px] uppercase">
              {notification.type}
            </Badge>
            {notification.link ? (
              <span className="inline-flex items-center gap-1">
                Open
                <ArrowUpRight className="h-3 w-3" />
              </span>
            ) : null}
          </div>
        </div>
      </button>
    </Card>
  )
}
