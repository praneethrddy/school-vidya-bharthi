import { cacheGet, cacheSet } from '@/lib/cache'
import { logger } from '@/lib/logger'
import { prisma } from '@/lib/prisma'

export const ADMIN_DASHBOARD_ALLOWED_ROLES = [
  'SUPER_ADMIN',
  'PRINCIPAL',
  'STAFF_ADMIN',
  'STUDENT_ADMIN',
  'ACCOUNTANT',
  'TEACHER',
] as const

export type AdminDashboardRole = (typeof ADMIN_DASHBOARD_ALLOWED_ROLES)[number]

export interface DashboardSchoolSummary {
  id: string
  name: string
  academic_year: string
  term: string
}

export interface DashboardEnrollmentSummary {
  total_students: number
  total_staff: number
  total_classes: number
  class_wise: Array<{
    class_id: string
    class_name: string
    student_count: number
  }>
}

export interface DashboardAttendanceSummary {
  total_students: number
  present: number
  absent: number
  late: number
  percentage: number
  not_marked: number
}

export interface DashboardFeeCollectionSummary {
  total_expected: number
  total_collected: number
  total_outstanding: number
  collection_percentage: number
  this_month_collected: number
}

export interface DashboardRecentPayment {
  id: string
  student_name: string
  amount: number
  receipt_number: string
  date: string
}

export interface DashboardPendingActions {
  pending_admissions: number
  pending_concessions: number
  overdue_books: number
}

export interface DashboardRecentActivityItem {
  id: string
  action: string
  entity_type: string
  user_name: string
  timestamp: string
}

export interface DashboardTeacherSummary {
  assigned_classes: number
  assigned_subjects: number
  total_students: number
  classes_marked_today: number
  class_names: string[]
  grade_entries_recorded: number
  latest_exam_name: string | null
}

export interface DashboardVisibility {
  enrollment: boolean
  attendance: boolean
  fee_collection: boolean
  recent_payments: boolean
  pending_actions: boolean
  recent_activity: boolean
  teacher_summary: boolean
}

export interface DashboardQuickAction {
  key: string
  label: string
  description: string
  href: string
  icon: 'attendance' | 'fees' | 'students' | 'announcements'
}

export interface AdminDashboardPayload {
  school: DashboardSchoolSummary
  generated_at: string
  visible_sections: DashboardVisibility
  quick_actions: DashboardQuickAction[]
  enrollment: DashboardEnrollmentSummary | null
  today_attendance: DashboardAttendanceSummary | null
  fee_collection: DashboardFeeCollectionSummary | null
  recent_payments: DashboardRecentPayment[]
  pending_actions: DashboardPendingActions | null
  recent_activity: DashboardRecentActivityItem[]
  teacher_summary: DashboardTeacherSummary | null
}

interface BuildAdminDashboardParams {
  schoolId: string
  userId: string
  role: AdminDashboardRole
  permissions: string[]
}

interface BaseDashboardSnapshot {
  school: DashboardSchoolSummary
  enrollment: DashboardEnrollmentSummary
  today_attendance: DashboardAttendanceSummary
  fee_collection: DashboardFeeCollectionSummary
  recent_payments: DashboardRecentPayment[]
  pending_actions: DashboardPendingActions
  recent_activity: DashboardRecentActivityItem[]
  currentAcademicYearId: string | null
}

const ATTENDANCE_NAV_PERMISSIONS = ['ATTENDANCE.view_all', 'ATTENDANCE.view_own_class']
const GRADES_NAV_PERMISSIONS = ['GRADES.view_all', 'GRADES.view_own_subject']

const QUICK_ACTIONS: Array<
  DashboardQuickAction & {
    permission: string
  }
> = [
  {
    key: 'mark-attendance',
    label: 'Mark Attendance',
    description: 'Open today’s attendance workflow',
    href: '/admin/attendance',
    icon: 'attendance',
    permission: 'ATTENDANCE.mark',
  },
  {
    key: 'record-payment',
    label: 'Record Payment',
    description: 'Capture a new fee payment',
    href: '/admin/fees',
    icon: 'fees',
    permission: 'FEES.record_payment',
  },
  {
    key: 'add-student',
    label: 'Add Student',
    description: 'Create a new student profile',
    href: '/admin/students',
    icon: 'students',
    permission: 'STUDENTS.create',
  },
  {
    key: 'create-circular',
    label: 'Create Circular',
    description: 'Publish a new school update',
    href: '/admin/circulars',
    icon: 'announcements',
    permission: 'ANNOUNCEMENTS.create',
  },
]

