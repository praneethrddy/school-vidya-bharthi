import type {
  DashboardAttendanceSummary,
  DashboardEnrollmentSummary,
  DashboardFeeCollectionSummary,
  DashboardPendingActions,
} from '@/lib/admin-dashboard'

export function getAdminRouteTitle(pathname: string): string {
  const segment = pathname.split('/').filter(Boolean).at(-1) || 'dashboard'
  const customLabels: Record<string, string> = {
    dashboard: 'Dashboard',
    students: 'Students',
    staff: 'Staff',
    attendance: 'Attendance',
    grades: 'Grades',
    fees: 'Fees',
    timetable: 'Timetable',
    admissions: 'Admissions',
    library: 'Library',
    transport: 'Transport',
    circulars: 'Circulars',
    reports: 'Reports',
    permissions: 'Permissions',
    settings: 'Settings',
  }

  return customLabels[segment] || segment.replace(/[-_]/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

export function getAttendanceTone(percentage: number): 'success' | 'warning' | 'danger' {
  if (percentage >= 90) {
    return 'success'
  }

  if (percentage >= 75) {
    return 'warning'
  }

  return 'danger'
}

export function buildAttendanceChartData(attendance: DashboardAttendanceSummary | null) {
  if (!attendance) {
    return []
  }

  return [
    { name: 'Present', value: attendance.present, fill: '#2563eb' },
    { name: 'Late', value: attendance.late, fill: '#f59e0b' },
    { name: 'Absent', value: attendance.absent, fill: '#ef4444' },
  ].filter((entry) => entry.value > 0)
}

export function buildFeeChartData(feeCollection: DashboardFeeCollectionSummary | null) {
  if (!feeCollection) {
    return []
  }

  return [
    { name: 'Collected', amount: feeCollection.total_collected, fill: '#0f766e' },
    { name: 'Outstanding', amount: feeCollection.total_outstanding, fill: '#fb923c' },
  ]
}

export function buildEnrollmentChartData(enrollment: DashboardEnrollmentSummary | null) {
  if (!enrollment) {
    return []
  }

  return enrollment.class_wise.map((item) => ({
    name: item.class_name,
    students: item.student_count,
  }))
}

export function getPendingActionTotal(pendingActions: DashboardPendingActions | null): number {
  if (!pendingActions) {
    return 0
  }

  return (
    pendingActions.pending_admissions +
    pendingActions.pending_concessions +
    pendingActions.overdue_books
  )
}

export function formatCurrencyINR(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value)
}

