import { describe, expect, it } from 'vitest'
import { computeGrade, computePercentage, isPass } from '../grading'

describe('grading library', () => {
  it('TEST-GRADING-001: converts percentage-derived marks to letter grades', () => {
    expect(computePercentage(45, 50)).toBe(90)
    expect(computeGrade(45, 50)).toBe('A+')
    expect(computeGrade(82, 100)).toBe('A')
    expect(computeGrade(74, 100)).toBe('B+')
  })

  it('TEST-GRADING-002: matches exact grade boundaries (90, 80, 70, 60, 50)', () => {
    expect(computeGrade(90, 100)).toBe('A+')
    expect(computeGrade(80, 100)).toBe('A')
    expect(computeGrade(70, 100)).toBe('B+')
    expect(computeGrade(60, 100)).toBe('B')
    expect(computeGrade(50, 100)).toBe('C')
  })

  it('TEST-GRADING-003: failed subject forces overall F regardless of aggregate percentage', () => {
    const overallFromPolicy = (subjectMarks: Array<{ marks: number; passMark: number }>) => {
      const total = subjectMarks.reduce((sum, subject) => sum + subject.marks, 0)
      const max = subjectMarks.length * 100
      const hasAnyFailedSubject = subjectMarks.some((subject) => !isPass(subject.marks, subject.passMark))
      if (hasAnyFailedSubject) return 'F'
      return computeGrade(total, max)
    }

    expect(
      overallFromPolicy([
        { marks: 95, passMark: 35 },
        { marks: 93, passMark: 35 },
        { marks: 20, passMark: 35 },
      ])
    ).toBe('F')
  })
})