function hasAccess(
  role: string,
  permissions: string[],
  required: string | string[]
): boolean {
  if (role === 'SUPER_ADMIN' || role === 'PRINCIPAL') {
    return true
  }

  const requiredPermissions = Array.isArray(required) ? required : [required]
  return requiredPermissions.some((permission) => permissions.includes(permission))
}

function startOfTodayUtc(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}

function startOfMonthUtc(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
}

function toNumber(value: unknown): number {
  if (typeof value === 'number') {
    return value
  }

  if (typeof value === 'bigint') {
    return Number(value)
  }

  if (value && typeof value === 'object' && 'toNumber' in value && typeof value.toNumber === 'function') {
    return value.toNumber()
  }

  if (typeof value === 'string') {
    return Number(value)
  }

  return 0
}

function trimClassName(name: string, section?: string | null): string {
  return `${name} ${section || ''}`.trim()
}

export function getAdminDashboardVisibility(
  role: AdminDashboardRole,
  permissions: string[]
): DashboardVisibility {
  const canViewAttendance = hasAccess(role, permissions, ATTENDANCE_NAV_PERMISSIONS)

  switch (role) {
    case 'SUPER_ADMIN':
    case 'PRINCIPAL':
      return {
        enrollment: true,
        attendance: true,
        fee_collection: true,
        recent_payments: true,
        pending_actions: true,
        recent_activity: true,
        teacher_summary: false,
      }
    case 'STAFF_ADMIN':
      return {
        enrollment: hasAccess(role, permissions, 'STAFF.view') || hasAccess(role, permissions, 'STUDENTS.view'),
        attendance: canViewAttendance,
        fee_collection: false,
        recent_payments: false,
        pending_actions: false,
        recent_activity: true,
        teacher_summary: false,
      }
    case 'STUDENT_ADMIN':
      return {
        enrollment: hasAccess(role, permissions, 'STUDENTS.view'),
        attendance: canViewAttendance,
        fee_collection: false,
        recent_payments: false,
        pending_actions: true,
        recent_activity: false,
        teacher_summary: false,
      }
    case 'ACCOUNTANT':
      return {
        enrollment: false,
        attendance: false,
        fee_collection: hasAccess(role, permissions, ['FEES.view_structure', 'FEES.view_reports']),
        recent_payments: hasAccess(role, permissions, ['FEES.view_reports', 'FEES.record_payment']),
        pending_actions: true,
        recent_activity: false,
        teacher_summary: false,
      }
    case 'TEACHER':
      return {
        enrollment: false,
        attendance: canViewAttendance,
        fee_collection: false,
        recent_payments: false,
        pending_actions: false,
        recent_activity: false,
        teacher_summary: hasAccess(role, permissions, GRADES_NAV_PERMISSIONS),
      }
  }
}

export function getAdminQuickActions(
  role: AdminDashboardRole,
  permissions: string[]
): DashboardQuickAction[] {
  return QUICK_ACTIONS.filter((action) => hasAccess(role, permissions, action.permission)).map(
    ({ permission: _permission, ...action }) => action
  )
}

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

export async function resolveAdminDashboardSchoolId(
  schoolId: string | null | undefined,
  role: string
): Promise<string | null> {
  if (schoolId) {
    return schoolId
  }

  if (role !== 'SUPER_ADMIN') {
    return null
  }

  const school = await prisma.school.findFirst({
    where: { is_active: true },
    orderBy: { created_at: 'asc' },
    select: { id: true },
  })

  return school?.id || null
}

