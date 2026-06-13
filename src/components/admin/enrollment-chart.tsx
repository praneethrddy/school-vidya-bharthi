'use client'

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { DashboardEnrollmentSummary } from '@/lib/admin-dashboard'
import { buildEnrollmentChartData } from '@/lib/admin-dashboard-ui'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface EnrollmentChartProps {
  enrollment: DashboardEnrollmentSummary | null
}

export function EnrollmentChart({ enrollment }: EnrollmentChartProps) {
  const chartData = buildEnrollmentChartData(enrollment)

  if (!enrollment) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Enrollment Breakdown</CardTitle>
          <CardDescription>Enrollment insights are not available for this role.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Enrollment Breakdown</CardTitle>
        <CardDescription>Class-wise student distribution for the current academic year.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border bg-muted/30 p-4">
            <p className="text-sm text-muted-foreground">Students</p>
            <p className="mt-2 text-2xl font-semibold">{enrollment.total_students}</p>
          </div>
          <div className="rounded-2xl border bg-muted/30 p-4">
            <p className="text-sm text-muted-foreground">Staff</p>
            <p className="mt-2 text-2xl font-semibold">{enrollment.total_staff}</p>
          </div>
          <div className="rounded-2xl border bg-muted/30 p-4">
            <p className="text-sm text-muted-foreground">Classes</p>
            <p className="mt-2 text-2xl font-semibold">{enrollment.total_classes}</p>
          </div>
        </div>

        <div className="h-[260px]">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ left: -16, right: 12, top: 12 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} interval={0} angle={-15} height={56} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                <Tooltip formatter={(value: number) => [value, 'Students']} />
                <Bar dataKey="students" fill="#2563eb" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center rounded-3xl border border-dashed text-sm text-muted-foreground">
              No classes or student records are available yet.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
