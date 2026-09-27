import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  hasPermission: vi.fn(),
  gradeCount: vi.fn(),
  studentFindMany: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  auth: mocks.auth,
}))

vi.mock('@/lib/permissions', () => ({
  hasPermission: mocks.hasPermission,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    grade: { count: mocks.gradeCount },
    student: { findMany: mocks.studentFindMany },
  },
}))

import { POST } from '../route'

describe('/api/admin/report-cards/generate POST', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mocks.auth.mockResolvedValue({
      user: { id: 'principal-1', role: 'PRINCIPAL', schoolId: 'school-1' },
    })
    mocks.hasPermission.mockResolvedValue(true)
    mocks.gradeCount.mockResolvedValue(3)
    mocks.studentFindMany.mockResolvedValue([
      { id: 'student-1' },
      { id: 'student-2' },
    ])
  })

  it('returns 401 when session is missing', async () => {
    mocks.auth.mockResolvedValue(null)

    const response = await POST(
      new NextRequest('http://localhost/api/admin/report-cards/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class_id: '11111111-1111-4111-8111-111111111111',
          term_id: '22222222-2222-4222-8222-222222222222',
        }),
      })
    )
    const payload = await response.json()

    expect(response.status).toBe(401)
    expect(payload.error.code).toBe('UNAUTHORIZED')
  })

  it('TEST-GRD-009: generates bulk report-card urls for a class', async () => {
    const response = await POST(
      new NextRequest('http://localhost/api/admin/report-cards/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class_id: '11111111-1111-4111-8111-111111111111',
          term_id: '22222222-2222-4222-8222-222222222222',
          academic_year_id: '33333333-3333-4333-8333-333333333333',
        }),
      })
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          success: true,
          message: expect.any(String),
          data: expect.objectContaining({
            urls: expect.arrayContaining([
              expect.objectContaining({
                student_id: expect.any(String),
                url: expect.stringContaining('/api/admin/report-cards?download=true'),
              }),
            ]),
          }),
        }),
      })
    )
  })
})