async function getBaseDashboardSnapshot(schoolId: string): Promise<BaseDashboardSnapshot> {
  const cacheKey = `dashboard:admin:${schoolId}`
  const cached = await cacheGet<BaseDashboardSnapshot>(cacheKey)

  if (cached) {
    return cached
  }

  const today = startOfTodayUtc()
  const monthStart = startOfMonthUtc(today)

  const schoolRecord = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { id: true, name: true },
  })

  const currentAcademicYear = await prisma.academicYear.findFirst({
    where: { school_id: schoolId, is_current: true },
    select: {
      id: true,
      name: true,
      start_date: true,
      end_date: true,
    },
    orderBy: { start_date: 'desc' },
  })

  const currentTerm = currentAcademicYear
    ? await prisma.term.findFirst({
        where: {
          school_id: schoolId,
          academic_year_id: currentAcademicYear.id,
        },
        orderBy: [{ start_date: 'asc' }],
        select: {
          name: true,
          start_date: true,
          end_date: true,
        },
      })
    : null

  const currentTermName =
    currentAcademicYear && currentTerm
      ? (
          await prisma.term.findFirst({
            where: {
              school_id: schoolId,
              academic_year_id: currentAcademicYear.id,
              start_date: { lte: today },
              end_date: { gte: today },
            },
            orderBy: { start_date: 'asc' },
            select: { name: true },
          })
        )?.name || currentTerm.name
      : ''

  const classWhere = currentAcademicYear
    ? { school_id: schoolId, academic_year_id: currentAcademicYear.id }
    : { school_id: schoolId }

  const studentWhere = currentAcademicYear
    ? { school_id: schoolId, is_active: true, academic_year_id: currentAcademicYear.id }
    : { school_id: schoolId, is_active: true }

  const [classes, totalStudents, totalStaff, todayAttendanceRecords, feeStructures, payments, recentPayments, pendingAdmissions, pendingConcessions, overdueBooks, recentActivity] =
    await Promise.all([
      prisma.class.findMany({
        where: classWhere,
        select: {
          id: true,
          name: true,
          section: true,
          _count: {
            select: {
              students: {
                where: currentAcademicYear
                  ? { is_active: true, academic_year_id: currentAcademicYear.id }
                  : { is_active: true },
              },
            },
          },
        },
        orderBy: [{ name: 'asc' }, { section: 'asc' }],
      }),
      prisma.student.count({ where: studentWhere }),
      prisma.staff.count({ where: { school_id: schoolId, is_active: true } }),
      prisma.attendance.findMany({
        where: currentAcademicYear
          ? {
              school_id: schoolId,
              date: today,
              class: { academic_year_id: currentAcademicYear.id },
            }
          : { school_id: schoolId, date: today },
        select: {
          class_id: true,
          status: true,
        },
      }),
      currentAcademicYear
        ? prisma.feeStructure.findMany({
            where: { school_id: schoolId, academic_year_id: currentAcademicYear.id },
            select: {
              class_id: true,
              amount: true,
            },
          })
        : Promise.resolve([]),
      currentAcademicYear
        ? prisma.feePayment.findMany({
            where: {
              school_id: schoolId,
              structure: { academic_year_id: currentAcademicYear.id },
            },
            select: {
              amount_paid: true,
              payment_date: true,
            },
          })
        : Promise.resolve([]),
      prisma.feePayment.findMany({
        where: currentAcademicYear
          ? {
              school_id: schoolId,
              structure: { academic_year_id: currentAcademicYear.id },
            }
          : { school_id: schoolId },
        orderBy: [{ payment_date: 'desc' }, { created_at: 'desc' }],
        take: 5,
        select: {
          id: true,
          amount_paid: true,
          receipt_number: true,
          payment_date: true,
          student: {
            select: {
              first_name: true,
              last_name: true,
            },
          },
        },
      }),
      prisma.admission.count({
        where: {
          school_id: schoolId,
          status: { notIn: ['ADMITTED', 'REJECTED'] },
        },
      }),
      prisma.feeConcession.count({
        where: { school_id: schoolId, status: 'PENDING' },
      }),
      prisma.bookIssue.count({
        where: { school_id: schoolId, status: 'OVERDUE' },
      }),
      prisma.auditLog.findMany({
        where: { school_id: schoolId },
        orderBy: { created_at: 'desc' },
        take: 10,
        select: {
          id: true,
          action: true,
          entity_type: true,
          created_at: true,
          user: {
            select: {
              email: true,
            },
          },
        },
      }),
    ])

  const classWise = classes.map((item) => ({
    class_id: item.id,
    class_name: trimClassName(item.name, item.section),
    student_count: item._count.students,
  }))

  const classesMarkedToday = new Set(todayAttendanceRecords.map((record) => record.class_id))
  let present = 0
  let absent = 0
  let late = 0

  for (const record of todayAttendanceRecords) {
    if (record.status === 'ABSENT') {
      absent += 1
      continue
    }

    if (record.status === 'LATE') {
      late += 1
      continue
    }

    present += 1
  }

  const markedCount = present + absent + late
  const percentage = markedCount > 0 ? Number((((present + late) / markedCount) * 100).toFixed(1)) : 0

  const studentCountByClass = new Map(classWise.map((item) => [item.class_id, item.student_count]))
  const totalExpected = feeStructures.reduce((sum, structure) => {
    const classStudentCount = studentCountByClass.get(structure.class_id) || 0
    return sum + toNumber(structure.amount) * classStudentCount
  }, 0)

  const totalCollected = payments.reduce((sum, payment) => sum + toNumber(payment.amount_paid), 0)
  const thisMonthCollected = payments.reduce((sum, payment) => {
    return payment.payment_date >= monthStart ? sum + toNumber(payment.amount_paid) : sum
  }, 0)
  const totalOutstanding = Math.max(totalExpected - totalCollected, 0)
  const collectionPercentage =
    totalExpected > 0 ? Number(((totalCollected / totalExpected) * 100).toFixed(1)) : 0

  const snapshot: BaseDashboardSnapshot = {
    school: {
      id: schoolRecord?.id || schoolId,
      name: schoolRecord?.name || 'School',
      academic_year: currentAcademicYear?.name || 'Not configured',
      term: currentTermName || 'Not set',
    },
    enrollment: {
      total_students: totalStudents,
      total_staff: totalStaff,
      total_classes: classes.length,
      class_wise: classWise,
    },
    today_attendance: {
      total_students: totalStudents,
      present,
      absent,
      late,
      percentage,
      not_marked: Math.max(classes.length - classesMarkedToday.size, 0),
    },
    fee_collection: {
      total_expected: totalExpected,
      total_collected: totalCollected,
      total_outstanding: totalOutstanding,
      collection_percentage: collectionPercentage,
      this_month_collected: thisMonthCollected,
    },
    recent_payments: recentPayments.map((payment) => ({
      id: payment.id,
      student_name: `${payment.student.first_name} ${payment.student.last_name}`.trim(),
      amount: toNumber(payment.amount_paid),
      receipt_number: payment.receipt_number,
      date: payment.payment_date.toISOString(),
    })),
    pending_actions: {
      pending_admissions: pendingAdmissions,
      pending_concessions: pendingConcessions,
      overdue_books: overdueBooks,
    },
    recent_activity: recentActivity.map((item) => ({
      id: item.id,
      action: item.action,
      entity_type: item.entity_type,
      user_name: item.user.email?.split('@')[0] || 'system',
      timestamp: item.created_at.toISOString(),
    })),
    currentAcademicYearId: currentAcademicYear?.id || null,
  }

  try {
    await cacheSet(cacheKey, snapshot, 60 * 5)
  } catch (error) {
    logger.warn({ error, cacheKey }, 'Failed to cache admin dashboard snapshot')
  }

  return snapshot
}

