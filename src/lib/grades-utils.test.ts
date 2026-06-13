import { describe, it, expect } from 'vitest'
import { calculateGrade, determinePassFail, calculatePercentage } from './grades-utils'

describe('Grades Utilities', () => {
  it('should calculate grade correctly', () => {
    expect(calculateGrade(95)).toBe('A+')
    expect(calculateGrade(85)).toBe('A')
    expect(calculateGrade(75)).toBe('B')
    expect(calculateGrade(65)).toBe('C')
    expect(calculateGrade(55)).toBe('D')
    expect(calculateGrade(40)).toBe('F')
  })

  it('should determine pass or fail status', () => {
    expect(determinePassFail(40, 35)).toBe(true)
    expect(determinePassFail(35, 35)).toBe(true)
    expect(determinePassFail(34, 35)).toBe(false)
    expect(determinePassFail(null, 35)).toBe(false)
  })

  it('should calculate percentage correctly', () => {
    expect(calculatePercentage(350, 500)).toBe(70)
    expect(calculatePercentage(0, 500)).toBe(0)
    expect(calculatePercentage(100, 0)).toBe(0)
    expect(calculatePercentage(100.5, 300)).toBe(33.5)
  })
})
