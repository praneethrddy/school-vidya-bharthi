import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  schoolFindFirst: vi.fn(),
  classFindFirst: vi.fn(),
  examFindFirst: vi.fn(),
  examFindMany: vi.fn(),
  termFindFirst: vi.fn(),
  studentFindMany: vi.fn(),
  attendanceFindMany: vi.fn(),
  gradeFindMany: vi.fn(),
  feeStructureFindMany: vi.fn(),
  feePaymentFindMany: vi.fn(),
  feeConcessionFindMany: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    school: {
      findFirst: mocks.schoolFindFirst,
    },
    class: {
      findFirst: mocks.classFindFirst,
    },
    exam: {
      findFirst: mocks.examFindFirst,
      findMany: mocks.examFindMany,
    },
    term: {
      findFirst: mocks.termFindFirst,
    },
    student: {
      findMany: mocks.studentFindMany,
    },
    attendance: {
      findMany: mocks.attendanceFindMany,
    },
    grade: {
      findMany: mocks.gradeFindMany,
    },
    feeStructure: {
      findMany: mocks.feeStructureFindMany,
    },
    feePayment: {
      findMany: mocks.feePaymentFindMany,
    },
    feeConcession: {
      findMany: mocks.feeConcessionFindMany,
    },
  },
}))

import {
  buildAcademicReport,
  buildAttendanceReport,
  buildFinancialReport,
  getSchoolReportContext,
} from '@/lib/reports'