async function getTeacherSummary(
  schoolId: string,
  userId: string,
  currentAcademicYearId: string | null
): Promise<{
  attendance: DashboardAttendanceSummary
  summary: DashboardTeacherSummary | null
}> {
  const defaultAttendance: DashboardAttendanceSummary = {
    total_students: 0,
    present: 0,
    absent: 0,
    late: 0,
    percentage: 0,
    not_marked: 0,
  }

  const staffRecord = await prisma.staff.findFirst({
    where: { school_id: schoolId, user_id: userId },
    select: { id: true },
  })

  if (!staffRecord) {
    return { attendance: defaultAttendance, summary: null }
  }

  const [subjectAssignments, classTeacherAssignments] = await Promise.all([
    prisma.subjectAssignment.findMany({
      where: currentAcademicYearId
        ? {
            school_id: schoolId,
            staff_id: staffRecord.id,
            academic_year_id: currentAcademicYearId,
          }
        : { school_id: schoolId, staff_id: staffRecord.id },
      select: {
        subject_id: true,
        subject: {
          select: {
            class_id: true,
            class: {
              select: {
                id: true,
                name: true,
                section: true,
              },
            },
          },
        },
      },
    }),
    prisma.class.findMany({
      where: currentAcademicYearId
        ? {
            school_id: schoolId,
            academic_year_id: currentAcademicYearId,
            class_teacher_id: staffRecord.id,
          }
        : {
            school_id: schoolId,
            class_teacher_id: staffRecord.id,
          },
      select: {
        id: true,
        name: true,
        section: true,
      },
    }),
  ])

  const classMap = new Map<string, string>()
  const subjectIds = new Set<string>()

  for (const assignment of subjectAssignments) {
    subjectIds.add(assignment.subject_id)
    classMap.set(
      assignment.subject.class.id,
      trimClassName(assignment.subject.class.name, assignment.subject.class.section)
    )
  }

  for (const schoolClass of classTeacherAssignments) {
    classMap.set(schoolClass.id, trimClassName(schoolClass.name, schoolClass.section))
  }

  const ownClassIds = Array.from(classMap.keys())
  if (ownClassIds.length === 0) {
    return {
      attendance: defaultAttendance,
      summary: {
        assigned_classes: 0,
        assigned_subjects: subjectIds.size,
        total_students: 0,
        classes_marked_today: 0,
        class_names: [],
        grade_entries_recorded: 0,
        latest_exam_name: null,
      },
    }
  }

  const today = startOfTodayUtc()

  const [studentCount, attendanceRecords, gradesRecorded, latestExam] = await Promise.all([
    prisma.student.count({
      where: currentAcademicYearId
        ? {
            school_id: schoolId,
            is_active: true,
            academic_year_id: currentAcademicYearId,
            class_id: { in: ownClassIds },
          }
        : {
            school_id: schoolId,
            is_active: true,
            class_id: { in: ownClassIds },
          },
    }),
    prisma.attendance.findMany({
      where: {
        school_id: schoolId,
        date: today,
        class_id: { in: ownClassIds },
      },
      select: {
        class_id: true,
        status: true,
      },
    }),
    prisma.grade.count({
      where: currentAcademicYearId
        ? {
            school_id: schoolId,
            entered_by: staffRecord.id,
            exam: { academic_year_id: currentAcademicYearId },
          }
        : {
            school_id: schoolId,
            entered_by: staffRecord.id,
          },
    }),
    prisma.exam.findFirst({
      where: currentAcademicYearId
        ? {
            school_id: schoolId,
            academic_year_id: currentAcademicYearId,
            class_id: { in: ownClassIds },
          }
        : {
            school_id: schoolId,
            class_id: { in: ownClassIds },
          },
      orderBy: [{ start_date: 'desc' }, { created_at: 'desc' }],
      select: { name: true },
    }),
  ])

  let present = 0
  let absent = 0
  let late = 0

  for (const record of attendanceRecords) {
    if (record.status === 'ABSENT') {
      absent += 1
      continue
    }

    if (record.status === 'LATE') {
      late += 1
      continue
    }

    present += 1
  }

  const markedCount = present + absent + late
  const percentage = markedCount > 0 ? Number((((present + late) / markedCount) * 100).toFixed(1)) : 0
  const classesMarkedToday = new Set(attendanceRecords.map((record) => record.class_id)).size

  return {
    attendance: {
      total_students: studentCount,
      present,
      absent,
      late,
      percentage,
      not_marked: Math.max(ownClassIds.length - classesMarkedToday, 0),
    },
    summary: {
      assigned_classes: ownClassIds.length,
      assigned_subjects: subjectIds.size,
      total_students: studentCount,
      classes_marked_today: classesMarkedToday,
      class_names: Array.from(classMap.values()),
      grade_entries_recorded: gradesRecorded,
      latest_exam_name: latestExam?.name || null,
    },
  }
}

