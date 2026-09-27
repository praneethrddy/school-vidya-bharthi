import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  cacheGet: vi.fn(),
  cacheSet: vi.fn(),
  loggerWarn: vi.fn(),
  schoolFindFirst: vi.fn(),
  schoolFindUnique: vi.fn(),
  academicYearFindFirst: vi.fn(),
  termFindFirst: vi.fn(),
  classFindMany: vi.fn(),
  studentCount: vi.fn(),
  staffCount: vi.fn(),
  staffFindFirst: vi.fn(),
  attendanceFindMany: vi.fn(),
  feeStructureFindMany: vi.fn(),
  feePaymentFindMany: vi.fn(),
  admissionCount: vi.fn(),
  feeConcessionCount: vi.fn(),
  bookIssueCount: vi.fn(),
  auditLogFindMany: vi.fn(),
  subjectAssignmentFindMany: vi.fn(),
  gradeCount: vi.fn(),
  examFindFirst: vi.fn(),
}))

vi.mock('@/lib/cache', () => ({
  cacheGet: mocks.cacheGet,
  cacheSet: mocks.cacheSet,
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    warn: mocks.loggerWarn,
  },
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    school: {
      findFirst: mocks.schoolFindFirst,
      findUnique: mocks.schoolFindUnique,
    },
    academicYear: {
      findFirst: mocks.academicYearFindFirst,
    },
    term: {
      findFirst: mocks.termFindFirst,
    },
    class: {
      findMany: mocks.classFindMany,
    },
    student: {
      count: mocks.studentCount,
    },
    staff: {
      count: mocks.staffCount,
      findFirst: mocks.staffFindFirst,
    },
    attendance: {
      findMany: mocks.attendanceFindMany,
    },
    feeStructure: {
      findMany: mocks.feeStructureFindMany,
    },
    feePayment: {
      findMany: mocks.feePaymentFindMany,
    },
    admission: {
      count: mocks.admissionCount,
    },
    feeConcession: {
      count: mocks.feeConcessionCount,
    },
    bookIssue: {
      count: mocks.bookIssueCount,
    },
    auditLog: {
      findMany: mocks.auditLogFindMany,
    },
    subjectAssignment: {
      findMany: mocks.subjectAssignmentFindMany,
    },
    grade: {
      count: mocks.gradeCount,
    },
    exam: {
      findFirst: mocks.examFindFirst,
    },
  },
}))

import {
  getAdminDashboardData,
  getAdminDashboardVisibility,
  getAdminQuickActions,
  resolveAdminDashboardSchoolId,
} from '@/lib/admin-dashboard'

function primeSnapshotMocks() {
  mocks.schoolFindUnique.mockResolvedValue({
    id: 'school-1',
    name: 'Vidhya Bharthi High School',
  })
  mocks.academicYearFindFirst.mockResolvedValue({
    id: 'year-1',
    name: '2026-2027',
    start_date: new Date('2026-04-01T00:00:00.000Z'),
    end_date: new Date('2027-03-31T00:00:00.000Z'),
  })
  mocks.termFindFirst.mockResolvedValue({
    name: 'Term 1',
    start_date: new Date('2026-04-01T00:00:00.000Z'),
    end_date: new Date('2026-09-30T00:00:00.000Z'),
  })
  mocks.classFindMany.mockResolvedValue([
    { id: 'class-1', name: 'Grade 6', section: 'A', _count: { students: 2 } },
    { id: 'class-2', name: 'Grade 7', section: 'B', _count: { students: 3 } },
    { id: 'class-3', name: 'Grade 8', section: null, _count: { students: 0 } },
  ])
  mocks.studentCount.mockResolvedValue(5)
  mocks.staffCount.mockResolvedValue(12)
  mocks.attendanceFindMany.mockResolvedValue([
    { class_id: 'class-1', status: 'PRESENT' },
    { class_id: 'class-1', status: 'LATE' },
    { class_id: 'class-2', status: 'ABSENT' },
  ])
  mocks.feeStructureFindMany.mockResolvedValue([
    { class_id: 'class-1', amount: 1000 },
    { class_id: 'class-2', amount: 2000 },
  ])
  mocks.feePaymentFindMany
    .mockResolvedValueOnce([
      { amount_paid: 1500, payment_date: new Date('2026-04-05T00:00:00.000Z') },
      { amount_paid: 500, payment_date: new Date('2026-03-28T00:00:00.000Z') },
    ])
    .mockResolvedValueOnce([
      {
        id: 'pay-1',
        amount_paid: 1500,
        receipt_number: 'RCPT-1001',
        payment_date: new Date('2026-04-05T00:00:00.000Z'),
        student: { first_name: 'Asha', last_name: 'Rao' },
      },
      {
        id: 'pay-2',
        amount_paid: 500,
        receipt_number: 'RCPT-1002',
        payment_date: new Date('2026-03-28T00:00:00.000Z'),
        student: { first_name: 'Ravi', last_name: 'Kumar' },
      },
    ])
  mocks.admissionCount.mockResolvedValue(4)
  mocks.feeConcessionCount.mockResolvedValue(2)
  mocks.bookIssueCount.mockResolvedValue(1)
  mocks.auditLogFindMany.mockResolvedValue([
    {
      id: 'audit-1',
      action: 'CREATE',
      entity_type: 'student',
      created_at: new Date('2026-04-15T09:00:00.000Z'),
      user: { email: 'office@vbhs.com' },
    },
    {
      id: 'audit-2',
      action: 'UPDATE',
      entity_type: 'fee_payment',
      created_at: new Date('2026-04-15T08:00:00.000Z'),
      user: { email: null },
    },
  ])
  mocks.staffFindFirst.mockResolvedValue(null)
  mocks.subjectAssignmentFindMany.mockResolvedValue([])
  mocks.gradeCount.mockResolvedValue(0)
  mocks.examFindFirst.mockResolvedValue(null)
}