describe('reports library aggregation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('builds student attendance summaries with weighted attendance percentages', async () => {
    mocks.classFindFirst.mockResolvedValue({
      id: 'class-1',
      name: 'Grade 6',
      section: 'A',
    })
    mocks.studentFindMany.mockResolvedValue([
      {
        id: 'student-1',
        first_name: 'Asha',
        last_name: 'Patel',
        roll_number: '1',
      },
      {
        id: 'student-2',
        first_name: 'Rahul',
        last_name: 'Sharma',
        roll_number: '2',
      },
    ])
    mocks.attendanceFindMany.mockResolvedValue([
      { student_id: 'student-1', date: new Date('2025-06-01'), status: 'PRESENT' },
      { student_id: 'student-2', date: new Date('2025-06-01'), status: 'ABSENT' },
      { student_id: 'student-1', date: new Date('2025-06-02'), status: 'LATE' },
      { student_id: 'student-2', date: new Date('2025-06-02'), status: 'HALF_DAY' },
    ])

    const report = await buildAttendanceReport({
      schoolId: 'school-1',
      classId: 'class-1',
      dateFrom: '2025-06-01',
      dateTo: '2025-06-02',
    })

    expect(report.class.name).toBe('Grade 6')
    expect(report.data.student_wise).toEqual([
      expect.objectContaining({
        student_name: 'Asha Patel',
        total_days: 2,
        present: 1,
        late: 1,
        percentage: 100,
      }),
      expect.objectContaining({
        student_name: 'Rahul Sharma',
        total_days: 2,
        absent: 1,
        half_day: 1,
        percentage: 25,
      }),
    ])
    expect(report.data.daily_summary).toEqual([
      expect.objectContaining({ date: '2025-06-01', percentage: 50 }),
      expect.objectContaining({ date: '2025-06-02', percentage: 75 }),
    ])
    expect(report.data.overall.average_attendance).toBe(62.5)
  })

  it('builds academic report summary with subject performance and exam comparisons', async () => {
    mocks.classFindFirst.mockResolvedValue({
      id: 'class-1',
      name: 'Grade 6',
      section: 'A',
    })
    mocks.examFindFirst.mockResolvedValue(null)
    mocks.examFindMany.mockResolvedValue([
      { id: 'exam-1', name: 'Unit Test', term_id: 'term-1' },
      { id: 'exam-2', name: 'Mid Term', term_id: 'term-1' },
    ])
    mocks.termFindFirst.mockResolvedValue({ id: 'term-1', name: 'Term 1' })
    mocks.studentFindMany.mockResolvedValue([
      { id: 'student-1', first_name: 'Asha', last_name: 'Patel', roll_number: '1' },
      { id: 'student-2', first_name: 'Rahul', last_name: 'Sharma', roll_number: '2' },
    ])
    mocks.gradeFindMany.mockResolvedValue([
      {
        student_id: 'student-1',
        exam_id: 'exam-1',
        subject_id: 'sub-math',
        marks_obtained: { toNumber: () => 90 },
        grade: 'A+',
        exam: {
          id: 'exam-1',
          name: 'Unit Test',
          exam_subjects: [
            {
              subject_id: 'sub-math',
              max_marks: 100,
              passing_marks: 35,
              subject: { id: 'sub-math', name: 'Mathematics' },
            },
            {
              subject_id: 'sub-sci',
              max_marks: 100,
              passing_marks: 35,
              subject: { id: 'sub-sci', name: 'Science' },
            },
          ],
        },
      },
      {
        student_id: 'student-2',
        exam_id: 'exam-1',
        subject_id: 'sub-math',
        marks_obtained: { toNumber: () => 30 },
        grade: 'F',
        exam: {
          id: 'exam-1',
          name: 'Unit Test',
          exam_subjects: [
            {
              subject_id: 'sub-math',
              max_marks: 100,
              passing_marks: 35,
              subject: { id: 'sub-math', name: 'Mathematics' },
            },
          ],
        },
      },
      {
        student_id: 'student-1',
        exam_id: 'exam-2',
        subject_id: 'sub-sci',
        marks_obtained: { toNumber: () => 80 },
        grade: 'A',
        exam: {
          id: 'exam-2',
          name: 'Mid Term',
          exam_subjects: [
            {
              subject_id: 'sub-sci',
              max_marks: 100,
              passing_marks: 35,
              subject: { id: 'sub-sci', name: 'Science' },
            },
          ],
        },
      },
      {
        student_id: 'student-2',
        exam_id: 'exam-2',
        subject_id: 'sub-sci',
        marks_obtained: { toNumber: () => 60 },
        grade: 'C',
        exam: {
          id: 'exam-2',
          name: 'Mid Term',
          exam_subjects: [
            {
              subject_id: 'sub-sci',
              max_marks: 100,
              passing_marks: 35,
              subject: { id: 'sub-sci', name: 'Science' },
            },
          ],
        },
      },
    ])

    const report = await buildAcademicReport({
      schoolId: 'school-1',
      classId: 'class-1',
      termId: 'term-1',
    })

    expect(report.report_type).toBe('academic')
    expect(report.term).toEqual({ id: 'term-1', name: 'Term 1' })
    expect(report.data.subject_performance).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ subject_name: 'Mathematics', pass_percentage: 50 }),
        expect.objectContaining({ subject_name: 'Science', pass_percentage: 100 }),
      ])
    )
    expect(report.data.toppers[0]).toEqual(
      expect.objectContaining({
        rank: 1,
        student_name: 'Asha Patel',
        percentage: 85,
      })
    )
    expect(report.data.exam_comparison).toHaveLength(2)
    expect(report.data.summary.overall_pass_percentage).toBe(75)
    expect(report.data.summary.students_evaluated).toBe(2)
  })

  it('builds financial totals, breakdowns, and defaulter counts', async () => {
    mocks.studentFindMany.mockResolvedValue([
      {
        id: 'student-1',
        class_id: 'class-1',
        class: { id: 'class-1', name: 'Grade 6', section: 'A' },
      },
      {
        id: 'student-2',
        class_id: 'class-1',
        class: { id: 'class-1', name: 'Grade 6', section: 'A' },
      },
    ])
    mocks.feeStructureFindMany.mockResolvedValue([
      {
        id: 'structure-1',
        class_id: 'class-1',
        fee_category_id: 'cat-1',
        amount: { toNumber: () => 1000 },
        due_date: new Date('2025-06-15'),
        class: { id: 'class-1', name: 'Grade 6', section: 'A' },
        category: { id: 'cat-1', name: 'Tuition' },
      },
    ])
    mocks.feePaymentFindMany.mockResolvedValue([
      {
        student_id: 'student-1',
        fee_structure_id: 'structure-1',
        amount_paid: { toNumber: () => 600 },
        payment_date: new Date('2025-06-10'),
      },
    ])
    mocks.feeConcessionFindMany.mockResolvedValue([
      {
        student_id: 'student-2',
        fee_structure_id: 'structure-1',
        concession_type: 'FIXED_AMOUNT',
        concession_value: { toNumber: () => 100 },
      },
    ])

    const report = await buildFinancialReport({
      schoolId: 'school-1',
      dateFrom: '2025-06-01',
      dateTo: '2025-06-30',
    })

    expect(report.data.total_expected).toBe(1900)
    expect(report.data.total_collected).toBe(600)
    expect(report.data.total_outstanding).toBe(1300)
    expect(report.data.collection_percentage).toBeCloseTo(31.58, 2)
    expect(report.data.defaulter_count).toBe(2)
    expect(report.data.class_wise_collection[0]).toEqual(
      expect.objectContaining({
        name: 'Grade 6 A',
        expected: 1900,
        collected: 600,
        outstanding: 1300,
      })
    )
  })

  it('returns school name and slug context', async () => {
    mocks.schoolFindFirst.mockResolvedValue({
      id: 'school-1',
      name: 'Vidhya Bharthi High School',
      slug: 'vbhs',
    })

    const context = await getSchoolReportContext('school-1')

    expect(context).toEqual({
      id: 'school-1',
      name: 'Vidhya Bharthi High School',
      slug: 'vbhs',
    })
    expect(mocks.schoolFindFirst).toHaveBeenCalledWith({
      where: { id: 'school-1' },
      select: { id: true, name: true, slug: true },
    })
  })
})
