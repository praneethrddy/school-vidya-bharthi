'use client'

import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ReportChart } from '@/components/admin/report-chart'
import type { AttendanceReport, StaffAttendanceReport } from '@/lib/report-types'

interface AttendanceReportViewProps {
  report: AttendanceReport | StaffAttendanceReport
}

const PAGE_SIZE = 10

export function AttendanceReportView({ report }: AttendanceReportViewProps) {
  const [page, setPage] = useState(1)

  const isStaff = report.report_type === 'staff_attendance'
  const staffRows = isStaff ? report.data.staff_wise : []
  const studentRows = isStaff ? [] : report.data.student_wise
  const rows = isStaff ? staffRows : studentRows
  const dailySummary = report.data.daily_summary
  const chartRows = useMemo(
    () => [...rows].sort((left, right) => right.percentage - left.percentage).slice(0, 8),
    [rows]
  )

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  if (rows.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Data Available</CardTitle>
          <CardDescription>No data available for the selected period.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const overallCards = isStaff
    ? [
        { label: 'Average Attendance', value: `${report.data.overall.average_attendance}%` },
        { label: 'Best Staff Member', value: report.data.overall.best_attendance_staff },
        { label: 'Needs Attention', value: report.data.overall.worst_attendance_staff },
      ]
    : [
        { label: 'Average Attendance', value: `${report.data.overall.average_attendance}%` },
        { label: 'Best Student', value: report.data.overall.best_attendance_student },
        { label: 'Needs Attention', value: report.data.overall.worst_attendance_student },
      ]

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        {overallCards.map((item) => (
          <Card key={item.label}>
            <CardHeader className="pb-2">
              <CardDescription>{item.label}</CardDescription>
              <CardTitle className="text-xl">{item.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <ReportChart
          title="Daily Attendance Trend"
          description="Track attendance consistency across the selected period."
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dailySummary}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="percentage"
                name="Attendance %"
                stroke="#2563eb"
                strokeWidth={3}
              />
            </LineChart>
          </ResponsiveContainer>
        </ReportChart>

        <ReportChart
          title={isStaff ? 'Top Attendance Performers' : 'Top Student Attendance'}
          description="Highest attendance percentages for the current selection."
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartRows}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey={isStaff ? 'staff_name' : 'student_name'}
                tickLine={false}
                axisLine={false}
                interval={0}
                angle={-18}
                textAnchor="end"
                height={72}
              />
              <YAxis tickLine={false} axisLine={false} />
              <Tooltip />
              <Bar dataKey="percentage" name="Attendance %" fill="#0f766e" radius={[10, 10, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ReportChart>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{isStaff ? 'Staff Attendance Breakdown' : 'Student Attendance Breakdown'}</CardTitle>
          <CardDescription>
            Tables are paginated for on-screen viewing. Exports always include the full result set.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{isStaff ? 'Staff Member' : 'Student'}</TableHead>
                <TableHead>{isStaff ? 'Employee Code' : 'Roll Number'}</TableHead>
                <TableHead>Total Days</TableHead>
                <TableHead>Present</TableHead>
                <TableHead>Absent</TableHead>
                <TableHead>Late</TableHead>
                <TableHead>Half Day</TableHead>
                {isStaff ? <TableHead>Leave</TableHead> : null}
                <TableHead>Attendance %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isStaff
                ? staffRows
                    .slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
                    .map((row) => (
                      <TableRow key={row.staff_id}>
                        <TableCell>{row.staff_name}</TableCell>
                        <TableCell>{row.employee_code || '-'}</TableCell>
                        <TableCell>{row.total_days}</TableCell>
                        <TableCell>{row.present}</TableCell>
                        <TableCell>{row.absent}</TableCell>
                        <TableCell>{row.late}</TableCell>
                        <TableCell>{row.half_day}</TableCell>
                        <TableCell>{row.leave}</TableCell>
                        <TableCell>{row.percentage}%</TableCell>
                      </TableRow>
                    ))
                : studentRows
                    .slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
                    .map((row) => (
                      <TableRow key={row.student_id}>
                        <TableCell>{row.student_name}</TableCell>
                        <TableCell>{row.roll_number || '-'}</TableCell>
                        <TableCell>{row.total_days}</TableCell>
                        <TableCell>{row.present}</TableCell>
                        <TableCell>{row.absent}</TableCell>
                        <TableCell>{row.late}</TableCell>
                        <TableCell>{row.half_day}</TableCell>
                        <TableCell>{row.percentage}%</TableCell>
                      </TableRow>
                    ))}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
