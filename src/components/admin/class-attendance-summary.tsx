"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { AlertTriangle, CheckCircle2, Users } from "lucide-react"

export type ClassSummary = {
  class_id: string
  class_name: string
  total_students: number
  present: number
  absent: number
  late: number
  half_day: number
  is_marked: boolean
  marked_by: string | null
  marked_at: string | null
}

interface ClassAttendanceSummaryProps {
  classes: ClassSummary[]
  onClassSelect: (classId: string) => void
}

export function ClassAttendanceSummary({ classes, onClassSelect }: ClassAttendanceSummaryProps) {
  if (classes.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground border rounded-lg bg-muted/20">
        No classes found for this criteria.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 ml:grid-cols-3 xl:grid-cols-4 gap-4">
      {classes.map((cls) => {
        const total = cls.total_students
        const presentOrEquivalent = cls.present + cls.late + cls.half_day
        const percentage = total > 0 ? Math.round((presentOrEquivalent / total) * 100) : 0
        
        let colorClass = "bg-green-500"
        let textClass = "text-green-600"
        if (percentage < 75) {
           colorClass = "bg-red-500"
           textClass = "text-red-600"
        } else if (percentage < 90) {
           colorClass = "bg-yellow-500"
           textClass = "text-yellow-600"
        }

        return (
          <Card 
            key={cls.class_id} 
            className={`cursor-pointer hover:shadow-md transition-shadow ${!cls.is_marked ? 'border-orange-200 bg-orange-50/30' : ''}`}
            onClick={() => onClassSelect(cls.class_id)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-bold">
                {cls.class_name}
              </CardTitle>
              {cls.is_marked ? (
                <div title="Attendance Marked"><CheckCircle2 className="h-4 w-4 text-green-500" /></div>
              ) : (
                <div title="Not Marked"><AlertTriangle className="h-4 w-4 text-orange-500" /></div>
              )}
            </CardHeader>
            <CardContent>
              {cls.is_marked ? (
                 <div className="space-y-3">
                   <div className="text-2xl font-bold">{percentage}%</div>
                   <Progress value={percentage} className={`h-2 [&>div]:${colorClass}`} />
                   <div className="flex justify-between text-xs text-muted-foreground mt-2">
                     <span className="flex items-center"><Users className="w-3 h-3 mr-1"/> {total}</span>
                     <span className={textClass}>Present: {presentOrEquivalent}</span>
                     <span className="text-red-500">Absent: {cls.absent}</span>
                   </div>
                   {cls.marked_by && (
                     <p className="text-[10px] text-muted-foreground mt-1 truncate">
                       By {cls.marked_by}
                     </p>
                   )}
                 </div>
              ) : (
                 <div className="flex flex-col items-center justify-center py-4 text-orange-600 dark:text-orange-400">
                   <AlertTriangle className="h-6 w-6 mb-2 opacity-80" />
                   <p className="text-sm font-medium">Pending</p>
                 </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
