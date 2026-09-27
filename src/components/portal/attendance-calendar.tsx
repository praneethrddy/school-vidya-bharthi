'use client'

import * as React from 'react'
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  startOfMonth,
  endOfMonth,
  isSameMonth,
  isToday,
  isFuture,
  parseISO,
  isSameDay
} from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' | 'HOLIDAY'

export interface AttendanceRecord {
  date: string // YYYY-MM-DD
  status: AttendanceStatus
  remarks?: string | null
}

interface AttendanceCalendarProps {
  currentMonth: Date
  onMonthChange: (date: Date) => void
  records: AttendanceRecord[]
  isLoading?: boolean
}

const statusColors: Record<AttendanceStatus, { bg: string, text: string, indicator: string }> = {
  PRESENT: { bg: 'bg-green-100 dark:bg-green-900/40', text: 'text-green-800 dark:text-green-300', indicator: 'bg-green-500' },
  ABSENT: { bg: 'bg-red-100 dark:bg-red-900/40', text: 'text-red-800 dark:text-red-300', indicator: 'bg-red-500' },
  LATE: { bg: 'bg-orange-100 dark:bg-orange-900/40', text: 'text-orange-800 dark:text-orange-300', indicator: 'bg-orange-500' },
  HALF_DAY: { bg: 'bg-yellow-100 dark:bg-yellow-900/40', text: 'text-yellow-800 dark:text-yellow-300', indicator: 'bg-yellow-400' },
  HOLIDAY: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-800 dark:text-gray-300', indicator: 'bg-gray-400' },
}

const statusLabels: Record<AttendanceStatus, string> = {
  PRESENT: 'Present',
  ABSENT: 'Absent',
  LATE: 'Late',
  HALF_DAY: 'Half Day',
  HOLIDAY: 'Holiday',
}

export function AttendanceCalendar({ currentMonth, onMonthChange, records, isLoading }: AttendanceCalendarProps) {
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(monthStart)
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }) // Start on Monday
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 }) // End on Sunday

  const days = eachDayOfInterval({ start: startDate, end: endDate })

  const handlePrevMonth = () => {
    const prev = new Date(currentMonth)
    prev.setMonth(prev.getMonth() - 1)
    onMonthChange(prev)
  }

  const handleNextMonth = () => {
    const next = new Date(currentMonth)
    next.setMonth(next.getMonth() + 1)
    if (!isFuture(next) || isSameMonth(next, new Date())) {
       onMonthChange(next)
    }
  }

  // Prevent navigating to future months
  const nextMonthDate = new Date(currentMonth)
  nextMonthDate.setMonth(nextMonthDate.getMonth() + 1)
  const isNextDisabled = isFuture(startOfMonth(nextMonthDate))

  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
      {/* Calendar Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold flex items-center">
          {format(currentMonth, 'MMMM yyyy')}
          {isLoading && <span className="ml-2 text-sm text-muted-foreground animate-pulse">Loading...</span>}
        </h2>
        <div className="flex space-x-2">
          <Button variant="outline" size="icon" onClick={handlePrevMonth} disabled={isLoading}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleNextMonth} disabled={isNextDisabled || isLoading}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-4">
        <div className="grid grid-cols-7 gap-1 text-center font-medium text-sm text-muted-foreground mb-2">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
            <div key={day} className="py-2">{day}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {days.map((day, idx) => {
            const dateStr = format(day, 'yyyy-MM-dd')
            const record = records.find(r => r.date === dateStr)
            const isCurrentMonth = isSameMonth(day, currentMonth)
            const isSunday = day.getDay() === 0
            
            let cellStyle = "bg-background"
            let dotIndicator = null

            if (!isCurrentMonth) {
              cellStyle = "opacity-30 bg-muted"
            } else if (isSunday) {
              cellStyle = "bg-muted opacity-60"
            } else if (record) {
              const statusStyle = statusColors[record.status]
              cellStyle = statusStyle.bg
              dotIndicator = <div className={cn("w-2 h-2 rounded-full mt-1", statusStyle.indicator)} />
            } else if (isFuture(day)) {
              cellStyle = "opacity-50"
            }

            const todayStyles = isToday(day) 
              ? "ring-2 ring-primary ring-offset-1 dark:ring-offset-background" 
              : ""

            const cellContent = (
              <div 
                className={cn(
                  "flex flex-col items-center justify-center p-2 h-16 sm:h-20 md:h-24 rounded-md transition-colors border border-border/50",
                  cellStyle,
                  todayStyles,
                  record ? 'cursor-pointer hover:opacity-80' : ''
                )}
              >
                <span className={cn(
                  "text-sm font-medium",
                  isToday(day) ? "text-primary font-bold" : ""
                )}>
                  {format(day, 'd')}
                </span>
                {dotIndicator}
                {record && (
                  <span className={cn("text-[10px] hidden sm:block mt-1 font-medium select-none truncate w-full px-1 text-center", statusColors[record.status].text)}>
                    {statusLabels[record.status]}
                  </span>
                )}
              </div>
            )

            // If it has a record, wrap it in a Popover to show details
            if (record && isCurrentMonth) {
              return (
                <Popover key={dateStr}>
                  <PopoverTrigger asChild>
                    {cellContent}
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">{format(day, 'MMMM d, yyyy')}</span>
                        <span className={cn("text-xs font-semibold px-2 py-1 rounded-full", statusColors[record.status].bg, statusColors[record.status].text)}>
                          {statusLabels[record.status]}
                        </span>
                      </div>
                      <div className="text-sm">
                        {record.remarks ? (
                          <div className="mt-2 text-muted-foreground break-words">{record.remarks}</div>
                        ) : (
                          <div className="mt-2 text-muted-foreground italic">No remarks</div>
                        )}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              )
            }

            return <div key={dateStr}>{cellContent}</div>
          })}
        </div>
      </div>
      
      {/* Legend */}
      <div className="p-4 border-t bg-muted/20 flex flex-wrap gap-4 items-center justify-center text-sm">
        <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-green-500 mr-2" /> Present</div>
        <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-red-500 mr-2" /> Absent</div>
        <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-orange-500 mr-2" /> Late</div>
        <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-yellow-400 mr-2" /> Half Day</div>
        <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-gray-400 mr-2" /> Holiday</div>
      </div>
    </div>
  )
}
