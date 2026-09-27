import { describe, expect, it } from 'vitest'
import {
  formatNotificationTimestamp,
  isNotificationType,
  toPositiveInt,
} from '@/lib/notification-utils'

describe('notification-utils', () => {
  it('TEST-NU-001: validates notification type values', () => {
    expect(isNotificationType('ATTENDANCE')).toBe(true)
    expect(isNotificationType('GENERAL')).toBe(true)
    expect(isNotificationType('INVALID_TYPE')).toBe(false)
    expect(isNotificationType(null)).toBe(false)
  })

  it('TEST-NU-001: formats relative timestamps with a human readable string', () => {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000)
    expect(formatNotificationTimestamp(tenMinutesAgo)).toContain('ago')
  })

  it('TEST-NU-001: formats yesterday timestamps as Yesterday', () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
    expect(formatNotificationTimestamp(yesterday)).toBe('Yesterday')
  })

  it('TEST-NU-001: returns fallback label for invalid timestamp input', () => {
    expect(formatNotificationTimestamp('not-a-date')).toBe('Unknown time')
  })

  it('TEST-NU-001: parses positive integers with bounds', () => {
    expect(toPositiveInt('10', 1, { min: 1, max: 100 })).toBe(10)
    expect(toPositiveInt('-5', 1, { min: 1, max: 100 })).toBe(1)
    expect(toPositiveInt('1000', 1, { min: 1, max: 100 })).toBe(100)
    expect(toPositiveInt('NaN', 1, { min: 1, max: 100 })).toBe(1)
    expect(toPositiveInt(null, 25, { min: 1, max: 100 })).toBe(25)
  })
})
