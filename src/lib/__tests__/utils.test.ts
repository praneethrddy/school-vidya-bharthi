import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  calculatePercentage,
  cn,
  formatCurrency,
  formatDate,
  formatRelativeTime,
  generatePassword,
  getInitials,
} from '../utils'

describe('cn', () => {
  it('merges class names and resolves tailwind conflicts', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
    expect(cn('foo', { bar: true })).toBe('foo bar')
    expect(cn('foo', { bar: false })).toBe('foo')
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4')
  })
})

describe('formatDate', () => {
  it('formats Date instances for en-IN locale', () => {
    const result = formatDate(new Date('2025-06-15T00:00:00.000Z'))
    expect(result).toContain('2025')
    expect(result).toMatch(/15/)
  })

  it('accepts ISO date strings', () => {
    const result = formatDate('2025-07-01T00:00:00.000Z')
    expect(result).toContain('2025')
  })
})

describe('formatCurrency', () => {
  it('formats currency in INR style', () => {
    expect(formatCurrency(12500)).toContain('12,500')
  })

  it('keeps up to two decimal places without forcing trailing zeros', () => {
    expect(formatCurrency(12500.5)).toContain('12,500.5')
    expect(formatCurrency(12500.56)).toContain('12,500.56')
  })
})

describe('getInitials', () => {
  it('returns uppercase initials', () => {
    expect(getInitials('John', 'Doe')).toBe('JD')
    expect(getInitials('a', 'b')).toBe('AB')
  })
})

describe('calculatePercentage', () => {
  it('calculates percentage with rounding to two decimals', () => {
    expect(calculatePercentage(85, 100)).toBe(85)
    expect(calculatePercentage(45, 100)).toBe(45)
    expect(calculatePercentage(1, 3)).toBe(33.33)
  })

  it('returns 0 when total is zero', () => {
    expect(calculatePercentage(50, 0)).toBe(0)
  })
})

describe('generatePassword', () => {
  it('generates password with default length', () => {
    const password = generatePassword()
    expect(password.length).toBe(12)
  })

  it('generates password with requested length', () => {
    const password = generatePassword(12)
    expect(password.length).toBe(12)
  })

  it('includes uppercase, lowercase, number, and special character', () => {
    const password = generatePassword(12)
    expect(/[A-Z]/.test(password)).toBe(true)
    expect(/[a-z]/.test(password)).toBe(true)
    expect(/[0-9]/.test(password)).toBe(true)
    expect(/[!@#$%^&*]/.test(password)).toBe(true)
  })

  it('still includes required character groups for very short requested lengths', () => {
    const password = generatePassword(3)
    expect(password.length).toBe(4)
    expect(/[A-Z]/.test(password)).toBe(true)
    expect(/[a-z]/.test(password)).toBe(true)
    expect(/[0-9]/.test(password)).toBe(true)
    expect(/[!@#$%^&*]/.test(password)).toBe(true)
  })
})

describe('formatRelativeTime', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns "Just now" for current timestamp', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-27T12:00:00.000Z'))
    expect(formatRelativeTime(new Date('2026-05-27T12:00:00.000Z'))).toBe('Just now')
  })

  it('returns minutes for values below one hour', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-27T12:00:00.000Z'))
    expect(formatRelativeTime(new Date('2026-05-27T11:31:00.000Z'))).toBe('29m ago')
  })

  it('returns hours for values below one day', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-27T12:00:00.000Z'))
    expect(formatRelativeTime(new Date('2026-05-27T09:45:00.000Z'))).toBe('2h ago')
  })

  it('returns days for values below one week', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-27T12:00:00.000Z'))
    expect(formatRelativeTime(new Date('2026-05-24T12:00:00.000Z'))).toBe('3d ago')
  })

  it('falls back to formatDate for values at or above one week', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-27T12:00:00.000Z'))
    const input = new Date('2026-05-15T00:00:00.000Z')
    expect(formatRelativeTime(input)).toBe(formatDate(input))
  })
})
