export function calculateGrade(percentage: number): string {
  if (percentage >= 90) return 'A+'
  if (percentage >= 80) return 'A'
  if (percentage >= 70) return 'B'
  if (percentage >= 60) return 'C'
  if (percentage >= 50) return 'D'
  return 'F'
}

export function determinePassFail(marksObtained: number | null, passingMarks: number): boolean {
  if (marksObtained === null) return false
  return marksObtained >= passingMarks
}

export function calculatePercentage(totalObtained: number, totalMax: number): number {
  if (totalMax === 0) return 0
  return Number(((totalObtained / totalMax) * 100).toFixed(1))
}
