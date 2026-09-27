import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  hasPermission: vi.fn(),
  createAuditLog: vi.fn(),
  examFindUnique: vi.fn(),
  examUpdate: vi.fn(),
  examDelete: vi.fn(),
  gradeDeleteMany: vi.fn(),
  examSubjectDeleteMany: vi.fn(),
  examSubjectUpdate: vi.fn(),
  examSubjectCreate: vi.fn(),
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

vi.mock('@/lib/prisma', () => ({
  prisma: {
    exam: {
      findUnique: mocks.examFindUnique,
      update: mocks.examUpdate,
      delete: mocks.examDelete,
    },
    grade: {
      deleteMany: mocks.gradeDeleteMany,
    },
    examSubject: {
      deleteMany: mocks.examSubjectDeleteMany,
      update: mocks.examSubjectUpdate,
      create: mocks.examSubjectCreate,
    },
    $transaction: mocks.transaction,
  },
}))

import { DELETE, GET, PATCH } from '../route'

describe('/api/admin/exams/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mocks.auth.mockResolvedValue({
      user: { id: 'user-1', role: 'PRINCIPAL', schoolId: 'school-1' },
    })
    mocks.hasPermission.mockResolvedValue(true)

    mocks.examFindUnique.mockResolvedValue({
      id: 'exam-1',
      school_id: 'school-1',
      name: 'Unit Test',
      exam_subjects: [
        {
          id: 'es-1',
          subject_id: '33333333-3333-4333-8333-333333333333',
          max_marks: 100,
          passing_marks: 35,
        },
      ],
    })
    mocks.examUpdate.mockResolvedValue({
      id: 'exam-1',
      name: 'Updated Unit Test',
      exam_subjects: [],
    })
    mocks.transaction.mockImplementation(async (input: unknown) => {
      if (typeof input === 'function') {
        return input({
          exam: { update: mocks.examUpdate },
          examSubject: {
            deleteMany: mocks.examSubjectDeleteMany,
            update: mocks.examSubjectUpdate,
            create: mocks.examSubjectCreate,
          },
        })
      }

      return input
    })
  })

  it('returns 401 when session is missing', async () => {
    mocks.auth.mockResolvedValue(null)

    const response = await GET(new NextRequest('http://localhost/api/admin/exams/exam-1'), {
      params: Promise.resolve({ id: 'exam-1' }),
    })
    const payload = await response.json()

    expect(response.status).toBe(401)
    expect(payload.error.code).toBe('UNAUTHORIZED')
  })

  it('TEST-GRD-003 + TEST-GRD-010: updates exam and writes audit log', async () => {
    const response = await PATCH(
      new NextRequest('http://localhost/api/admin/exams/exam-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Updated Unit Test',
          subjects: [
            {
              id: '88888888-8888-4888-8888-888888888888',
              subject_id: '33333333-3333-4333-8333-333333333333',
              max_marks: 90,
              passing_marks: 30,
              exam_date: '2026-07-12',
            },
          ],
        }),
      }),
      { params: Promise.resolve({ id: 'exam-1' }) }
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          id: 'exam-1',
          name: 'Updated Unit Test',
        }),
      })
    )
    expect(mocks.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        school_id: 'school-1',
        action: 'UPDATE',
        entity_type: 'EXAM',
        entity_id: 'exam-1',
      })
    )
  })

  it('TEST-GRD-004 + TEST-GRD-010: deletes exam and writes audit log', async () => {
    mocks.examDelete.mockResolvedValue({ id: 'exam-1' })
    mocks.gradeDeleteMany.mockResolvedValue({ count: 10 })
    mocks.examSubjectDeleteMany.mockResolvedValue({ count: 3 })

    const response = await DELETE(
      new NextRequest('http://localhost/api/admin/exams/exam-1', { method: 'DELETE' }),
      { params: Promise.resolve({ id: 'exam-1' }) }
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({ deleted: true }),
      })
    )
    expect(mocks.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        school_id: 'school-1',
        action: 'DELETE',
        entity_type: 'EXAM',
        entity_id: 'exam-1',
      })
    )
  })
})
