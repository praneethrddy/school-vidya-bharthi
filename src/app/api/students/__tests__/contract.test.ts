import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import {
  StudentListResponseSchema,
  StudentDetailResponseSchema,
  ErrorResponseSchema,
} from '@/test/contracts/schemas'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  hasPermission: vi.fn(),
  parentFindMany: vi.fn(),
  studentCount: vi.fn(),
  studentFindMany: vi.fn(),
  studentFindFirst: vi.fn(),
  classFindMany: vi.fn(),
  classFindFirst: vi.fn(),
  academicYearFindMany: vi.fn(),
  academicYearFindFirst: vi.fn(),
  attendanceGroupBy: vi.fn(),
  attendanceCount: vi.fn(),
  gradeAggregate: vi.fn(),
  gradeCount: vi.fn(),
  gradeFindMany: vi.fn(),
  feePaymentAggregate: vi.fn(),
  feePaymentCount: vi.fn(),
  feePaymentFindFirst: vi.fn(),
  auditLogFindMany: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  auth: mocks.auth,
}))

vi.mock('@/lib/permissions', () => ({
  hasPermission: mocks.hasPermission,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    parent: {
      findMany: mocks.parentFindMany,
    },
    student: {
      count: mocks.studentCount,
      findMany: mocks.studentFindMany,
      findFirst: mocks.studentFindFirst,
    },
    class: {
      findMany: mocks.classFindMany,
      findFirst: mocks.classFindFirst,
    },
    academicYear: {
      findMany: mocks.academicYearFindMany,
      findFirst: mocks.academicYearFindFirst,
    },
    attendance: {
      groupBy: mocks.attendanceGroupBy,
      count: mocks.attendanceCount,
    },
    grade: {
      aggregate: mocks.gradeAggregate,
      count: mocks.gradeCount,
      findMany: mocks.gradeFindMany,
    },
    feePayment: {
      aggregate: mocks.feePaymentAggregate,
      count: mocks.feePaymentCount,
      findFirst: mocks.feePaymentFindFirst,
    },
    auditLog: {
      findMany: mocks.auditLogFindMany,
    },
    $transaction: vi.fn((input) => {
      if (Array.isArray(input)) return Promise.all(input)
      return null
    }),
  },
}))

import { GET } from '../route'
import { GET as GETDetail } from '../[id]/route'

describe('Students API Contract Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.auth.mockResolvedValue({
      user: { id: '00000000-0000-0000-0000-000000000000', role: 'STUDENT_ADMIN', schoolId: '00000000-0000-0000-0000-000000000001' },
    })
    mocks.hasPermission.mockResolvedValue(true)
    mocks.studentCount.mockResolvedValue(1)
    mocks.studentFindMany.mockResolvedValue([
      {
        id: '11111111-1111-1111-1111-111111111111',
        admission_number: 'ADM-101',
        first_name: 'John',
        last_name: 'Doe',
        gender: 'MALE',
        is_active: true,
        class: {
          name: 'Grade 6',
          section: 'A',
        },
      },
    ])
    mocks.classFindMany.mockResolvedValue([])
    mocks.academicYearFindMany.mockResolvedValue([])
    
    // Mocks for detail
    mocks.studentFindFirst.mockResolvedValue({
      id: '11111111-1111-1111-1111-111111111111',
      admission_number: 'ADM-101',
      first_name: 'John',
      last_name: 'Doe',
      gender: 'MALE',
      date_of_birth: new Date('2015-05-15'),
      is_active: true,
      parents: [],
      created_at: new Date('2025-01-01'),
      updated_at: new Date('2025-01-01'),
    })
    mocks.attendanceGroupBy.mockResolvedValue([])
    mocks.attendanceCount.mockResolvedValue(0)
    mocks.gradeAggregate.mockResolvedValue({ _avg: { marks_obtained: null } })
    mocks.gradeCount.mockResolvedValue(0)
    mocks.gradeFindMany.mockResolvedValue([])
    mocks.feePaymentAggregate.mockResolvedValue({ _sum: { amount_paid: null } })
    mocks.feePaymentCount.mockResolvedValue(0)
    mocks.feePaymentFindFirst.mockResolvedValue(null)
    mocks.auditLogFindMany.mockResolvedValue([])
  })

  it('[TEST-CONTRACT-018] GET /api/students returns valid StudentListResponse shape', async () => {
    const request = new NextRequest('http://localhost/api/students')
    const response = await GET(request)
    const payload = await response.json()

    expect(response.status).toBe(200)
    const result = StudentListResponseSchema.safeParse(payload)
    if (!result.success) {
      console.error(result.error)
    }
    expect(result.success).toBe(true)
  })

  it('[TEST-CONTRACT-018] GET /api/students/[id] returns valid StudentDetailResponse shape', async () => {
    const request = new NextRequest('http://localhost/api/students/11111111-1111-1111-1111-111111111111')
    const response = await GETDetail(request, {
      params: Promise.resolve({ id: '11111111-1111-1111-1111-111111111111' }),
    })
    const payload = await response.json()

    expect(response.status).toBe(200)
    const result = StudentDetailResponseSchema.safeParse(payload)
    if (!result.success) {
      console.error(result.error)
    }
    expect(result.success).toBe(true)
  })

  it('[TEST-CONTRACT-020] GET /api/students fails with unauthorized error response shape', async () => {
    mocks.auth.mockResolvedValue(null)
    const request = new NextRequest('http://localhost/api/students')
    const response = await GET(request)
    const payload = await response.json()

    expect(response.status).toBe(401)
    const result = ErrorResponseSchema.safeParse(payload)
    expect(result.success).toBe(true)
  })
})
