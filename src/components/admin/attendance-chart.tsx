'use client'

import { Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import Link from 'next/link'
import { AlertTriangle, ArrowRight } from 'lucide-react'
import type { DashboardAttendanceSummary } from '@/lib/admin-dashboard'
import { buildAttendanceChartData } from '@/lib/admin-dashboard-ui'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'

interface AttendanceChartProps {
  attendance: DashboardAttendanceSummary | null
  title?: string
  linkHref?: string
}

export function AttendanceChart({
  attendance,
  title = "Today's Attendance",
  linkHref = '/admin/attendance',
}: AttendanceChartProps) {
  const chartData = buildAttendanceChartData(attendance)

  if (!attendance) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>No attendance data available yet.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1">
          <CardTitle>{title}</CardTitle>
          <CardDescription>
            {attendance.total_students} students in today&apos;s attendance register
          </CardDescription>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link href={linkHref}>
            Open
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <div className="mx-auto h-[220px] w-full max-w-[240px]">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  innerRadius={60}
                  outerRadius={90}
                  dataKey="value"
                  strokeWidth={4}
                />
                <Tooltip formatter={(value: number) => [value, 'Students']} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center rounded-3xl border border-dashed text-sm text-muted-foreground">
              No attendance marked yet
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border bg-muted/30 p-4">
              <p className="text-sm text-muted-foreground">Present</p>
              <p className="mt-2 text-2xl font-semibold">{attendance.present}</p>
            </div>
            <div className="rounded-2xl border bg-muted/30 p-4">
              <p className="text-sm text-muted-foreground">Late</p>
              <p className="mt-2 text-2xl font-semibold">{attendance.late}</p>
            </div>
            <div className="rounded-2xl border bg-muted/30 p-4">
              <p className="text-sm text-muted-foreground">Absent</p>
              <p className="mt-2 text-2xl font-semibold">{attendance.absent}</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Attendance percentage</span>
              <span className="font-medium">{attendance.percentage}%</span>
            </div>
            <Progress value={attendance.percentage} className="h-2" />
          </div>

          {attendance.not_marked > 0 ? (
            <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="text-sm">
                {attendance.not_marked} classes have not marked attendance yet. This percentage only
                reflects recorded classes.
              </p>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
