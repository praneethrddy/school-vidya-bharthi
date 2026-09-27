import { Metadata } from 'next'
import NotificationsClient, { NotificationFilterValue } from './notifications-client'
import { isNotificationType } from '@/lib/notification-utils'

export const metadata: Metadata = {
  title: 'Notifications | Vidhya Bharthi',
  description: 'View school updates, reminders, and alerts in one place.',
}

function parseInitialFilter(value: string | string[] | undefined): NotificationFilterValue {
  if (Array.isArray(value)) {
    return parseInitialFilter(value[0])
  }

  if (!value) {
    return 'ALL'
  }

  if (value === 'UNREAD' || value === 'ALL') {
    return value
  }

  return isNotificationType(value) ? value : 'ALL'
}

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const resolvedSearchParams = await searchParams
  const initialFilter = parseInitialFilter(resolvedSearchParams.filter)

  return <NotificationsClient initialFilter={initialFilter} />
}