function filterPendingActionsByRole(
  role: AdminDashboardRole,
  pendingActions: DashboardPendingActions
): DashboardPendingActions {
  switch (role) {
    case 'STUDENT_ADMIN':
      return {
        pending_admissions: pendingActions.pending_admissions,
        pending_concessions: 0,
        overdue_books: 0,
      }
    case 'ACCOUNTANT':
      return {
        pending_admissions: 0,
        pending_concessions: pendingActions.pending_concessions,
        overdue_books: 0,
      }
    default:
      return pendingActions
  }
}

export async function getAdminDashboardData(
  params: BuildAdminDashboardParams
): Promise<AdminDashboardPayload> {
  const snapshot = await getBaseDashboardSnapshot(params.schoolId)
  const visibility = getAdminDashboardVisibility(params.role, params.permissions)
  const quickActions = getAdminQuickActions(params.role, params.permissions)

  const teacherScoped =
    visibility.teacher_summary || (params.role === 'TEACHER' && visibility.attendance)
      ? await getTeacherSummary(params.schoolId, params.userId, snapshot.currentAcademicYearId)
      : null

  return {
    school: snapshot.school,
    generated_at: new Date().toISOString(),
    visible_sections: visibility,
    quick_actions: quickActions,
    enrollment: visibility.enrollment ? snapshot.enrollment : null,
    today_attendance: visibility.attendance
      ? params.role === 'TEACHER'
        ? teacherScoped?.attendance || null
        : snapshot.today_attendance
      : null,
    fee_collection: visibility.fee_collection ? snapshot.fee_collection : null,
    recent_payments: visibility.recent_payments ? snapshot.recent_payments : [],
    pending_actions: visibility.pending_actions
      ? filterPendingActionsByRole(params.role, snapshot.pending_actions)
      : null,
    recent_activity: visibility.recent_activity ? snapshot.recent_activity : [],
    teacher_summary: visibility.teacher_summary ? teacherScoped?.summary || null : null,
  }
}

export function isAdminDashboardRole(role: string): role is AdminDashboardRole {
  return ADMIN_DASHBOARD_ALLOWED_ROLES.includes(role as AdminDashboardRole)
}
