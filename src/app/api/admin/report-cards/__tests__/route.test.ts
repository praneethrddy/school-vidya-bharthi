import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  hasPermission: vi.fn(),
  studentFindMany: vi.fn(),
  gradeFindMany: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  auth: mocks.auth,
}))

vi.mock('@/lib/permissions', () => ({
  hasPermission: mocks.hasPermission,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    student: { findMany: mocks.studentFindMany },
    grade: { findMany: mocks.gradeFindMany },
  },
}))

vi.mock('@react-pdf/renderer', () => ({
  renderToStream: vi.fn(),
}))

vi.mock('@/components/admin/report-card-template', () => ({
  ReportCardDocument: vi.fn(),
}))

import { GET } from '../route'

describe('/api/admin/report-cards GET', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mocks.auth.mockResolvedValue({
      user: { id: 'principal-1', role: 'PRINCIPAL', schoolId: 'school-1' },
    })
    mocks.hasPermission.mockResolvedValue(true)
    mocks.studentFindMany.mockResolvedValue([
      { id: 'student-1', first_name: 'Asha', last_name: 'Rao', roll_number: '01' },
      { id: 'student-2', first_name: 'Bala', last_name: 'Das', roll_number: '02' },
    ])
    mocks.gradeFindMany.mockResolvedValue([{ student_id: 'student-1' }])
  })

  it('returns 401 when session is missing', async () => {
    mocks.auth.mockResolvedValue(null)

    const response = await GET(new NextRequest('http://localhost/api/admin/report-cards?class_id=class-1&term_id=term-1'))
    const payload = await response.json()

    expect(response.status).toBe(401)
    expect(payload.error.code).toBe('UNAUTHORIZED')
  })

  it('TEST-GRD-008: lists report-card availability by class+term with expected shape', async () => {
    const response = await GET(
      new NextRequest('http://localhost/api/admin/report-cards?class_id=class-1&term_id=term-1')
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual(
      expect.objectContaining({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({
            student_id: expect.any(String),
            student_name: expect.any(String),
            roll_number: expect.any(String),
            has_grades: expect.any(Boolean),
            download_url: expect.anything(),
          }),
        ]),
      })
    )

    expect(mocks.studentFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          school_id: 'school-1',
          class_id: 'class-1',
        }),
      })
    )
  })
})
