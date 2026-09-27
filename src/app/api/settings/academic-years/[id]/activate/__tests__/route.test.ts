import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

const mocks = vi.hoisted(() => ({
  requireSchoolPermission: vi.fn(),
  getRequestMetadata: vi.fn(),
  academicYearFindFirst: vi.fn(),
  classCount: vi.fn(),
  academicYearUpdateMany: vi.fn(),
  academicYearUpdate: vi.fn(),
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
      findFirst: mocks.academicYearFindFirst,
      updateMany: mocks.academicYearUpdateMany,
      update: mocks.academicYearUpdate,
    },
    class: {
      count: mocks.classCount,
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

import { POST } from '../route'

const yearId = '11111111-1111-1111-1111-111111111111'

describe('/api/settings/academic-years/[id]/activate', () => {
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

    mocks.academicYearFindFirst
      .mockResolvedValueOnce({
        id: yearId,
        name: '2027-2028',
        start_date: new Date('2027-06-01T00:00:00.000Z'),
        end_date: new Date('2028-03-31T00:00:00.000Z'),
        is_current: false,
      })
      .mockResolvedValueOnce({
        id: '22222222-2222-2222-2222-222222222222',
        name: '2026-2027',
      })
    mocks.classCount.mockResolvedValue(2)

    mocks.transaction.mockImplementation(async (callback: any) =>
      callback({
        academicYear: {
          updateMany: mocks.academicYearUpdateMany,
          update: mocks.academicYearUpdate,
        },
      })
    )
    mocks.academicYearUpdateMany.mockResolvedValue({ count: 1 })
    mocks.academicYearUpdate.mockResolvedValue({ id: yearId })
  })

  it('TEST-SET-003: activates year and keeps single current year', async () => {
    const request = new NextRequest(`http://localhost/api/settings/academic-years/${yearId}/activate`, {
      method: 'POST',
    })

    const response = await POST(request, { params: Promise.resolve({ id: yearId }) })
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.success).toBe(true)
    expect(payload.data.activated_academic_year).toEqual(
      expect.objectContaining({
        id: yearId,
        is_current: true,
      })
    )
    expect(mocks.academicYearUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { school_id: 'school-1', is_current: true },
      })
    )
    expect(mocks.createAuditLog).toHaveBeenCalledTimes(1)
  })

  it('returns 404 when target year does not exist', async () => {
    mocks.academicYearFindFirst.mockReset()
    mocks.academicYearFindFirst.mockResolvedValueOnce(null)

    const request = new NextRequest(`http://localhost/api/settings/academic-years/${yearId}/activate`, {
      method: 'POST',
    })

    const response = await POST(request, { params: Promise.resolve({ id: yearId }) })
    const payload = await response.json()

    expect(response.status).toBe(404)
    expect(payload.success).toBe(false)
    expect(payload.error.code).toBe('NOT_FOUND')
  })

  it('returns 409 when year has no classes', async () => {
    mocks.classCount.mockResolvedValueOnce(0)

    const request = new NextRequest(`http://localhost/api/settings/academic-years/${yearId}/activate`, {
      method: 'POST',
    })

    const response = await POST(request, { params: Promise.resolve({ id: yearId }) })
    const payload = await response.json()

    expect(response.status).toBe(409)
    expect(payload.success).toBe(false)
    expect(payload.error.code).toBe('NO_CLASSES')
    expect(mocks.transaction).not.toHaveBeenCalled()
  })

  it('returns 401 when session is missing', async () => {
    mocks.requireSchoolPermission.mockResolvedValueOnce({
      error: NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'No valid session' } },
        { status: 401 }
      ),
      user: null,
    })

    const request = new NextRequest(`http://localhost/api/settings/academic-years/${yearId}/activate`, {
      method: 'POST',
    })

    const response = await POST(request, { params: Promise.resolve({ id: yearId }) })
    const payload = await response.json()

    expect(response.status).toBe(401)
    expect(payload.success).toBe(false)
    expect(payload.error.code).toBe('UNAUTHORIZED')
  })
})
