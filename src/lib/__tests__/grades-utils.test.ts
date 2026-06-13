import { describe, expect, it } from 'vitest'
import { calculateGrade, calculatePercentage, determinePassFail } from '../grades-utils'

describe('grades-utils helpers', () => {
  it('TEST-GU-001: grade formatter handles all score buckets', () => {
    expect(calculateGrade(95)).toBe('A+')
    expect(calculateGrade(84)).toBe('A')
    expect(calculateGrade(73)).toBe('B')
    expect(calculateGrade(65)).toBe('C')
    expect(calculateGrade(52)).toBe('D')
    expect(calculateGrade(49)).toBe('F')
  })

  it('TEST-GU-001: pass/fail helper handles null and cutoff values', () => {
    expect(determinePassFail(35, 35)).toBe(true)
    expect(determinePassFail(34, 35)).toBe(false)
    expect(determinePassFail(null, 35)).toBe(false)
  })

  it('TEST-GU-001: percentage helper rounds to one decimal and handles zero max', () => {
    expect(calculatePercentage(100.5, 300)).toBe(33.5)
    expect(calculatePercentage(350, 500)).toBe(70)
    expect(calculatePercentage(100, 0)).toBe(0)
  })
})
