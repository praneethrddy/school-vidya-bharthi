import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  hasPermission: vi.fn(),
  createAuditLog: vi.fn(),
  examFindMany: vi.fn(),
  examCount: vi.fn(),
  examFindFirst: vi.fn(),
  examCreate: vi.fn(),
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
      findMany: mocks.examFindMany,
      count: mocks.examCount,
      findFirst: mocks.examFindFirst,
    },
    $transaction: mocks.transaction,
  },
}))

import { GET, POST } from '../route'

describe('/api/admin/exams', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mocks.auth.mockResolvedValue({
      user: { id: 'user-1', role: 'PRINCIPAL', schoolId: 'school-1' },
    })

    mocks.hasPermission.mockResolvedValue(true)

    mocks.examFindMany.mockResolvedValue([
      {
        id: 'exam-1',
        name: 'Unit Test 1',
        start_date: new Date('2026-06-10'),
        end_date: new Date('2026-06-11'),
        class: { name: '10', section: 'A' },
        term: { name: 'Term 1' },
        _count: { exam_subjects: 2, grades: 25 },
      },
    ])
    mocks.examCount.mockResolvedValue(1)
    mocks.examFindFirst.mockResolvedValue(null)
    mocks.examCreate.mockResolvedValue({
      id: 'exam-created-1',
      school_id: 'school-1',
      name: 'Mid Term',
      exam_subjects: [
        { id: 'es-1', subject_id: '33333333-3333-4333-8333-333333333333', max_marks: 100, passing_marks: 35 },
      ],
    })
    mocks.transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({
        exam: {
          create: mocks.examCreate,
        },
      })
    )
  })

  it('TEST-GRD-001: lists exams with metadata and school scoping', async () => {
    const response = await GET(
      new NextRequest(
        'http://localhost/api/admin/exams?class_id=11111111-1111-4111-8111-111111111111&term_id=22222222-2222-4222-8222-222222222222&page=1&limit=10'
      )
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({
              id: expect.any(String),
              name: expect.any(String),
              class_name: expect.any(String),
              term_name: expect.any(String),
              subjects_count: expect.any(Number),
              grades_entered_count: expect.any(Number),
            }),
          ]),
          meta: expect.objectContaining({
            page: 1,
            limit: 10,
            total: expect.any(Number),
            total_pages: expect.any(Number),
          }),
        }),
      })
    )

    expect(mocks.examFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          school_id: 'school-1',
          class_id: '11111111-1111-4111-8111-111111111111',
          term_id: '22222222-2222-4222-8222-222222222222',
        }),
      })
    )
  })

  it('GET returns 401 when session is missing', async () => {
    mocks.auth.mockResolvedValue(null)

    const response = await GET(new NextRequest('http://localhost/api/admin/exams'))
    const payload = await response.json()

    expect(response.status).toBe(401)
    expect(payload).toEqual(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'UNAUTHORIZED',
          message: expect.any(String),
        }),
      })
    )
  })

  it('TEST-GRD-002 + TEST-GRD-010: creates exam and writes audit log', async () => {
    const response = await POST(
      new NextRequest('http://localhost/api/admin/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Mid Term',
          class_id: '11111111-1111-4111-8111-111111111111',
          term_id: '22222222-2222-4222-8222-222222222222',
          academic_year_id: '99999999-9999-4999-8999-999999999999',
          start_date: '2026-07-10',
          end_date: '2026-07-20',
          subjects: [
            {
              subject_id: '33333333-3333-4333-8333-333333333333',
              max_marks: 100,
              passing_marks: 35,
              exam_date: '2026-07-11',
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
          id: 'exam-created-1',
          name: 'Mid Term',
          exam_subjects: expect.any(Array),
        }),
      })
    )
    expect(mocks.createAuditLog).toHaveBeenCalledTimes(1)
    expect(mocks.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        school_id: 'school-1',
        user_id: 'user-1',
        action: 'CREATE',
        entity_type: 'EXAM',
        entity_id: 'exam-created-1',
      })
    )
  })

  it('POST returns 400 for invalid payload shape', async () => {
    const response = await POST(
      new NextRequest('http://localhost/api/admin/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: '',
          class_id: 'not-a-uuid',
          term_id: 'bad',
          academic_year_id: 'bad',
          subjects: [],
        }),
      })
    )
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload).toEqual(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'VALIDATION_ERROR',
          message: expect.any(String),
        }),
      })
    )
    expect(mocks.createAuditLog).not.toHaveBeenCalled()
  })
})
