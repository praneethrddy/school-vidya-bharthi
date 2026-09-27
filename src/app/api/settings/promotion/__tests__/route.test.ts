import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

const mocks = vi.hoisted(() => ({
  requireSchoolPermission: vi.fn(),
  getRequestMetadata: vi.fn(),
  academicYearFindMany: vi.fn(),
  academicYearFindFirst: vi.fn(),
  classFindMany: vi.fn(),
  classFindFirst: vi.fn(),
  studentFindMany: vi.fn(),
  studentUpdate: vi.fn(),
  userUpdate: vi.fn(),
  transaction: vi.fn(),
  createAuditLog: vi.fn(),
  cacheInvalidate: vi.fn(),
}))

vi.mock('@/lib/settings-auth', () => ({
  requireSchoolPermission: mocks.requireSchoolPermission,
  getRequestMetadata: mocks.getRequestMetadata,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    academicYear: {
      findMany: mocks.academicYearFindMany,
      findFirst: mocks.academicYearFindFirst,
    },
    class: {
      findMany: mocks.classFindMany,
      findFirst: mocks.classFindFirst,
    },
    student: {
      findMany: mocks.studentFindMany,
    },
    $transaction: mocks.transaction,
  },
}))

vi.mock('@/lib/audit', () => ({
  createAuditLog: mocks.createAuditLog,
}))

vi.mock('@/lib/cache', () => ({
  cacheInvalidate: mocks.cacheInvalidate,
}))

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

import { GET, POST } from '../route'

const fromYear = '11111111-1111-1111-1111-111111111111'
const toYear = '22222222-2222-2222-2222-222222222222'
const fromClass = '33333333-3333-3333-3333-333333333333'
const toClass = '44444444-4444-4444-4444-444444444444'
const studentId = '55555555-5555-5555-5555-555555555555'
const studentUserId = '66666666-6666-6666-6666-666666666666'

function buildStudent(overrides?: Partial<any>) {
  return {
    id: studentId,
    first_name: 'Test',
    last_name: 'Student',
    class_id: fromClass,
    academic_year_id: fromYear,
    is_active: true,
    user_id: studentUserId,
    class: {
      id: fromClass,
      name: 'Grade 6',
      section: 'A',
    },
    ...overrides,
  }
}

