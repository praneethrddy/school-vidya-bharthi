'use client'

import { useState, useCallback, useEffect } from 'react'
import { format } from 'date-fns'
import { AttendanceCalendar, AttendanceRecord, AttendanceStatus } from '@/components/portal/attendance-calendar'
import { AttendanceStats } from '@/components/portal/attendance-stats'
import { AttendanceTrendChart } from '@/components/portal/attendance-trend-chart'
import { toast } from 'sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface AttendanceSummary {
  total_working_days: number
  present: number
  absent: number
  late: number
  half_day: number
  holidays: number
  percentage: number
}

interface AttendanceViewProps {
  studentId?: string
}

export function AttendanceView({ studentId }: AttendanceViewProps) {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date())
  
  const [isLoadingMain, setIsLoadingMain] = useState(true)
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [summary, setSummary] = useState<AttendanceSummary | null>(null)
  
  const [overallSummary, setOverallSummary] = useState<AttendanceSummary | null>(null)
  const [isLoadingOverall, setIsLoadingOverall] = useState(true)

  const fetchAttendance = useCallback(async (date: Date) => {
    setIsLoadingMain(true)
    try {
      const monthStr = format(date, 'yyyy-MM')
      let url = `/api/attendance?month=${monthStr}`
      if (studentId) url += `&student_id=${studentId}`
      
      const res = await fetch(url)
      const data = await res.json()
      
      if (!res.ok) throw new Error(data.error || 'Failed to fetch attendance')
      
      setRecords(data.records || [])
      setSummary(data.summary || null)
    } catch (error: any) {
      toast.error(error.message)
      setRecords([])
      setSummary(null)
    } finally {
      setIsLoadingMain(false)
    }
  }, [studentId])

  const fetchOverallSummary = useCallback(async () => {
    setIsLoadingOverall(true)
    try {
      let url = `/api/attendance/summary`
      if (studentId) url += `?student_id=${studentId}`
      
      const res = await fetch(url)
      const data = await res.json()
      
      if (!res.ok) throw new Error(data.error || 'Failed to fetch summary')
      
      // Map API summary format to expected format
      setOverallSummary({
        total_working_days: data.total_days,
        present: data.present,
        absent: data.absent,
        late: data.late,
        half_day: data.half_day,
        percentage: data.percentage,
        holidays: 0
      })
    } catch (error: any) {
      console.error(error.message)
    } finally {
      setIsLoadingOverall(false)
    }
  }, [studentId])

  // Initial loads
  useEffect(() => {
    fetchAttendance(currentMonth)
  }, [currentMonth, fetchAttendance])

  useEffect(() => {
    fetchOverallSummary()
  }, [fetchOverallSummary])

  return (
    <Tabs defaultValue="monthly" className="w-full">
      <div className="flex justify-between items-center mb-6 print:hidden">
        <TabsList>
          <TabsTrigger value="monthly">Monthly View</TabsTrigger>
          <TabsTrigger value="academic_year">Academic Year</TabsTrigger>
        </TabsList>
        <div className="text-sm text-muted-foreground hidden sm:block">
          {studentId ? "Viewing specific student" : "Your personal attendance"}
        </div>
      </div>

      <TabsContent value="monthly" className="space-y-6 mt-0">
        <AttendanceStats summary={summary} isLoading={isLoadingMain} />
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 shadow-sm">
            <AttendanceCalendar 
              currentMonth={currentMonth}
              onMonthChange={setCurrentMonth}
              records={records}
              isLoading={isLoadingMain}
            />
          </div>
          <div className="lg:col-span-1 shadow-sm">
             {/* Note: In V1 we mock trend data in Monthly view or hide it, but here we show an empty one or a placeholder while waiting for actual trend API in V2 */}
             <AttendanceTrendChart data={[]} isLoading={false} />
          </div>
        </div>
      </TabsContent>

      <TabsContent value="academic_year" className="space-y-6 mt-0">
        <div className="mb-4 text-sm font-medium text-muted-foreground border-l-4 border-primary pl-4 py-1 bg-muted/30">
          Showing aggregate attendance for the current academic year.
        </div>
        <AttendanceStats summary={overallSummary} isLoading={isLoadingOverall} />
      </TabsContent>

      {/* Print View Helpers */}
      <div className="hidden print:block space-y-6 mt-4">
         <h2 className="text-xl font-bold border-b pb-2">Record for {format(currentMonth, 'MMMM yyyy')}</h2>
         <AttendanceStats summary={summary} isLoading={isLoadingMain} />
         <AttendanceCalendar 
            currentMonth={currentMonth}
            onMonthChange={() => {}}
            records={records}
            isLoading={false}
         />
      </div>
    </Tabs>
  )
}
