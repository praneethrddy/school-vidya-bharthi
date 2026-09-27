'use client'

import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ReportChart } from '@/components/admin/report-chart'
import type { AcademicReport } from '@/lib/report-types'

const PAGE_SIZE = 8

interface AcademicReportViewProps {
  report: AcademicReport
}

export function AcademicReportView({ report }: AcademicReportViewProps) {
  const [page, setPage] = useState(1)
  const totalPages = Math.max(1, Math.ceil(report.data.subject_performance.length / PAGE_SIZE))
  const paginatedSubjects = report.data.subject_performance.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  if (report.data.subject_performance.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Data Available</CardTitle>
          <CardDescription>No data available for the selected academic filters.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Overall Average</CardDescription>
            <CardTitle className="text-xl">{report.data.summary.overall_average}%</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pass Percentage</CardDescription>
            <CardTitle className="text-xl">{report.data.summary.overall_pass_percentage}%</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Students Evaluated</CardDescription>
            <CardTitle className="text-xl">{report.data.summary.students_evaluated}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <ReportChart
          title="Subject-wise Average"
          description="Average marks by subject across the selected scope."
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={report.data.subject_performance}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="subject_name"
                tickLine={false}
                axisLine={false}
                interval={0}
                angle={-18}
                textAnchor="end"
                height={72}
              />
              <YAxis tickLine={false} axisLine={false} />
              <Tooltip />
              <Bar dataKey="average_marks" fill="#7c3aed" radius={[10, 10, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ReportChart>

        <ReportChart
          title="Grade Distribution"
          description="Distribution of grades for all evaluated rows."
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={report.data.grade_distribution}
                dataKey="count"
                nameKey="grade"
                innerRadius={56}
                outerRadius={92}
                fill="#2563eb"
              />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ReportChart>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Subject Performance</CardTitle>
            <CardDescription>Detailed pass/fail and scoring trends by subject.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Average</TableHead>
                  <TableHead>Highest</TableHead>
                  <TableHead>Lowest</TableHead>
                  <TableHead>Pass %</TableHead>
                  <TableHead>Fail %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedSubjects.map((subject) => (
                  <TableRow key={subject.subject_id}>
                    <TableCell>{subject.subject_name}</TableCell>
                    <TableCell>{subject.average_marks}</TableCell>
                    <TableCell>{subject.highest_marks}</TableCell>
                    <TableCell>{subject.lowest_marks}</TableCell>
                    <TableCell>{subject.pass_percentage}%</TableCell>
                    <TableCell>{subject.fail_percentage}%</TableCell>
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

        <Card>
          <CardHeader>
            <CardTitle>Class Toppers</CardTitle>
            <CardDescription>Top performers across the selected exams.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Marks</TableHead>
                  <TableHead>Percentage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.data.toppers.map((topper) => (
                  <TableRow key={topper.student_id}>
                    <TableCell>#{topper.rank}</TableCell>
                    <TableCell>{topper.student_name}</TableCell>
                    <TableCell>
                      {topper.total_marks}/{topper.total_max_marks}
                    </TableCell>
                    <TableCell>{topper.percentage}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <ReportChart
        title="Exam Comparison"
        description="Compare average and pass percentages across exams."
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={report.data.exam_comparison}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="exam_name" tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} />
            <Tooltip />
            <Bar dataKey="average_percentage" name="Average %" fill="#2563eb" radius={[10, 10, 0, 0]} />
            <Bar dataKey="pass_percentage" name="Pass %" fill="#0f766e" radius={[10, 10, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ReportChart>
    </div>
  )
}
