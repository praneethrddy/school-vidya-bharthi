import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

const mocks = vi.hoisted(() => ({
  requireSchoolPermission: vi.fn(),
  getRequestMetadata: vi.fn(),
  academicYearFindMany: vi.fn(),
  academicYearCreate: vi.fn(),
  termCreateMany: vi.fn(),
  termFindMany: vi.fn(),
  transaction: vi.fn(),
  createAuditLog: vi.fn(),
}))

vi.mock('@/lib/settings-auth', () => ({
  requireSchoolPermission: mocks.requireSchoolPermission,
  getRequestMetadata: mocks.getRequestMetadata,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    academicYear: {
      findMany: mocks.academicYearFindMany,
      create: mocks.academicYearCreate,
    },
    term: {
      createMany: mocks.termCreateMany,
      findMany: mocks.termFindMany,
    },
    $transaction: mocks.transaction,
  },
}))

vi.mock('@/lib/audit', () => ({
  createAuditLog: mocks.createAuditLog,
}))

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

import { GET, POST } from '../route'

describe('/api/settings/academic-years', () => {
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

    mocks.academicYearFindMany.mockResolvedValue([
      {
        id: 'year-1',
        name: '2026-2027',
        start_date: new Date('2026-06-01T00:00:00.000Z'),
        end_date: new Date('2027-03-31T00:00:00.000Z'),
        is_current: true,
        terms: [
          {
            id: 'term-1',
            name: 'Term 1',
            start_date: new Date('2026-06-01T00:00:00.000Z'),
            end_date: new Date('2026-08-31T00:00:00.000Z'),
          },
        ],
        _count: { classes: 4 },
      },
    ])
    mocks.academicYearCreate.mockResolvedValue({
      id: 'year-2',
      school_id: 'school-1',
      name: '2027-2028',
      start_date: new Date('2027-06-01T00:00:00.000Z'),
      end_date: new Date('2028-03-31T00:00:00.000Z'),
      is_current: false,
    })
    mocks.termCreateMany.mockResolvedValue({ count: 3 })
    mocks.termFindMany.mockResolvedValue([
      {
        id: 'term-2',
        name: 'Term 1',
        start_date: new Date('2027-06-01T00:00:00.000Z'),
        end_date: new Date('2027-08-31T00:00:00.000Z'),
      },
    ])

    mocks.transaction.mockImplementation(async (callback: any) =>
      callback({
        academicYear: {
          create: mocks.academicYearCreate,
        },
        term: {
          createMany: mocks.termCreateMany,
          findMany: mocks.termFindMany,
        },
      })
    )
  })

  it('TEST-SET-001: GET lists academic years with terms and class counts', async () => {
    const response = await GET()
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          academic_years: expect.arrayContaining([
            expect.objectContaining({
              id: 'year-1',
              classes_count: 4,
              terms: expect.arrayContaining([
                expect.objectContaining({
                  id: 'term-1',
                  start_date: '2026-06-01',
                }),
              ]),
            }),
          ]),
        }),
      })
    )
  })

  it('returns access error when session is missing', async () => {
    mocks.requireSchoolPermission.mockResolvedValueOnce({
      error: NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'No valid session' } },
        { status: 401 }
      ),
      user: null,
    })

    const response = await GET()
    const payload = await response.json()

    expect(response.status).toBe(401)
    expect(payload.success).toBe(false)
    expect(payload.error.code).toBe('UNAUTHORIZED')
  })

  it('TEST-SET-002: POST creates academic year and audit log', async () => {
    mocks.academicYearFindMany.mockResolvedValueOnce([])

    const request = new NextRequest('http://localhost/api/settings/academic-years', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: '2027-2028',
        start_date: '2027-06-01',
        end_date: '2028-03-31',
      }),
    })

    const response = await POST(request)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.success).toBe(true)
    expect(payload.data.academic_year).toEqual(
      expect.objectContaining({
        id: 'year-2',
        start_date: '2027-06-01',
      })
    )
    expect(mocks.termCreateMany).toHaveBeenCalledTimes(1)
    expect(mocks.createAuditLog).toHaveBeenCalledTimes(1)
  })

  it('rejects overlapping academic year ranges', async () => {
    mocks.academicYearFindMany.mockResolvedValueOnce([
      {
        id: 'year-existing',
        name: '2026-2027',
        start_date: new Date('2026-06-01T00:00:00.000Z'),
        end_date: new Date('2027-03-31T00:00:00.000Z'),
        is_current: true,
      },
    ])

    const request = new NextRequest('http://localhost/api/settings/academic-years', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: '2026-2028',
        start_date: '2026-09-01',
        end_date: '2027-12-31',
      }),
    })

    const response = await POST(request)
    const payload = await response.json()

    expect(response.status).toBe(409)
    expect(payload.success).toBe(false)
    expect(payload.error.code).toBe('DATE_RANGE_OVERLAP')
    expect(mocks.transaction).not.toHaveBeenCalled()
  })
})
