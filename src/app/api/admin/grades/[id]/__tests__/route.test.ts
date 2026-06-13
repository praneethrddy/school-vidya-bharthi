import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  hasPermission: vi.fn(),
  createAuditLog: vi.fn(),
  computeGrade: vi.fn(),
  gradeFindUnique: vi.fn(),
  schoolSettingFindFirst: vi.fn(),
  staffFindFirst: vi.fn(),
  gradeUpdate: vi.fn(),
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
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    grade: {
      findUnique: mocks.gradeFindUnique,
      update: mocks.gradeUpdate,
    },
    schoolSetting: { findFirst: mocks.schoolSettingFindFirst },
    staff: { findFirst: mocks.staffFindFirst },
  },
}))

import { PATCH } from '../route'

describe('/api/admin/grades/[id] PATCH', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mocks.auth.mockResolvedValue({
      user: { id: 'editor-1', role: 'TEACHER', schoolId: 'school-1' },
    })
    mocks.hasPermission.mockResolvedValue(true)
    mocks.computeGrade.mockReturnValue('A')
    mocks.schoolSettingFindFirst.mockResolvedValue({ setting_value: 'PERCENTAGE' })
    mocks.staffFindFirst.mockResolvedValue({ id: 'staff-1' })
    mocks.gradeFindUnique.mockResolvedValue({
      id: 'grade-1',
      school_id: 'school-1',
      subject_id: 'subject-1',
      entered_by: 'staff-old',
      marks_obtained: { toNumber: () => 75 },
      exam: {
        exam_subjects: [{ subject_id: 'subject-1', max_marks: 100 }],
      },
    })
    mocks.gradeUpdate.mockResolvedValue({
      id: 'grade-1',
      marks_obtained: 88,
      grade: 'A',
      remarks: 'Nice work',
    })
  })

  it('returns 401 when session is missing', async () => {
    mocks.auth.mockResolvedValue(null)

    const response = await PATCH(new NextRequest('http://localhost/api/admin/grades/grade-1'), {
      params: Promise.resolve({ id: 'grade-1' }),
    })
    const payload = await response.json()

    expect(response.status).toBe(401)
    expect(payload.error.code).toBe('UNAUTHORIZED')
  })

  it('TEST-GRD-007 + TEST-GRD-010: updates a single grade and writes audit log', async () => {
    const response = await PATCH(
      new NextRequest('http://localhost/api/admin/grades/grade-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          marks_obtained: 88,
          remarks: 'Nice work',
        }),
      }),
      { params: Promise.resolve({ id: 'grade-1' }) }
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          id: 'grade-1',
          marks_obtained: 88,
          grade: 'A',
        }),
      })
    )
    expect(mocks.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        school_id: 'school-1',
        user_id: 'editor-1',
        action: 'UPDATE',
        entity_type: 'GRADE',
        entity_id: 'grade-1',
      })
    )
  })
})
