import { describe, it, expect } from 'vitest'
import { computePercentage, computeGrade, isPass, computeClassRank } from './grading'

describe('grading util functions', () => {
  it('correctly computes percentage', () => {
    expect(computePercentage(90, 100)).toBe(90)
    expect(computePercentage(45, 50)).toBe(90)
    expect(computePercentage(0, 100)).toBe(0)
    expect(computePercentage(10, 0)).toBe(0) // Safe handling of max <= 0
  })

  it('correctly computes grade mapping by scheme', () => {
    expect(computeGrade(95, 100)).toBe('A+')
    expect(computeGrade(82, 100)).toBe('A')
    expect(computeGrade(75, 100)).toBe('B+')
    expect(computeGrade(65, 100)).toBe('B')
    expect(computeGrade(55, 100)).toBe('C')
    expect(computeGrade(40, 100)).toBe('D')
    expect(computeGrade(20, 100)).toBe('F')
  })

  it('correctly evaluates pass or fail status', () => {
    expect(isPass(35, 35)).toBe(true)
    expect(isPass(34, 35)).toBe(false)
    expect(isPass(89, 35)).toBe(true)
  })

  it('correctly computes student ranks incorporating ties', () => {
    const data = [
      { studentId: 's1', totalMarks: 400 },
      { studentId: 's2', totalMarks: 450 },
      { studentId: 's3', totalMarks: 450 },
      { studentId: 's4', totalMarks: 300 },
    ]

    const ranks = computeClassRank(data)
    expect(ranks.get('s2')).toBe(1)
    expect(ranks.get('s3')).toBe(1)
    expect(ranks.get('s1')).toBe(3) // Next rank after tie is 1 + 2 = 3
    expect(ranks.get('s4')).toBe(4)
  })
})