describe('admin-dashboard service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-15T10:00:00.000Z'))
    mocks.cacheGet.mockResolvedValue(null)
    mocks.cacheSet.mockResolvedValue(undefined)
    primeSnapshotMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('TEST-ADL-001 enrollment summary includes class-wise breakdown', async () => {
    const payload = await getAdminDashboardData({
      schoolId: 'school-1',
      userId: 'principal-1',
      role: 'PRINCIPAL',
      permissions: [],
    })

    expect(payload.enrollment).toEqual({
      total_students: 5,
      total_staff: 12,
      total_classes: 3,
      class_wise: [
        { class_id: 'class-1', class_name: 'Grade 6 A', student_count: 2 },
        { class_id: 'class-2', class_name: 'Grade 7 B', student_count: 3 },
        { class_id: 'class-3', class_name: 'Grade 8', student_count: 0 },
      ],
    })
  })

  it('TEST-ADL-002 attendance summary computes percentage and not-marked classes', async () => {
    const payload = await getAdminDashboardData({
      schoolId: 'school-1',
      userId: 'principal-1',
      role: 'PRINCIPAL',
      permissions: [],
    })

    expect(payload.today_attendance).toEqual({
      total_students: 5,
      present: 1,
      absent: 1,
      late: 1,
      percentage: 66.7,
      not_marked: 1,
    })
  })

  it('TEST-ADL-003 fee collection summary includes expected/collected/outstanding totals', async () => {
    const payload = await getAdminDashboardData({
      schoolId: 'school-1',
      userId: 'principal-1',
      role: 'PRINCIPAL',
      permissions: [],
    })

    expect(payload.fee_collection).toEqual({
      total_expected: 8000,
      total_collected: 2000,
      total_outstanding: 6000,
      collection_percentage: 25,
      this_month_collected: 1500,
    })
  })

  it('TEST-ADL-004 pending actions are aggregated and role-scoped', async () => {
    const principalPayload = await getAdminDashboardData({
      schoolId: 'school-1',
      userId: 'principal-1',
      role: 'PRINCIPAL',
      permissions: [],
    })

    expect(principalPayload.pending_actions).toEqual({
      pending_admissions: 4,
      pending_concessions: 2,
      overdue_books: 1,
    })

    primeSnapshotMocks()
    const accountantPayload = await getAdminDashboardData({
      schoolId: 'school-1',
      userId: 'accountant-1',
      role: 'ACCOUNTANT',
      permissions: ['FEES.view_reports'],
    })
    expect(accountantPayload.pending_actions).toEqual({
      pending_admissions: 0,
      pending_concessions: 2,
      overdue_books: 0,
    })
  })

  it('TEST-ADL-005 recent activity feed maps username safely', async () => {
    const payload = await getAdminDashboardData({
      schoolId: 'school-1',
      userId: 'principal-1',
      role: 'PRINCIPAL',
      permissions: [],
    })

    expect(payload.recent_activity).toEqual([
      {
        id: 'audit-1',
        action: 'CREATE',
        entity_type: 'student',
        user_name: 'office',
        timestamp: '2026-04-15T09:00:00.000Z',
      },
      {
        id: 'audit-2',
        action: 'UPDATE',
        entity_type: 'fee_payment',
        user_name: 'system',
        timestamp: '2026-04-15T08:00:00.000Z',
      },
    ])
  })

  it('TEST-ADMIN-DASH-003 uses cached snapshot and skips DB queries on cache hit', async () => {
    const cachedSnapshot = {
      school: {
        id: 'school-1',
        name: 'Cached School',
        academic_year: '2026-2027',
        term: 'Term 1',
      },
      enrollment: {
        total_students: 50,
        total_staff: 8,
        total_classes: 3,
        class_wise: [{ class_id: 'class-1', class_name: 'Grade 6 A', student_count: 20 }],
      },
      today_attendance: {
        total_students: 50,
        present: 45,
        absent: 3,
        late: 2,
        percentage: 94,
        not_marked: 0,
      },
      fee_collection: {
        total_expected: 100000,
        total_collected: 70000,
        total_outstanding: 30000,
        collection_percentage: 70,
        this_month_collected: 15000,
      },
      recent_payments: [],
      pending_actions: {
        pending_admissions: 1,
        pending_concessions: 2,
        overdue_books: 3,
      },
      recent_activity: [],
      currentAcademicYearId: 'year-1',
    }

    mocks.cacheGet.mockResolvedValue(cachedSnapshot)

    const payload = await getAdminDashboardData({
      schoolId: 'school-1',
      userId: 'principal-1',
      role: 'PRINCIPAL',
      permissions: [],
    })

    expect(payload.school.name).toBe('Cached School')
    expect(payload.fee_collection?.total_collected).toBe(70000)
    expect(mocks.classFindMany).not.toHaveBeenCalled()
    expect(mocks.cacheSet).not.toHaveBeenCalled()
  })

  it('caches fresh snapshot after DB read and logs warning if cache write fails', async () => {
    mocks.cacheSet.mockRejectedValue(new Error('redis unavailable'))

    const payload = await getAdminDashboardData({
      schoolId: 'school-1',
      userId: 'principal-1',
      role: 'PRINCIPAL',
      permissions: [],
    })

    expect(payload.school.id).toBe('school-1')
    expect(mocks.cacheSet).toHaveBeenCalledWith(
      'dashboard:admin:school-1',
      expect.objectContaining({
        school: expect.any(Object),
        enrollment: expect.any(Object),
      }),
      300
    )
    expect(mocks.loggerWarn).toHaveBeenCalled()
  })

  it('scopes resolveAdminDashboardSchoolId correctly for super admin and non-super roles', async () => {
    expect(await resolveAdminDashboardSchoolId('school-9', 'PRINCIPAL')).toBe('school-9')
    expect(mocks.schoolFindFirst).not.toHaveBeenCalled()

    mocks.schoolFindFirst.mockResolvedValueOnce({ id: 'school-seeded' })
    expect(await resolveAdminDashboardSchoolId(null, 'SUPER_ADMIN')).toBe('school-seeded')

    expect(await resolveAdminDashboardSchoolId(null, 'TEACHER')).toBeNull()
  })

  it('gives principal full visibility and filters quick actions by permission', () => {
    expect(getAdminDashboardVisibility('PRINCIPAL', [])).toEqual({
      enrollment: true,
      attendance: true,
      fee_collection: true,
      recent_payments: true,
      pending_actions: true,
      recent_activity: true,
      teacher_summary: false,
    })

    expect(
      getAdminQuickActions('ACCOUNTANT', ['FEES.record_payment', 'ANNOUNCEMENTS.create'])
    ).toEqual([
      expect.objectContaining({ key: 'record-payment', href: '/admin/fees' }),
      expect.objectContaining({ key: 'create-circular', href: '/admin/circulars' }),
    ])
  })
})
