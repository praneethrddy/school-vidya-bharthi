import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import {
  AdmissionsListResponseSchema,
  ErrorResponseSchema,
} from '@/test/contracts/schemas'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  hasPermission: vi.fn(),
  admissionCount: vi.fn(),
  admissionFindMany: vi.fn(),
  admissionFindFirst: vi.fn(),
  admissionGroupBy: vi.fn(),
  academicYearFindMany: vi.fn(),
  academicYearFindFirst: vi.fn(),
  classFindMany: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  auth: mocks.auth,
}))

vi.mock('@/lib/permissions', () => ({
  hasPermission: mocks.hasPermission,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    admission: {
      count: mocks.admissionCount,
      findMany: mocks.admissionFindMany,
      findFirst: mocks.admissionFindFirst,
      groupBy: mocks.admissionGroupBy,
    },
    academicYear: {
      findMany: mocks.academicYearFindMany,
      findFirst: mocks.academicYearFindFirst,
    },
    class: {
      findMany: mocks.classFindMany,
    },
    $transaction: vi.fn((input) => {
      if (Array.isArray(input)) return Promise.all(input)
      return null
    }),
  },
}))

import { GET } from '../route'

describe('Admissions API Contract Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.auth.mockResolvedValue({
      user: { id: '00000000-0000-0000-0000-000000000000', role: 'STUDENT_ADMIN', schoolId: '00000000-0000-0000-0000-000000000001' },
    })
    mocks.hasPermission.mockResolvedValue(true)
    mocks.admissionCount.mockResolvedValue(1)
    mocks.admissionFindMany.mockResolvedValue([
      {
        id: '11111111-1111-1111-1111-111111111111',
        applicant_name: 'John Doe',
        date_of_birth: new Date('2018-05-15'),
        gender: 'MALE',
        applying_for_class: 'Grade 1',
        parent_name: 'Richard Doe',
        parent_phone: '1234567890',
        parent_email: 'richard@example.com',
        status: 'APPLIED',
        created_at: new Date('2026-05-01'),
        processed_by: null,
        decided_by: null,
        remarks: null,
        documents_url: [],
      },
    ])
    mocks.admissionGroupBy.mockResolvedValue([])
    mocks.academicYearFindFirst.mockResolvedValue({
      id: '22222222-2222-2222-2222-222222222222',
    })
    mocks.academicYearFindMany.mockResolvedValue([])
    mocks.classFindMany.mockResolvedValue([])
  })

  it('[TEST-CONTRACT-018] GET /api/admissions returns valid AdmissionsListResponse shape', async () => {
    const request = new NextRequest('http://localhost/api/admissions')
    const response = await GET(request)
    const payload = await response.json()

    expect(response.status).toBe(200)
    const result = AdmissionsListResponseSchema.safeParse(payload)
    expect(result.success).toBe(true)
  })

  it('[TEST-CONTRACT-020] GET /api/admissions fails with unauthorized error response shape', async () => {
    mocks.auth.mockResolvedValue(null)
    const request = new NextRequest('http://localhost/api/admissions')
    const response = await GET(request)
    const payload = await response.json()

    expect(response.status).toBe(401)
    const result = ErrorResponseSchema.safeParse(payload)
    expect(result.success).toBe(true)
  })
})
