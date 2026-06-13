import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  studentFindFirst: vi.fn(),
  parentFindFirst: vi.fn(),
  studentParentFindFirst: vi.fn(),
  schoolSettingFindFirst: vi.fn(),
  examFindMany: vi.fn(),
  gradeFindMany: vi.fn(),
  calculateGrade: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  auth: mocks.auth,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    student: { findFirst: mocks.studentFindFirst },
    parent: { findFirst: mocks.parentFindFirst },
    studentParent: { findFirst: mocks.studentParentFindFirst },
    schoolSetting: { findFirst: mocks.schoolSettingFindFirst },
    exam: { findMany: mocks.examFindMany },
    grade: { findMany: mocks.gradeFindMany },
  },
}))

vi.mock('@/lib/grades-utils', () => ({
  calculateGrade: mocks.calculateGrade,
}))

import { GET } from '../route'

describe('/api/grades GET', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.auth.mockResolvedValue({
      user: { id: 'user-1', role: 'STUDENT', schoolId: 'school-1' },
    })
    mocks.studentFindFirst.mockResolvedValue({ id: 'student-1' })
    mocks.parentFindFirst.mockResolvedValue({ id: 'parent-1' })
    mocks.studentParentFindFirst.mockResolvedValue({ student_id: 'student-1' })
    mocks.schoolSettingFindFirst.mockResolvedValue({ setting_value: 'PERCENTAGE' })
    mocks.examFindMany.mockResolvedValue([
      {
        id: 'exam-1',
        name: 'Unit Test 1',
        term: { name: 'Term 1' },
        start_date: new Date('2026-07-10'),
        end_date: new Date('2026-07-12'),
        exam_subjects: [
          {
            subject_id: 'subject-1',
            max_marks: 100,
            passing_marks: 35,
            subject: { name: 'Math', code: 'MTH' },
          },
        ],
      },
    ])
    mocks.gradeFindMany.mockResolvedValue([
      {
        exam_id: 'exam-1',
        subject_id: 'subject-1',
        marks_obtained: 87,
        grade: 'A',
        remarks: 'Strong work',
      },
    ])
    mocks.calculateGrade.mockReturnValue('A')
  })

  it('returns 401 when session is missing', async () => {
    mocks.auth.mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/grades')
    const response = await GET(request)
    const payload = await response.json()

    expect(response.status).toBe(401)
    expect(payload).toEqual({ error: 'Unauthorized' })
  })

  it('returns grades grouped by exam with response shape assertions', async () => {
    const request = new NextRequest('http://localhost/api/grades')
    const response = await GET(request)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual(
      expect.objectContaining({
        exams: expect.arrayContaining([
          expect.objectContaining({
            id: 'exam-1',
            name: 'Unit Test 1',
            term: 'Term 1',
            subjects: expect.arrayContaining([
              expect.objectContaining({
                subject_name: 'Math',
                marks_obtained: 87,
                is_passed: true,
              }),
            ]),
            percentage: expect.any(Number),
            overall_grade: expect.any(String),
            grading_scheme: expect.any(String),
          }),
        ]),
      })
    )
    expect(mocks.examFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ school_id: 'school-1' }),
      })
    )
  })

  it('returns 403 when parent requests an unlinked student', async () => {
    mocks.auth.mockResolvedValue({
      user: { id: 'parent-user', role: 'PARENT', schoolId: 'school-1' },
    })
    mocks.studentParentFindFirst.mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/grades?student_id=student-other')
    const response = await GET(request)
    const payload = await response.json()

    expect(response.status).toBe(403)
    expect(payload).toEqual({ error: 'Unauthorized to view this student' })
  })
})

