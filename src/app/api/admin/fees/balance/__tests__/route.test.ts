import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  hasPermission: vi.fn(),
  cacheGet: vi.fn(),
  cacheSet: vi.fn(),
  studentFindFirst: vi.fn(),
  yearFindFirst: vi.fn(),
  structureFindMany: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  auth: mocks.auth,
}))

vi.mock('@/lib/permissions', () => ({
  hasPermission: mocks.hasPermission,
}))

vi.mock('@/lib/cache', () => ({
  cacheGet: mocks.cacheGet,
  cacheSet: mocks.cacheSet,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    student: {
      findFirst: mocks.studentFindFirst,
    },
    academicYear: {
      findFirst: mocks.yearFindFirst,
    },
    feeStructure: {
      findMany: mocks.structureFindMany,
    },
  },
}))

import { GET } from '../route'

describe('/api/admin/fees/balance GET', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mocks.auth.mockResolvedValue({
      user: {
        id: 'user-1',
        role: 'ACCOUNTANT',
        schoolId: 'school-1',
      },
    })

    mocks.hasPermission.mockResolvedValue(true)
    mocks.cacheGet.mockResolvedValue(null)

    mocks.studentFindFirst.mockResolvedValue({
      id: 'student-1',
      first_name: 'Rahul',
      last_name: 'Sharma',
      class_id: 'class-1',
      academic_year_id: 'year-1',
      class: { name: 'Grade 6', section: 'A' },
      academic_year: { id: 'year-1' },
    })

    mocks.structureFindMany.mockResolvedValue([
      {
        id: 'structure-1',
        amount: { toNumber: () => 1000 },
        due_date: new Date('2025-06-15'),
        category: { name: 'Tuition' },
        fee_payments: [
          {
            id: 'payment-1',
            amount_paid: { toNumber: () => 300 },
            payment_date: new Date('2025-06-10'),
            payment_mode: 'CASH',
            receipt_number: 'VBHS-2025-000001',
            receipt_url: 'https://r2/1.pdf',
          },
        ],
        fee_concessions: [
          {
            concession_type: 'FIXED_AMOUNT',
            concession_value: { toNumber: () => 100 },
          },
        ],
      },
    ])
  })

  it('returns computed balances with dynamic formula', async () => {
    const request = new NextRequest('http://localhost/api/admin/fees/balance?student_id=student-1')
    const response = await GET(request)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.success).toBe(true)
    expect(payload.data.balances[0].balance_due).toBe(600)
    expect(payload.data.total_due).toBe(900)
    expect(payload.data.total_paid).toBe(300)
    expect(payload.data.total_balance).toBe(600)
  })

  it('returns cached payload when available', async () => {
    mocks.cacheGet.mockResolvedValue({
      student: { id: 'student-1', name: 'Cached Student', class_name: 'Grade 6 A' },
      balances: [],
      total_due: 0,
      total_paid: 0,
      total_balance: 0,
    })

    const request = new NextRequest('http://localhost/api/admin/fees/balance?student_id=student-1')
    const response = await GET(request)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toMatchObject({
      success: true,
      data: { student: { name: 'Cached Student' }, balances: [] },
    })
    expect(mocks.studentFindFirst).not.toHaveBeenCalled()
  })

  it('returns 400 when student_id is missing', async () => {
    const request = new NextRequest('http://localhost/api/admin/fees/balance')
    const response = await GET(request)
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload).toMatchObject({
      success: false,
      error: { code: 'VALIDATION_ERROR' },
    })
  })

  it('returns 401 when session is missing', async () => {
    mocks.auth.mockResolvedValue(null)
    const request = new NextRequest('http://localhost/api/admin/fees/balance?student_id=student-1')

    const response = await GET(request)
    const payload = await response.json()

    expect(response.status).toBe(401)
    expect(payload).toMatchObject({
      success: false,
      error: { code: 'UNAUTHORIZED' },
    })
  })
})
