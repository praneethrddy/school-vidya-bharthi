import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  hasPermission: vi.fn(),
  yearFindFirst: vi.fn(),
  studentFindMany: vi.fn(),
  structureFindMany: vi.fn(),
  paymentFindMany: vi.fn(),
  concessionFindMany: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  auth: mocks.auth,
}))

vi.mock('@/lib/permissions', () => ({
  hasPermission: mocks.hasPermission,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    academicYear: {
      findFirst: mocks.yearFindFirst,
    },
    student: {
      findMany: mocks.studentFindMany,
    },
    feeStructure: {
      findMany: mocks.structureFindMany,
    },
    feePayment: {
      findMany: mocks.paymentFindMany,
    },
    feeConcession: {
      findMany: mocks.concessionFindMany,
    },
  },
}))

import { GET } from '../route'

describe('/api/admin/fees/defaulters GET', () => {
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

    mocks.yearFindFirst.mockResolvedValue({ id: 'year-1' })

    mocks.studentFindMany.mockResolvedValue([
      {
        id: 'student-1',
        first_name: 'Rahul',
        last_name: 'Sharma',
        class_id: 'class-1',
        class: { name: 'Grade 6', section: 'A' },
        parents: [
          {
            is_primary: true,
            parent: {
              first_name: 'Mohan',
              last_name: 'Sharma',
              phone: '9999999999',
            },
          },
        ],
      },
    ])

    mocks.structureFindMany.mockResolvedValue([
      {
        id: 'structure-1',
        class_id: 'class-1',
        amount: { toNumber: () => 5000 },
        category: { name: 'Tuition' },
      },
    ])

    mocks.paymentFindMany.mockResolvedValue([
      {
        student_id: 'student-1',
        fee_structure_id: 'structure-1',
        amount_paid: { toNumber: () => 1000 },
      },
    ])

    mocks.concessionFindMany.mockResolvedValue([])
  })

  it('returns students with outstanding balances', async () => {
    const request = new NextRequest('http://localhost/api/admin/fees/defaulters')
    const response = await GET(request)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.success).toBe(true)
    expect(payload.data.defaulters).toHaveLength(1)
    expect(payload.data.defaulters[0].balance).toBe(4000)
    expect(payload.data.total_outstanding).toBe(4000)
  })

  it('returns 401 for missing session', async () => {
    mocks.auth.mockResolvedValue(null)
    const request = new NextRequest('http://localhost/api/admin/fees/defaulters')

    const response = await GET(request)
    const payload = await response.json()

    expect(response.status).toBe(401)
    expect(payload).toMatchObject({
      success: false,
      error: { code: 'UNAUTHORIZED' },
    })
  })

  it('returns 403 for missing FEES.view_defaulters permission', async () => {
    mocks.hasPermission.mockResolvedValue(false)
    const request = new NextRequest('http://localhost/api/admin/fees/defaulters')

    const response = await GET(request)
    const payload = await response.json()

    expect(response.status).toBe(403)
    expect(payload).toMatchObject({
      success: false,
      error: { code: 'FORBIDDEN' },
    })
  })

  it('returns empty data when current academic year is not configured', async () => {
    mocks.yearFindFirst.mockResolvedValue(null)
    const request = new NextRequest('http://localhost/api/admin/fees/defaulters')

    const response = await GET(request)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toMatchObject({
      success: true,
      data: {
        defaulters: [],
        total_outstanding: 0,
        pagination: { total: 0, total_pages: 0 },
      },
    })
  })
})
