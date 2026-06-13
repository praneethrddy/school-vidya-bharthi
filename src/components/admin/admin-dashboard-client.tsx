'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import {
  AlertCircle,
  ArrowRight,
  ClipboardCheck,
  GraduationCap,
  IndianRupee,
  Loader2,
  RefreshCcw,
  School2,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  type AdminDashboardPayload,
} from '@/lib/admin-dashboard'
import { formatCurrencyINR, getAttendanceTone, getPendingActionTotal } from '@/lib/admin-dashboard-ui'
import { AttendanceChart } from '@/components/admin/attendance-chart'
import { FeeCollectionChart } from '@/components/admin/fee-collection-chart'
import { EnrollmentChart } from '@/components/admin/enrollment-chart'
import { ActivityFeed } from '@/components/admin/activity-feed'
import { QuickActions } from '@/components/admin/quick-actions'
import { StatCard } from '@/components/admin/stat-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface AdminDashboardClientProps {
  user: {
    name?: string | null
    email?: string | null
    role: string
  }
  initialData: AdminDashboardPayload | null
  initialError?: string | null
}

function getDisplayName(user: AdminDashboardClientProps['user']) {
  return user.name || user.email?.split('@')[0] || 'Admin'
}

async function parseDashboardResponse(response: Response): Promise<AdminDashboardPayload> {
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(payload?.error?.message || payload?.error || 'Failed to load dashboard')
  }

  if (payload?.success && payload.data) {
    return payload.data as AdminDashboardPayload
  }

  return payload as AdminDashboardPayload
}

