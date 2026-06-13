'use client'

import * as React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface AttendanceStatsProps {
  summary: {
    total_working_days: number
    present: number
    absent: number
    late: number
    half_day: number
    holidays: number
    percentage: number
  } | null
  isLoading?: boolean
}

export function AttendanceStats({ summary, isLoading }: AttendanceStatsProps) {
  if (isLoading || !summary) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
              <div className="h-8 bg-muted rounded w-3/4"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const { total_working_days, present, absent, late, half_day, percentage } = summary
  
  // Color coding for percentage
  let progressColor = "bg-primary"
  let textColor = "text-primary"
  
  if (percentage >= 90) {
    progressColor = "bg-green-500"
    textColor = "text-green-600 dark:text-green-400"
  } else if (percentage >= 75) {
    progressColor = "bg-yellow-500"
    textColor = "text-yellow-600 dark:text-yellow-400"
  } else if (percentage > 0) {
    progressColor = "bg-red-500"
    textColor = "text-red-600 dark:text-red-400"
  }

  const statItems = [
    { label: 'Working Days', value: total_working_days, color: 'text-foreground' },
    { label: 'Present', value: present, color: 'text-green-600 dark:text-green-400' },
    { label: 'Absent', value: absent, color: 'text-red-600 dark:text-red-400' },
    { label: 'Late', value: late, color: 'text-orange-600 dark:text-orange-400' },
    { label: 'Half Day', value: half_day, color: 'text-yellow-600 dark:text-yellow-500' },
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {statItems.map((stat, i) => (
          <Card key={i} className="shadow-sm">
            <CardContent className="p-4 flex flex-col justify-center items-center text-center">
              <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">
                {stat.label}
              </div>
              <div className={cn("text-2xl font-bold", stat.color)}>
                {stat.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-sm">
        <CardContent className="p-4 flex flex-col space-y-3">
          <div className="flex justify-between items-end">
            <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Attendance Percentage
            </div>
            <div className={cn("text-3xl font-bold font-mono", textColor)}>
              {percentage}%
            </div>
          </div>
          <div className="relative w-full h-3 rounded-full bg-muted overflow-hidden">
            <div 
              className={cn("absolute top-0 left-0 h-full transition-all duration-1000 ease-out rounded-full", progressColor)} 
              style={{ width: `${percentage}%` }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
