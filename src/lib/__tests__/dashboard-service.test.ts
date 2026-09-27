import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  studentFindFirst: vi.fn(),
  parentFindFirst: vi.fn(),
  studentParentFindFirst: vi.fn(),
  studentFindUnique: vi.fn(),
  announcementFindMany: vi.fn(),
  attendanceFindMany: vi.fn(),
  examFindMany: vi.fn(),
  gradeFindMany: vi.fn(),
  schoolSettingFindFirst: vi.fn(),
  redisGet: vi.fn(),
  redisSet: vi.fn(),
  getFeesData: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    student: {
      findFirst: mocks.studentFindFirst,
      findUnique: mocks.studentFindUnique,
    },
    parent: {
      findFirst: mocks.parentFindFirst,
    },
    studentParent: {
      findFirst: mocks.studentParentFindFirst,
    },
    announcement: {
      findMany: mocks.announcementFindMany,
    },
    attendance: {
      findMany: mocks.attendanceFindMany,
    },
    exam: {
      findMany: mocks.examFindMany,
    },
    grade: {
      findMany: mocks.gradeFindMany,
    },
    schoolSetting: {
      findFirst: mocks.schoolSettingFindFirst,
    },
  },
}))

vi.mock('@/lib/redis', () => ({
  redis: {
    get: mocks.redisGet,
    set: mocks.redisSet,
  },
}))

vi.mock('@/lib/fee-service', () => ({
  getFeesData: mocks.getFeesData,
}))

import { getDashboardData } from '@/lib/dashboard-service'

function buildStudent(overrides: Record<string, unknown> = {}) {
  return {
    id: 'student-1',
    school_id: 'school-1',
    first_name: 'Asha',
    last_name: 'Rao',
    class_id: 'class-1',
    roll_number: '12',
    photo_url: null,
    class: { name: 'Grade 6', section: 'A' },
    academic_year: {
      id: 'year-1',
      name: '2026-2027',
      start_date: new Date('2026-04-01T00:00:00.000Z'),
      end_date: new Date('2027-03-31T00:00:00.000Z'),
    },
    ...overrides,
  }
}

