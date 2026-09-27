import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  hasPermission: vi.fn(),
  createAuditLog: vi.fn(),
  transaction: vi.fn(),
  currentYearFindFirst: vi.fn(),
  academicYearFindMany: vi.fn(),
  classFindMany: vi.fn(),
  admissionCount: vi.fn(),
  admissionFindMany: vi.fn(),
  admissionGroupBy: vi.fn(),
  admissionFindFirst: vi.fn(),
  admissionCreate: vi.fn(),
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
    $transaction: mocks.transaction,
    academicYear: {
      findFirst: mocks.currentYearFindFirst,
      findMany: mocks.academicYearFindMany,
    },
    class: {
      findMany: mocks.classFindMany,
    },
    admission: {
      count: mocks.admissionCount,
      findMany: mocks.admissionFindMany,
      groupBy: mocks.admissionGroupBy,
      findFirst: mocks.admissionFindFirst,
      create: mocks.admissionCreate,
    },
  },
}))

import { GET, POST } from '../route'

describe('/api/admissions route handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mocks.auth.mockResolvedValue({
      user: {
        id: 'user-1',
        role: 'STUDENT_ADMIN',
        schoolId: 'school-1',
      },
    })

    mocks.hasPermission.mockResolvedValue(true)

    mocks.currentYearFindFirst.mockResolvedValue({ id: 'year-1' })
    mocks.academicYearFindMany.mockResolvedValue([
      { id: 'year-1', name: '2026-27', is_current: true },
    ])
    mocks.classFindMany.mockResolvedValue([
      { id: 'class-1', name: 'Grade 6', section: 'A' },
    ])

    mocks.admissionCount.mockResolvedValue(1)
    mocks.admissionFindMany.mockResolvedValue([
      {
        id: 'admission-1',
        applicant_name: 'Aarav Sharma',
        date_of_birth: new Date('2014-06-10'),
        gender: 'MALE',
        applying_for_class: 'Grade 6 - A',
        parent_name: 'Rohit Sharma',
        parent_phone: '9999999999',
        parent_email: 'rohit@example.com',
        status: 'APPLIED',
        applied_at: new Date('2026-04-10T08:00:00.000Z'),
        created_at: new Date('2026-04-10T08:00:00.000Z'),
        processed_by: null,
        decided_by: null,
        remarks: null,
        documents_url: ['https://mock/doc.pdf'],
        processor: null,
        decider: null,
      },
    ])
    mocks.admissionGroupBy.mockResolvedValue([
      { status: 'APPLIED', _count: { _all: 1 } },
    ])

    mocks.transaction.mockImplementation(async (operations: Promise<unknown>[]) => {
      return Promise.all(operations)
    })

    mocks.admissionFindFirst.mockResolvedValue(null)
    mocks.admissionCreate.mockResolvedValue({
      id: 'admission-1',
      school_id: 'school-1',
      academic_year_id: 'year-1',
      applicant_name: 'Aarav Sharma',
      date_of_birth: new Date('2014-06-10'),
      gender: 'MALE',
      applying_for_class: 'Grade 6 - A',
      parent_name: 'Rohit Sharma',
      parent_phone: '9999999999',
      parent_email: 'rohit@example.com',
      address: 'Hyderabad',
      previous_school: 'ABC School',
      status: 'APPLIED',
      remarks: 'Good communication skills',
      documents_url: ['https://mock/doc.pdf'],
      applied_at: new Date('2026-04-10T08:00:00.000Z'),
      created_at: new Date('2026-04-10T08:00:00.000Z'),
    })
  })

  it('GET lists admissions with counts and filter metadata', async () => {
    const request = new NextRequest('http://localhost/api/admissions?status=APPLIED&page=1&limit=20')

    const response = await GET(request)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.success).toBe(true)
    expect(payload.data.admissions).toHaveLength(1)
    expect(payload.data.admissions[0]).toMatchObject({
      id: 'admission-1',
      applicant_name: 'Aarav Sharma',
      status: 'APPLIED',
    })
    expect(payload.data.pagination).toMatchObject({
      total: 1,
      page: 1,
      limit: 20,
      total_pages: 1,
    })
    expect(payload.data.counts).toMatchObject({ APPLIED: 1 })
    expect(payload.data.filters.classes[0].label).toBe('Grade 6 - A')
  })

  it('GET returns 401 when session is missing', async () => {
    mocks.auth.mockResolvedValue(null)

    const response = await GET(new NextRequest('http://localhost/api/admissions'))
    const payload = await response.json()

    expect(response.status).toBe(401)
    expect(payload.success).toBe(false)
    expect(payload.error.code).toBe('UNAUTHORIZED')
  })

  it('POST creates an admission application and writes audit log', async () => {
    const request = new NextRequest('http://localhost/api/admissions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        applicant_name: 'Aarav Sharma',
        date_of_birth: '2014-06-10',
        gender: 'MALE',
        applying_for_class: 'Grade 6 - A',
        parent_name: 'Rohit Sharma',
        parent_phone: '9999999999',
        parent_email: 'rohit@example.com',
        address: 'Hyderabad',
        previous_school: 'ABC School',
        remarks: 'Good communication skills',
        documents_url: ['https://mock/doc.pdf'],
      }),
    })

    const response = await POST(request)
    const payload = await response.json()

    expect(response.status).toBe(201)
    expect(payload.success).toBe(true)
    expect(payload.data).toMatchObject({
      id: 'admission-1',
      status: 'APPLIED',
      duplicate_warning: false,
    })
    expect(mocks.createAuditLog).toHaveBeenCalledTimes(1)
  })

  it('POST returns 400 for invalid payload', async () => {
    const request = new NextRequest('http://localhost/api/admissions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        applicant_name: '',
      }),
    })

    const response = await POST(request)
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.success).toBe(false)
    expect(payload.error.code).toBe('VALIDATION_ERROR')
  })

  it('POST returns 401 when session is missing', async () => {
    mocks.auth.mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/admissions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        applicant_name: 'Aarav Sharma',
        date_of_birth: '2014-06-10',
        gender: 'MALE',
        applying_for_class: 'Grade 6 - A',
        parent_name: 'Rohit Sharma',
        parent_phone: '9999999999',
      }),
    })

    const response = await POST(request)
    const payload = await response.json()

    expect(response.status).toBe(401)
    expect(payload.success).toBe(false)
    expect(payload.error.code).toBe('UNAUTHORIZED')
  })
})