export function AdminDashboardClient({
  user,
  initialData,
  initialError = null,
}: AdminDashboardClientProps) {
  const [dashboard, setDashboard] = useState<AdminDashboardPayload | null>(initialData)
  const [loading, setLoading] = useState(!initialData)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(initialError)

  useEffect(() => {
    if (initialError) {
      toast.error(initialError)
    }
  }, [initialError])

  const reloadDashboard = async () => {
    setRefreshing(true)
    if (!dashboard) {
      setLoading(true)
    }

    try {
      const nextDashboard = await parseDashboardResponse(
        await fetch('/api/dashboard/admin', {
          cache: 'no-store',
        })
      )
      setDashboard(nextDashboard)
      setError(null)
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Failed to refresh dashboard'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (!initialData) {
      void reloadDashboard()
    }
  }, [initialData])

  if (loading && !dashboard) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading dashboard...
        </div>
      </div>
    )
  }

  if (!dashboard) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle>Dashboard unavailable</CardTitle>
          <CardDescription>{error || 'Dashboard data could not be loaded.'}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => void reloadDashboard()}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  const pendingTotal = getPendingActionTotal(dashboard.pending_actions)
  const teacherSummary = dashboard.teacher_summary
  const statCards = []

  if (dashboard.enrollment) {
    statCards.push(
      <StatCard
        key="students"
        title="Total Students"
        value={dashboard.enrollment.total_students.toLocaleString('en-IN')}
        description={`${dashboard.enrollment.total_staff} staff members across ${dashboard.enrollment.total_classes} classes`}
        icon={Users}
      />
    )
  }

  if (dashboard.today_attendance) {
    statCards.push(
      <StatCard
        key="attendance"
        title="Today's Attendance"
        value={`${dashboard.today_attendance.percentage}%`}
        description={`${dashboard.today_attendance.present + dashboard.today_attendance.late} present or late, ${dashboard.today_attendance.absent} absent`}
        icon={ClipboardCheck}
        tone={getAttendanceTone(dashboard.today_attendance.percentage)}
      />
    )
  }

  if (dashboard.fee_collection) {
    statCards.push(
      <StatCard
        key="fees"
        title="Fee Collection"
        value={`${dashboard.fee_collection.collection_percentage}%`}
        description={`${formatCurrencyINR(dashboard.fee_collection.total_outstanding)} still outstanding`}
        icon={IndianRupee}
        tone="success"
      />
    )
  }

  if (teacherSummary) {
    statCards.push(
      <StatCard
        key="classes"
        title="Assigned Classes"
        value={teacherSummary.assigned_classes.toString()}
        description={`${teacherSummary.assigned_subjects} subjects across ${teacherSummary.total_students} students`}
        icon={School2}
      />
    )
    statCards.push(
      <StatCard
        key="grades"
        title="Grades Recorded"
        value={teacherSummary.grade_entries_recorded.toLocaleString('en-IN')}
        description={teacherSummary.latest_exam_name ? `Latest exam: ${teacherSummary.latest_exam_name}` : 'No exams recorded yet'}
        icon={GraduationCap}
      />
    )
  } else if (dashboard.pending_actions) {
    statCards.push(
      <StatCard
        key="pending"
        title="Pending Actions"
        value={pendingTotal.toLocaleString('en-IN')}
        description={`${dashboard.pending_actions.pending_admissions} admissions, ${dashboard.pending_actions.pending_concessions} concessions`}
        icon={AlertCircle}
        tone={pendingTotal > 0 ? 'warning' : 'default'}
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-semibold tracking-tight">Welcome, {getDisplayName(user)}</h1>
            <Badge variant="secondary" className="uppercase">
              {user.role.replace(/_/g, ' ')}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {format(new Date(), 'EEEE, do MMMM yyyy')} • {dashboard.school.name}
          </p>
        </div>

        <Button variant="outline" onClick={() => void reloadDashboard()} disabled={refreshing}>
          {refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
          Refresh
        </Button>
      </div>

      {error ? (
        <Card className="border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20">
          <CardContent className="flex items-center justify-between gap-4 p-4">
            <p className="text-sm text-amber-900 dark:text-amber-100">
              {error}. Showing the most recent successful snapshot.
            </p>
            <Button variant="outline" size="sm" onClick={() => void reloadDashboard()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {dashboard.quick_actions.length > 0 ? <QuickActions actions={dashboard.quick_actions} /> : null}

      {statCards.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{statCards}</div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        {dashboard.today_attendance ? (
          <AttendanceChart
            attendance={dashboard.today_attendance}
            title={teacherSummary ? 'Own Classes Attendance' : "Today's Attendance"}
          />
        ) : null}

        {dashboard.fee_collection ? (
          <FeeCollectionChart feeCollection={dashboard.fee_collection} />
        ) : teacherSummary ? (
          <Card>
            <CardHeader>
              <CardTitle>Teaching Overview</CardTitle>
              <CardDescription>Snapshot of assigned classes and grade-entry activity.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border bg-muted/30 p-4">
                  <p className="text-sm text-muted-foreground">Classes marked today</p>
                  <p className="mt-2 text-2xl font-semibold">{teacherSummary.classes_marked_today}</p>
                </div>
                <div className="rounded-2xl border bg-muted/30 p-4">
                  <p className="text-sm text-muted-foreground">Latest exam</p>
                  <p className="mt-2 text-lg font-semibold">
                    {teacherSummary.latest_exam_name || 'No exams yet'}
                  </p>
                </div>
              </div>
              <div className="rounded-2xl border p-4">
                <p className="text-sm font-medium">Assigned classes</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {teacherSummary.class_names.length > 0 ? (
                    teacherSummary.class_names.map((className) => (
                      <Badge key={className} variant="outline">
                        {className}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">No class assignments yet.</span>
                  )}
                </div>
              </div>
              <Button asChild variant="outline" className="w-full">
                <Link href="/admin/grades">
                  Open Grades
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : null}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        {dashboard.enrollment ? <EnrollmentChart enrollment={dashboard.enrollment} /> : null}

        {dashboard.recent_payments.length > 0 ? (
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
              <div className="space-y-1">
                <CardTitle>Recent Payments</CardTitle>
                <CardDescription>Latest fee collections recorded in the system.</CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/admin/fees">
                  Open fees
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {dashboard.recent_payments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between gap-3 rounded-2xl border p-4">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{payment.student_name}</p>
                    <p className="text-sm text-muted-foreground">{payment.receipt_number}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrencyINR(payment.amount)}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(payment.date), 'dd MMM yyyy')}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : dashboard.pending_actions ? (
          <Card>
            <CardHeader>
              <CardTitle>Pending Follow-ups</CardTitle>
              <CardDescription>Priority items that still need an admin action.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-2xl border p-4">
                <p className="text-sm text-muted-foreground">Admissions</p>
                <p className="mt-2 text-2xl font-semibold">{dashboard.pending_actions.pending_admissions}</p>
              </div>
              <div className="rounded-2xl border p-4">
                <p className="text-sm text-muted-foreground">Concessions</p>
                <p className="mt-2 text-2xl font-semibold">{dashboard.pending_actions.pending_concessions}</p>
              </div>
              <div className="rounded-2xl border p-4">
                <p className="text-sm text-muted-foreground">Overdue books</p>
                <p className="mt-2 text-2xl font-semibold">{dashboard.pending_actions.overdue_books}</p>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>

      {dashboard.recent_activity.length > 0 ? <ActivityFeed activity={dashboard.recent_activity} /> : null}
    </div>
  )
}
