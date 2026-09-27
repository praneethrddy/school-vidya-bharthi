import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

const mocks = vi.hoisted(() => ({
  requireSchoolPermission: vi.fn(),
  getRequestMetadata: vi.fn(),
  academicYearFindFirst: vi.fn(),
  termFindMany: vi.fn(),
  termFindFirst: vi.fn(),
  termCreate: vi.fn(),
  createAuditLog: vi.fn(),
}))

vi.mock('@/lib/settings-auth', () => ({
  requireSchoolPermission: mocks.requireSchoolPermission,
  getRequestMetadata: mocks.getRequestMetadata,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    academicYear: {
      findFirst: mocks.academicYearFindFirst,
    },
    term: {
      findMany: mocks.termFindMany,
      findFirst: mocks.termFindFirst,
      create: mocks.termCreate,
    },
  },
}))

vi.mock('@/lib/audit', () => ({
  createAuditLog: mocks.createAuditLog,
}))

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

import { GET, POST } from '../route'

const yearId = '11111111-1111-1111-1111-111111111111'

describe('/api/settings/academic-years/[id]/terms', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireSchoolPermission.mockResolvedValue({
      error: null,
      user: {
        id: 'user-1',
        role: 'PRINCIPAL',
        schoolId: 'school-1',
      },
    })
    mocks.getRequestMetadata.mockReturnValue({
      ip_address: '127.0.0.1',
      user_agent: 'vitest',
    })

    mocks.academicYearFindFirst.mockResolvedValue({
      id: yearId,
      name: '2026-2027',
      start_date: new Date('2026-06-01T00:00:00.000Z'),
      end_date: new Date('2027-03-31T00:00:00.000Z'),
    })
    mocks.termFindMany.mockResolvedValue([
      {
        id: 'term-1',
        name: 'Term 1',
        start_date: new Date('2026-06-01T00:00:00.000Z'),
        end_date: new Date('2026-08-31T00:00:00.000Z'),
      },
    ])
    mocks.termFindFirst.mockResolvedValue(null)
    mocks.termCreate.mockResolvedValue({
      id: 'term-2',
      name: 'Term 2',
      start_date: new Date('2026-09-01T00:00:00.000Z'),
      end_date: new Date('2026-12-31T00:00:00.000Z'),
    })
  })

  it('GET lists terms for an academic year', async () => {
    const request = new NextRequest(`http://localhost/api/settings/academic-years/${yearId}/terms`)
    const response = await GET(request, { params: Promise.resolve({ id: yearId }) })
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.success).toBe(true)
    expect(payload.data).toEqual(
      expect.objectContaining({
        academic_year: expect.objectContaining({ id: yearId }),
        terms: expect.arrayContaining([
          expect.objectContaining({ id: 'term-1', start_date: '2026-06-01' }),
        ]),
      })
    )
  })

  it('TEST-SET-004: POST creates term and writes audit log', async () => {
    const request = new NextRequest(`http://localhost/api/settings/academic-years/${yearId}/terms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Term 2',
        start_date: '2026-09-01',
        end_date: '2026-12-31',
      }),
    })

    const response = await POST(request, { params: Promise.resolve({ id: yearId }) })
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.success).toBe(true)
    expect(payload.data.term).toEqual(
      expect.objectContaining({
        id: 'term-2',
        start_date: '2026-09-01',
      })
    )
    expect(mocks.createAuditLog).toHaveBeenCalledTimes(1)
  })

  it('returns 409 for overlapping term ranges', async () => {
    mocks.termFindFirst.mockResolvedValueOnce({
      id: 'term-existing',
      name: 'Term 1',
      start_date: new Date('2026-06-15T00:00:00.000Z'),
      end_date: new Date('2026-09-30T00:00:00.000Z'),
    })

    const request = new NextRequest(`http://localhost/api/settings/academic-years/${yearId}/terms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Term X',
        start_date: '2026-09-01',
        end_date: '2026-12-31',
      }),
    })

    const response = await POST(request, { params: Promise.resolve({ id: yearId }) })
    const payload = await response.json()

    expect(response.status).toBe(409)
    expect(payload.success).toBe(false)
    expect(payload.error.code).toBe('TERM_OVERLAP')
  })

  it('returns 401 when session is missing', async () => {
    mocks.requireSchoolPermission.mockResolvedValueOnce({
      error: NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'No valid session' } },
        { status: 401 }
      ),
      user: null,
    })

    const request = new NextRequest(`http://localhost/api/settings/academic-years/${yearId}/terms`)
    const response = await GET(request, { params: Promise.resolve({ id: yearId }) })
    const payload = await response.json()

    expect(response.status).toBe(401)
    expect(payload.success).toBe(false)
    expect(payload.error.code).toBe('UNAUTHORIZED')
  })
})