describe('/api/settings/promotion', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mocks.requireSchoolPermission.mockResolvedValue({
      error: null,
      user: {
        id: 'user-1',
        role: 'STUDENT_ADMIN',
        schoolId: 'school-1',
      },
    })
    mocks.getRequestMetadata.mockReturnValue({
      ip_address: '127.0.0.1',
      user_agent: 'vitest',
    })

    mocks.academicYearFindMany.mockResolvedValue([
      { id: fromYear, name: '2026-2027', is_current: true },
      { id: toYear, name: '2027-2028', is_current: false },
    ])
    mocks.classFindMany.mockResolvedValue([
      { id: fromClass, academic_year_id: fromYear, name: 'Grade 6', section: 'A' },
      { id: toClass, academic_year_id: toYear, name: 'Grade 7', section: 'A' },
    ])
    mocks.classFindFirst.mockResolvedValue({
      id: fromClass,
      name: 'Grade 6',
      section: 'A',
    })
    mocks.studentFindMany.mockResolvedValue([buildStudent()])

    mocks.studentUpdate.mockResolvedValue({
      id: studentId,
      class_id: toClass,
      academic_year_id: toYear,
      is_active: true,
      user_id: studentUserId,
    })
    mocks.userUpdate.mockResolvedValue({ id: studentUserId, is_active: false })
    mocks.transaction.mockImplementation(async (callback: any) =>
      callback({
        student: {
          update: mocks.studentUpdate,
        },
        user: {
          update: mocks.userUpdate,
        },
      })
    )
  })

  it('TEST-SET-033: GET without params returns academic years and classes', async () => {
    const request = new NextRequest('http://localhost/api/settings/promotion')
    const response = await GET(request)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.success).toBe(true)
    expect(payload.data.academic_years).toHaveLength(2)
    expect(payload.data.classes).toHaveLength(2)
  })

  it('TEST-SET-034: GET with from params returns students in source class', async () => {
    const request = new NextRequest(
      `http://localhost/api/settings/promotion?from_academic_year_id=${fromYear}&from_class_id=${fromClass}`
    )

    const response = await GET(request)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.success).toBe(true)
    expect(payload.data.source_class).toEqual(expect.objectContaining({ id: fromClass }))
    expect(payload.data.students).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          student_id: studentId,
          promotion_action: null,
          target_class_id: null,
        }),
      ])
    )
  })

  it('TEST-SET-035 and TEST-SET-043: POST executes PROMOTE and writes audit/cache invalidations', async () => {
    mocks.academicYearFindFirst
      .mockResolvedValueOnce({ id: fromYear, name: '2026-2027' })
      .mockResolvedValueOnce({ id: toYear, name: '2027-2028' })

    const request = new NextRequest('http://localhost/api/settings/promotion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from_academic_year_id: fromYear,
        to_academic_year_id: toYear,
        promotions: [{ student_id: studentId, action: 'PROMOTE', target_class_id: toClass }],
      }),
    })

    const response = await POST(request)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.success).toBe(true)
    expect(payload.data.total_updated).toBe(1)
    expect(mocks.createAuditLog).toHaveBeenCalledTimes(1)
    expect(mocks.cacheInvalidate).toHaveBeenCalledTimes(3)
  })

  it('TEST-SET-036: POST RETAIN auto-matches target class by name and section', async () => {
    mocks.classFindMany.mockResolvedValueOnce([
      { id: toClass, name: 'Grade 6', section: 'A' },
    ])
    mocks.academicYearFindFirst
      .mockResolvedValueOnce({ id: fromYear, name: '2026-2027' })
      .mockResolvedValueOnce({ id: toYear, name: '2027-2028' })

    const request = new NextRequest('http://localhost/api/settings/promotion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from_academic_year_id: fromYear,
        to_academic_year_id: toYear,
        promotions: [{ student_id: studentId, action: 'RETAIN' }],
      }),
    })

    const response = await POST(request)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.success).toBe(true)
    expect(payload.data.total_updated).toBe(1)
  })

  it('TEST-SET-037: POST TC deactivates student and linked user', async () => {
    mocks.academicYearFindFirst
      .mockResolvedValueOnce({ id: fromYear, name: '2026-2027' })
      .mockResolvedValueOnce({ id: toYear, name: '2027-2028' })
    mocks.studentUpdate.mockResolvedValueOnce({
      id: studentId,
      class_id: fromClass,
      academic_year_id: fromYear,
      is_active: false,
      user_id: studentUserId,
    })

    const request = new NextRequest('http://localhost/api/settings/promotion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from_academic_year_id: fromYear,
        to_academic_year_id: toYear,
        promotions: [{ student_id: studentId, action: 'TC' }],
      }),
    })

    const response = await POST(request)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.success).toBe(true)
    expect(payload.data.updates[0].is_active).toBe(false)
    expect(mocks.userUpdate).toHaveBeenCalledTimes(1)
  })

  it('TEST-SET-038: same from/to academic year returns 400', async () => {
    const request = new NextRequest('http://localhost/api/settings/promotion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from_academic_year_id: fromYear,
        to_academic_year_id: fromYear,
        promotions: [{ student_id: studentId, action: 'PROMOTE', target_class_id: toClass }],
      }),
    })

    const response = await POST(request)
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.success).toBe(false)
    expect(payload.error.code).toBe('VALIDATION_ERROR')
  })

  it('TEST-SET-039: duplicate student_id in promotions returns 400', async () => {
    const request = new NextRequest('http://localhost/api/settings/promotion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from_academic_year_id: fromYear,
        to_academic_year_id: toYear,
        promotions: [
          { student_id: studentId, action: 'PROMOTE', target_class_id: toClass },
          { student_id: studentId, action: 'RETAIN' },
        ],
      }),
    })

    const response = await POST(request)
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.success).toBe(false)
    expect(payload.error.message).toContain('Duplicate student_id')
  })

  it('TEST-SET-040: student not in source academic year returns 400', async () => {
    mocks.academicYearFindFirst
      .mockResolvedValueOnce({ id: fromYear, name: '2026-2027' })
      .mockResolvedValueOnce({ id: toYear, name: '2027-2028' })
    mocks.studentFindMany.mockResolvedValueOnce([
      buildStudent({ academic_year_id: 'other-year' }),
    ])

    const request = new NextRequest('http://localhost/api/settings/promotion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from_academic_year_id: fromYear,
        to_academic_year_id: toYear,
        promotions: [{ student_id: studentId, action: 'PROMOTE', target_class_id: toClass }],
      }),
    })

    const response = await POST(request)
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.success).toBe(false)
    expect(payload.error.message).toContain('is not in the source academic year')
  })

  it('TEST-SET-041: target class not found returns 400', async () => {
    mocks.academicYearFindFirst
      .mockResolvedValueOnce({ id: fromYear, name: '2026-2027' })
      .mockResolvedValueOnce({ id: toYear, name: '2027-2028' })
    mocks.classFindMany.mockResolvedValueOnce([])

    const request = new NextRequest('http://localhost/api/settings/promotion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from_academic_year_id: fromYear,
        to_academic_year_id: toYear,
        promotions: [{ student_id: studentId, action: 'PROMOTE', target_class_id: toClass }],
      }),
    })

    const response = await POST(request)
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.success).toBe(false)
    expect(payload.error.code).toBe('INVALID_TARGET_CLASS')
  })

  it('TEST-SET-042: already promoted student is skipped', async () => {
    mocks.academicYearFindFirst
      .mockResolvedValueOnce({ id: fromYear, name: '2026-2027' })
      .mockResolvedValueOnce({ id: toYear, name: '2027-2028' })
    mocks.studentFindMany.mockResolvedValueOnce([
      buildStudent({ academic_year_id: toYear }),
    ])

    const request = new NextRequest('http://localhost/api/settings/promotion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from_academic_year_id: fromYear,
        to_academic_year_id: toYear,
        promotions: [{ student_id: studentId, action: 'PROMOTE', target_class_id: toClass }],
      }),
    })

    const response = await POST(request)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.success).toBe(true)
    expect(payload.data.total_updated).toBe(0)
    expect(payload.data.total_skipped).toBe(1)
    expect(payload.data.skipped[0].reason).toContain('Already promoted')
  })

  it('includes missing session negative case', async () => {
    mocks.requireSchoolPermission.mockResolvedValueOnce({
      error: NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'No valid session' } },
        { status: 401 }
      ),
      user: null,
    })

    const request = new NextRequest('http://localhost/api/settings/promotion')
    const response = await GET(request)
    const payload = await response.json()

    expect(response.status).toBe(401)
    expect(payload.success).toBe(false)
    expect(payload.error.code).toBe('UNAUTHORIZED')
  })
})
