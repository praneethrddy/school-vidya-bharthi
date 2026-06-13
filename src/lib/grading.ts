export type GradingScheme = 'PERCENTAGE' | 'GRADE' | 'GPA'

export interface GradeScale {
  minPercentage: number
  grade: string
}

const DEFAULT_GRADE_SCALE: GradeScale[] = [
  { minPercentage: 90, grade: 'A+' },
  { minPercentage: 80, grade: 'A' },
  { minPercentage: 70, grade: 'B+' },
  { minPercentage: 60, grade: 'B' },
  { minPercentage: 50, grade: 'C' },
  { minPercentage: 35, grade: 'D' },
  { minPercentage: 0, grade: 'F' }, // Using F for below 35
]

export function computePercentage(marks: number, maxMarks: number): number {
  if (maxMarks <= 0) return 0
  return (marks / maxMarks) * 100
}

export function computeGrade(
  marks: number,
  maxMarks: number,
  scheme: GradingScheme = 'PERCENTAGE',
  scale: GradeScale[] = DEFAULT_GRADE_SCALE
): string {
  if (scheme === 'GPA') {
    // Placeholder for future GPA calculation
    const percentage = computePercentage(marks, maxMarks)
    if (percentage >= 90) return '4.0'
    if (percentage >= 80) return '3.0'
    if (percentage >= 70) return '2.0'
    if (percentage >= 60) return '1.0'
    return '0.0'
  }

  const percentage = computePercentage(marks, maxMarks)
  
  // Sort descending just in case it's not
  const sortedScale = [...scale].sort((a, b) => b.minPercentage - a.minPercentage)

  for (const range of sortedScale) {
    if (percentage >= range.minPercentage) {
      return range.grade
    }
  }

  return 'F'
}

export function isPass(marks: number, passingMarks: number): boolean {
  return marks >= passingMarks
}

interface StudentGradeSum {
  studentId: string
  totalMarks: number
}

// Computes rank mapping from an array of grades. Ranks are based on total marks per student.
export function computeClassRank(studentSums: StudentGradeSum[]): Map<string, number> {
  const rankMap = new Map<string, number>()
  
  // Sort descending by totalmarks
  const sorted = [...studentSums].sort((a, b) => b.totalMarks - a.totalMarks)
  
  let currentRank = 1
  let currentMarks = -1
  let tiedCount = 0

  sorted.forEach((student, index) => {
    if (student.totalMarks === currentMarks) {
      // Tie, keep same rank
      rankMap.set(student.studentId, currentRank)
      tiedCount++
    } else {
      // Advance rank by 1 + number of ties we just had
      currentRank = currentRank + tiedCount
      if (index === 0) currentRank = 1 // Reset for first item
      
      rankMap.set(student.studentId, currentRank)
      currentMarks = student.totalMarks
      tiedCount = 1 // Next time it's different, it advances by this size
    }
  })

  return rankMap
}
