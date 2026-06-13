import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  studentFindFirst: vi.fn(),
  parentFindFirst: vi.fn(),
  studentParentFindFirst: vi.fn(),
  schoolFindUnique: vi.fn(),
  studentFindUnique: vi.fn(),
  schoolSettingFindFirst: vi.fn(),
  examFindFirst: vi.fn(),
  gradeFindMany: vi.fn(),
  calculateGrade: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  auth: mocks.auth,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    student: {
      findFirst: mocks.studentFindFirst,
      findUnique: mocks.studentFindUnique,
    },
    parent: { findFirst: mocks.parentFindFirst },
    studentParent: { findFirst: mocks.studentParentFindFirst },
    school: { findUnique: mocks.schoolFindUnique },
    schoolSetting: { findFirst: mocks.schoolSettingFindFirst },
    exam: { findFirst: mocks.examFindFirst },
    grade: { findMany: mocks.gradeFindMany },
  },
}))

vi.mock('@/lib/grades-utils', () => ({
  calculateGrade: mocks.calculateGrade,
}))

import { GET } from '../route'

describe('/api/grades/report-card GET', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.auth.mockResolvedValue({
      user: { id: 'user-1', role: 'STUDENT', schoolId: 'school-1' },
    })
    mocks.studentFindFirst.mockResolvedValue({ id: 'student-1' })
    mocks.parentFindFirst.mockResolvedValue({ id: 'parent-1' })
    mocks.studentParentFindFirst.mockResolvedValue({ student_id: 'student-1' })
    mocks.schoolFindUnique.mockResolvedValue({ id: 'school-1', name: 'Vidhya Bharthi' })
    mocks.studentFindUnique.mockResolvedValue({
      id: 'student-1',
      first_name: 'Asha',
      last_name: 'Rao',
      roll_number: '15',
      class: { name: '10', section: 'A' },
    })
    mocks.schoolSettingFindFirst.mockResolvedValue({ setting_value: 'PERCENTAGE' })
    mocks.examFindFirst.mockResolvedValue({
      id: 'exam-1',
      name: 'Unit Test 1',
      term: { name: 'Term 1' },
      exam_subjects: [
        {
          subject_id: 'subject-1',
          max_marks: 100,
          passing_marks: 35,
          subject: { name: 'Math', code: 'MTH' },
        },
      ],
    })
    mocks.gradeFindMany.mockResolvedValue([
      { subject_id: 'subject-1', marks_obtained: 91, grade: 'A+', remarks: 'Excellent' },
    ])
    mocks.calculateGrade.mockReturnValue('A+')
  })

  it('returns 400 when exam_id is missing', async () => {
    const request = new NextRequest('http://localhost/api/grades/report-card')
    const response = await GET(request)
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload).toEqual({ error: 'exam_id is required' })
  })

  it('returns report card payload structure for a valid exam', async () => {
    const request = new NextRequest('http://localhost/api/grades/report-card?exam_id=exam-1')
    const response = await GET(request)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual(
      expect.objectContaining({
        reportCardData: expect.objectContaining({
          schoolName: expect.any(String),
          studentName: expect.any(String),
          className: expect.any(String),
          rollNumber: expect.any(String),
          examName: 'Unit Test 1',
          termName: 'Term 1',
          subjects: expect.any(Array),
          total_obtained: expect.any(Number),
          total_max: expect.any(Number),
          percentage: expect.any(Number),
          overall_grade: expect.any(String),
          grading_scheme: expect.any(String),
        }),
      })
    )
  })

  it('returns 403 for parent requesting an unlinked child report card', async () => {
    mocks.auth.mockResolvedValue({
      user: { id: 'parent-user', role: 'PARENT', schoolId: 'school-1' },
    })
    mocks.studentParentFindFirst.mockResolvedValue(null)

    const request = new NextRequest(
      'http://localhost/api/grades/report-card?exam_id=exam-1&student_id=student-other'
    )
    const response = await GET(request)
    const payload = await response.json()

    expect(response.status).toBe(403)
    expect(payload).toEqual({ error: 'Unauthorized to view this student' })
  })
})