describe('dashboard-service getDashboardData', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()

    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    mocks.redisGet.mockResolvedValue(null)
    mocks.redisSet.mockResolvedValue(undefined)

    mocks.studentFindFirst.mockResolvedValue({ id: 'student-1' })
    mocks.parentFindFirst.mockResolvedValue({ id: 'parent-1' })
    mocks.studentParentFindFirst.mockResolvedValue({ student_id: 'student-1' })
    mocks.studentFindUnique.mockResolvedValue(buildStudent())

    mocks.announcementFindMany.mockResolvedValue([
      {
        id: 'ann-1',
        title: 'School Reopens',
        type: 'GENERAL',
        published_at: new Date('2026-04-10T00:00:00.000Z'),
      },
    ])
    mocks.attendanceFindMany.mockResolvedValue([])
    mocks.examFindMany.mockResolvedValue([])
    mocks.gradeFindMany.mockResolvedValue([])
    mocks.schoolSettingFindFirst.mockResolvedValue({ setting_value: 'PERCENTAGE' })

    mocks.getFeesData.mockResolvedValue({
      fee_summary: {
        total_fees: 10000,
        total_concessions: 1000,
        total_paid: 4000,
        total_balance: 5000,
      },
    })
  })

  afterEach(() => {
    warnSpy.mockRestore()
  })

  it('TEST-DS-001 resolves student dashboard by user_id for STUDENT role', async () => {
    const payload = await getDashboardData('user-1', 'school-1', 'STUDENT')

    expect(mocks.studentFindFirst).toHaveBeenCalledWith({
      where: { user_id: 'user-1', school_id: 'school-1' },
    })
    expect(payload.student).toEqual(
      expect.objectContaining({
        id: 'student-1',
        name: 'Asha Rao',
      })
    )
  })

  it('TEST-DS-002 resolves parent dashboard using first linked child when queryStudentId is missing', async () => {
    mocks.studentParentFindFirst.mockResolvedValueOnce({ student_id: 'child-1' })
    mocks.studentFindUnique.mockResolvedValueOnce(buildStudent({ id: 'child-1' }))

    const payload = await getDashboardData('parent-user', 'school-1', 'PARENT')

    expect(mocks.parentFindFirst).toHaveBeenCalledWith({
      where: { user_id: 'parent-user', school_id: 'school-1' },
    })
    expect(mocks.studentParentFindFirst).toHaveBeenCalledWith({
      where: { parent_id: 'parent-1', school_id: 'school-1' },
      orderBy: { created_at: 'asc' },
    })
    expect(payload.student.id).toBe('child-1')
  })

  it('TEST-DS-003 validates parent-child relationship for queryStudentId', async () => {
    mocks.studentParentFindFirst.mockResolvedValueOnce({ parent_id: 'parent-1', student_id: 'child-2' })
    mocks.studentFindUnique.mockResolvedValueOnce(buildStudent({ id: 'child-2' }))

    const payload = await getDashboardData('parent-user', 'school-1', 'PARENT', 'child-2')

    expect(mocks.studentParentFindFirst).toHaveBeenCalledWith({
      where: { parent_id: 'parent-1', student_id: 'child-2', school_id: 'school-1' },
    })
    expect(payload.student.id).toBe('child-2')
  })

  it('TEST-DS-004 throws when parent requests an unauthorized child', async () => {
    mocks.studentParentFindFirst.mockResolvedValueOnce(null)

    await expect(
      getDashboardData('parent-user', 'school-1', 'PARENT', 'child-999')
    ).rejects.toThrow('Unauthorized to view this student')
  })

  it('TEST-DS-005 computes attendance summary percentage correctly', async () => {
    mocks.attendanceFindMany.mockResolvedValueOnce([
      { status: 'PRESENT' },
      { status: 'LATE' },
      { status: 'HALF_DAY' },
      { status: 'ABSENT' },
    ])

    const payload = await getDashboardData('user-1', 'school-1', 'STUDENT')

    expect(payload.attendance_summary).toEqual({
      percentage: 75,
      present: 1,
      absent: 1,
      late: 1,
      half_day: 1,
      total_days: 4,
    })
  })

  it.each([
    { marks: 95, expectedGrade: 'A+' },
    { marks: 85, expectedGrade: 'A' },
    { marks: 75, expectedGrade: 'B' },
    { marks: 65, expectedGrade: 'C' },
    { marks: 55, expectedGrade: 'D' },
    { marks: 45, expectedGrade: 'F' },
  ])(
    'TEST-DS-006 computes grade boundaries for %s marks',
    async ({ marks, expectedGrade }) => {
      mocks.examFindMany.mockResolvedValueOnce([
        {
          id: 'exam-1',
          name: 'Midterm',
          exam_subjects: [
            {
              subject_id: 'subject-1',
              max_marks: 100,
              passing_marks: 35,
            },
          ],
        },
      ])
      mocks.gradeFindMany.mockResolvedValueOnce([
        {
          subject_id: 'subject-1',
          marks_obtained: marks,
        },
      ])

      const payload = await getDashboardData('user-1', 'school-1', 'STUDENT')

      expect(payload.grade_summary).toEqual(
        expect.objectContaining({
          last_exam: 'Midterm',
          percentage: marks,
          overall_grade: expectedGrade,
          grading_scheme: 'PERCENTAGE',
        })
      )
    }
  )

  it('TEST-DS-007 integrates fee summary from fee-service', async () => {
    const expectedFeeSummary = {
      total_fees: 90000,
      total_concessions: 5000,
      total_paid: 45000,
      total_balance: 40000,
    }
    mocks.getFeesData.mockResolvedValueOnce({ fee_summary: expectedFeeSummary })

    const payload = await getDashboardData('user-1', 'school-1', 'STUDENT')

    expect(mocks.getFeesData).toHaveBeenCalledWith(
      'user-1',
      'school-1',
      'STUDENT',
      'student-1',
      'year-1'
    )
    expect(payload.fee_summary).toEqual(expectedFeeSummary)
  })

  it('TEST-DS-008 writes redis cache and serves from cache on second call', async () => {
    let cacheValue: string | null = null
    mocks.redisGet.mockImplementation(async () => cacheValue)
    mocks.redisSet.mockImplementation(async (_key: string, value: string) => {
      cacheValue = value
    })

    const firstPayload = await getDashboardData('user-1', 'school-1', 'STUDENT')
    expect(mocks.redisSet).toHaveBeenCalledWith(
      'dashboard:student:student-1',
      expect.any(String),
      300
    )

    mocks.studentFindUnique.mockClear()
    mocks.announcementFindMany.mockClear()

    const secondPayload = await getDashboardData('user-1', 'school-1', 'STUDENT')
    expect(secondPayload.student).toEqual(firstPayload.student)
    expect(secondPayload.attendance_summary).toEqual(firstPayload.attendance_summary)
    expect(secondPayload.fee_summary).toEqual(firstPayload.fee_summary)
    expect(secondPayload.announcements[0]?.id).toBe(firstPayload.announcements[0]?.id)
    expect(typeof secondPayload.announcements[0]?.published_at).toBe('string')
    expect(mocks.studentFindUnique).not.toHaveBeenCalled()
    expect(mocks.announcementFindMany).not.toHaveBeenCalled()
  })

  it('TEST-DS-009 falls back to DB when redis read/write fails', async () => {
    mocks.redisGet.mockRejectedValueOnce(new Error('redis read failure'))
    mocks.redisSet.mockRejectedValueOnce(new Error('redis write failure'))

    const payload = await getDashboardData('user-1', 'school-1', 'STUDENT')

    expect(payload.student.id).toBe('student-1')
    expect(payload.announcements).toHaveLength(1)
    expect(warnSpy).toHaveBeenCalled()
  })
})
