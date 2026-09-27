import { describe, expect, it } from 'vitest'
import { getNotificationTypeMeta } from '@/components/shared/notification-type-icon'

describe('notification type icon mapping', () => {
  it('maps ATTENDANCE to blue palette', () => {
    const meta = getNotificationTypeMeta('ATTENDANCE')
    expect(meta.containerClassName).toContain('bg-blue')
    expect(meta.iconClassName).toContain('text-blue')
  })

  it('maps FEE to orange palette', () => {
    const meta = getNotificationTypeMeta('FEE')
    expect(meta.containerClassName).toContain('bg-orange')
    expect(meta.iconClassName).toContain('text-orange')
  })

  it('maps GENERAL to neutral palette', () => {
    const meta = getNotificationTypeMeta('GENERAL')
    expect(meta.containerClassName).toContain('bg-slate')
    expect(meta.iconClassName).toContain('text-slate')
  })
})
