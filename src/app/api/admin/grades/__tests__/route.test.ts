import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  hasPermission: vi.fn(),
  createAuditLog: vi.fn(),
  computeGrade: vi.fn(),
  isPass: vi.fn(),
  examFindUnique: vi.fn(),
  staffFindFirst: vi.fn(),
  subjectAssignmentFindFirst: vi.fn(),
  studentFindMany: vi.fn(),
  gradeFindMany: vi.fn(),
  schoolSettingFindFirst: vi.fn(),
  gradeFindUnique: vi.fn(),
  gradeUpdate: vi.fn(),
  gradeCreate: vi.fn(),
  gradeDelete: vi.fn(),
  transaction: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  auth: mocks.auth,
}))

vi.mock('@/lib/permissions', () => ({
  hasPermission: mocks.hasPermission,
}))

vi.mock('@/lib/audit', () => ({
  createAuditLog: mocks.createAuditLog,
}))

vi.mock('@/lib/grading', () => ({
  computeGrade: mocks.computeGrade,
  isPass: mocks.isPass,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    exam: { findUnique: mocks.examFindUnique },
    staff: { findFirst: mocks.staffFindFirst },
    subjectAssignment: { findFirst: mocks.subjectAssignmentFindFirst },
    student: { findMany: mocks.studentFindMany },
    grade: {
      findMany: mocks.gradeFindMany,
      findUnique: mocks.gradeFindUnique,
      update: mocks.gradeUpdate,
      create: mocks.gradeCreate,
      delete: mocks.gradeDelete,
    },
    schoolSetting: { findFirst: mocks.schoolSettingFindFirst },
    $transaction: mocks.transaction,
  },
}))

import { GET, POST } from '../route'

describe('/api/admin/grades', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mocks.auth.mockResolvedValue({
      user: { id: 'teacher-user', role: 'TEACHER', schoolId: 'school-1' },
    })

    mocks.hasPermission.mockImplementation(async (_schoolId: string, _role: string, permission: string) => {
      if (permission === 'GRADES.view_all') return false
      if (permission === 'GRADES.view_own_subject') return true
      if (permission === 'GRADES.enter') return true
      return true
    })

    mocks.computeGrade.mockImplementation((marks: number) => (marks >= 80 ? 'A' : 'B'))
    mocks.isPass.mockImplementation((marks: number, passingMarks: number) => marks >= passingMarks)

    mocks.examFindUnique.mockResolvedValue({
      id: 'exam-1',
      name: 'Unit Test',
      class_id: 'class-1',
      class: { id: 'class-1', name: '10', section: 'A' },
      term: { name: 'Term 1' },
      exam_subjects: [
        {
          id: 'es-1',
          subject_id: 'subject-1',
          max_marks: 100,
          passing_marks: 35,
          subject: { id: 'subject-1', name: 'Math' },
        },
      ],
    })
    mocks.staffFindFirst.mockResolvedValue({ id: 'staff-1' })
    mocks.subjectAssignmentFindFirst.mockResolvedValue({ id: 'assign-1' })
    mocks.studentFindMany.mockResolvedValue([
      { id: 'student-1', first_name: 'Asha', last_name: 'Rao', roll_number: '01' },
      { id: 'student-2', first_name: 'Bala', last_name: 'Das', roll_number: '02' },
    ])
    mocks.gradeFindMany.mockResolvedValue([
      {
        id: 'grade-1',
        student_id: 'student-1',
        marks_obtained: { toNumber: () => 81 },
        grade: 'A',
        remarks: 'Great',
        enterer: { first_name: 'Tej', last_name: 'Sir' },
      },
    ])
    mocks.schoolSettingFindFirst.mockResolvedValue({ setting_value: 'PERCENTAGE' })

    mocks.transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({
        grade: {
          findUnique: mocks.gradeFindUnique,
          update: mocks.gradeUpdate,
          create: mocks.gradeCreate,
          delete: mocks.gradeDelete,
        },
      })
    )
  })

  it('GET returns 401 when session is missing', async () => {
    mocks.auth.mockResolvedValue(null)

    const response = await GET(new NextRequest('http://localhost/api/admin/grades?exam_id=exam-1&subject_id=subject-1'))
    const payload = await response.json()

    expect(response.status).toBe(401)
    expect(payload.error.code).toBe('UNAUTHORIZED')
  })

  it('TEST-GRD-005: returns grades with summary shape', async () => {
    const response = await GET(new NextRequest('http://localhost/api/admin/grades?exam_id=exam-1&subject_id=subject-1'))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          exam: expect.objectContaining({
            id: 'exam-1',
            name: expect.any(String),
            class_name: expect.any(String),
            term_name: expect.any(String),
          }),
          subject: expect.objectContaining({
            id: 'subject-1',
            name: 'Math',
            max_marks: 100,
            passing_marks: 35,
          }),
          grades: expect.arrayContaining([
            expect.objectContaining({
              student_id: expect.any(String),
              student_name: expect.any(String),
              marks_obtained: expect.any(Number),
              grade: expect.any(String),
            }),
          ]),
          summary: expect.objectContaining({
            total_students: expect.any(Number),
            entered: expect.any(Number),
            pending: expect.any(Number),
            pass_count: expect.any(Number),
            fail_count: expect.any(Number),
          }),
        }),
      })
    )
  })

  it('TEST-GRD-006 + TEST-GRD-010: bulk saves grades and writes audit logs per change', async () => {
    mocks.gradeFindUnique
      .mockResolvedValueOnce({
        id: 'grade-existing-update',
        school_id: 'school-1',
        student_id: 'student-1',
        exam_id: 'exam-1',
        subject_id: 'subject-1',
        marks_obtained: 70,
      })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'grade-existing-delete',
        school_id: 'school-1',
        student_id: 'student-3',
        exam_id: 'exam-1',
        subject_id: 'subject-1',
        marks_obtained: 66,
      })

    mocks.gradeUpdate.mockResolvedValue({ id: 'grade-existing-update' })
    mocks.gradeCreate.mockResolvedValue({ id: 'grade-created' })
    mocks.gradeDelete.mockResolvedValue({ id: 'grade-existing-delete' })

    const response = await POST(
      new NextRequest('http://localhost/api/admin/grades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exam_id: '11111111-1111-4111-8111-111111111111',
          subject_id: '22222222-2222-4222-8222-222222222222',
          grades: [
            {
              student_id: '33333333-3333-4333-8333-333333333333',
              marks_obtained: 80,
              remarks: 'Improved',
            },
            {
              student_id: '44444444-4444-4444-8444-444444444444',
              marks_obtained: 60,
              remarks: null,
            },
            {
              student_id: '55555555-5555-4555-8555-555555555555',
              marks_obtained: null,
              remarks: null,
            },
          ],
        }),
      })
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          message: expect.any(String),
        }),
      })
    )
    expect(mocks.createAuditLog).toHaveBeenCalledTimes(3)
    expect(mocks.createAuditLog).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        action: 'UPDATE',
        entity_type: 'GRADE',
      })
    )
    expect(mocks.createAuditLog).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        action: 'CREATE',
        entity_type: 'GRADE',
      })
    )
    expect(mocks.createAuditLog).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        action: 'DELETE',
        entity_type: 'GRADE',
      })
    )
  })
})
