import { formatDistanceToNowStrict, isValid, isYesterday } from 'date-fns'

export const NOTIFICATION_TYPES = [
  'ATTENDANCE',
  'FEE',
  'GRADE',
  'ANNOUNCEMENT',
  'HOMEWORK',
  'PTM',
  'GENERAL',
] as const

export type AppNotificationType = (typeof NOTIFICATION_TYPES)[number]

export function isNotificationType(value: string | null | undefined): value is AppNotificationType {
  if (!value) {
    return false
  }

  return (NOTIFICATION_TYPES as readonly string[]).includes(value)
}

export function formatNotificationTimestamp(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value)

  if (!isValid(date)) {
    return 'Unknown time'
  }

  if (isYesterday(date)) {
    return 'Yesterday'
  }

  return formatDistanceToNowStrict(date, { addSuffix: true })
}

export function toPositiveInt(
  value: string | null,
  defaultValue: number,
  constraints: { min?: number; max?: number } = {}
): number {
  if (!value) {
    return defaultValue
  }

  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed)) {
    return defaultValue
  }

  const min = constraints.min ?? Number.NEGATIVE_INFINITY
  const max = constraints.max ?? Number.POSITIVE_INFINITY

  if (parsed < min) {
    return min
  }

  if (parsed > max) {
    return max
  }

  return parsed
}
