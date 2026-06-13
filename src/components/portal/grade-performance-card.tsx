import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Award, Target, TrendingUp } from 'lucide-react'

export function GradePerformanceCard({ percentage, overallGrade, gradingScheme }: { percentage: number, overallGrade: string, gradingScheme: string }) {
  let classification = ''
  let colorClass = ''

  if (overallGrade === 'F') {
    classification = 'Failed'
    colorClass = 'text-red-500 bg-red-500/10'
  } else if (percentage >= 75) {
    classification = 'Distinction'
    colorClass = 'text-emerald-500 bg-emerald-500/10'
  } else if (percentage >= 60) {
    classification = 'First Class'
    colorClass = 'text-green-500 bg-green-500/10'
  } else if (percentage >= 50) {
    classification = 'Second Class'
    colorClass = 'text-blue-500 bg-blue-500/10'
  } else {
    classification = 'Pass'
    colorClass = 'text-amber-500 bg-amber-500/10'
  }

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium flex items-center justify-between">
          <span>Overall Performance</span>
          <Award className="h-5 w-5 text-muted-foreground" />
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col flex-1 justify-center items-center text-center py-6">
        <div className="relative mb-2">
          <svg className="w-32 h-32 transform -rotate-90">
            <circle cx="64" cy="64" r="56" fill="transparent" stroke="currentColor" strokeWidth="12" className="text-muted" />
            <circle cx="64" cy="64" r="56" fill="transparent" stroke="currentColor" strokeWidth="12" strokeDasharray="351.85" strokeDashoffset={351.85 - (351.85 * (percentage || 0)) / 100} className={`text-primary transition-all duration-1000 ease-in-out`} />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center flex-col">
            <span className="text-3xl font-bold">{percentage}%</span>
            <span className="text-xs text-muted-foreground">Percentage</span>
          </div>
        </div>
        
        <div className={`mt-4 px-4 py-1.5 rounded-full text-sm font-medium ${colorClass}`}>
          {classification} (Grade {overallGrade})
        </div>

        <div className="flex gap-4 mt-6 w-full text-left text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary" /> Max possible 100%
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-500" /> Passing 35%
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
