'use client'

import { NotificationItem, type NotificationItemData } from '@/components/shared/notification-item'

interface NotificationListProps {
  notifications: NotificationItemData[]
  loadingIds?: Set<string>
  onOpen?: (notification: NotificationItemData) => void | Promise<void>
}

export function NotificationList({ notifications, loadingIds, onOpen }: NotificationListProps) {
  return (
    <div className="space-y-3">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          disabled={loadingIds?.has(notification.id)}
          onOpen={onOpen}
        />
      ))}
    </div>
  )
}
