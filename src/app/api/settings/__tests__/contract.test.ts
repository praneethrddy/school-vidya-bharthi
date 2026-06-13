import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import {
  AcademicYearsResponseSchema,
  ClassesResponseSchema,
  ErrorResponseSchema,
} from '@/test/contracts/schemas'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  requireSchoolPermission: vi.fn(),
  academicYearFindMany: vi.fn(),
  academicYearFindFirst: vi.fn(),
  classFindMany: vi.fn(),
  staffFindMany: vi.fn(),
  studentGroupBy: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  auth: mocks.auth,
}))

vi.mock('@/lib/settings-auth', () => ({
  requireSchoolPermission: mocks.requireSchoolPermission,
  getRequestMetadata: () => ({ ip_address: '127.0.0.1', user_agent: 'Vitest' }),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    academicYear: {
      findMany: mocks.academicYearFindMany,
      findFirst: mocks.academicYearFindFirst,
    },
    class: {
      findMany: mocks.classFindMany,
    },
    staff: {
      findMany: mocks.staffFindMany,
    },
    student: {
      groupBy: mocks.studentGroupBy,
    },
  },
}))

import { GET as GETYears } from '../academic-years/route'
import { GET as GETClasses } from '../classes/route'

describe('Settings API Contract Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireSchoolPermission.mockResolvedValue({
      error: null,
      user: { id: '00000000-0000-0000-0000-000000000000', role: 'PRINCIPAL', schoolId: '00000000-0000-0000-0000-000000000001' },
    })
  })

  it('[TEST-CONTRACT-013] GET /api/settings/academic-years returns valid AcademicYearsResponse shape', async () => {
    mocks.academicYearFindMany.mockResolvedValue([
      {
        id: '22222222-2222-2222-2222-222222222222',
        name: '2025-2026',
        start_date: new Date('2025-06-01'),
        end_date: new Date('2026-05-31'),
        is_current: true,
        terms: [
          {
            id: '33333333-3333-3333-3333-333333333333',
            name: 'Term 1',
            start_date: new Date('2025-06-01'),
            end_date: new Date('2025-10-31'),
          },
        ],
        _count: {
          classes: 5,
        },
      },
    ])

    const response = await GETYears()
    const payload = await response.json()

    expect(response.status).toBe(200)
    const result = AcademicYearsResponseSchema.safeParse(payload)
    expect(result.success).toBe(true)
  })

  it('[TEST-CONTRACT-014] GET /api/settings/classes returns valid ClassesResponse shape', async () => {
    mocks.academicYearFindMany.mockResolvedValue([
      { id: '22222222-2222-2222-2222-222222222222', name: '2025-2026', is_current: true },
    ])
    mocks.academicYearFindFirst.mockResolvedValue({ id: '22222222-2222-2222-2222-222222222222' })
    mocks.classFindMany.mockResolvedValue([
      {
        id: '44444444-4444-4444-4444-444444444444',
        academic_year_id: '22222222-2222-2222-2222-222222222222',
        name: 'Grade 6',
        section: 'A',
        room_number: '101',
        max_students: 40,
        class_teacher_id: '55555555-5555-5555-5555-555555555555',
        class_teacher: {
          id: '55555555-5555-5555-5555-555555555555',
          first_name: 'Jane',
          last_name: 'Smith',
        },
        academic_year: {
          id: '22222222-2222-2222-2222-222222222222',
          name: '2025-2026',
        },
      },
    ])
    mocks.staffFindMany.mockResolvedValue([])
    mocks.studentGroupBy.mockResolvedValue([])

    const request = new NextRequest('http://localhost/api/settings/classes')
    const response = await GETClasses(request)
    const payload = await response.json()

    expect(response.status).toBe(200)
    const result = ClassesResponseSchema.safeParse(payload)
    expect(result.success).toBe(true)
  })

  it('[TEST-CONTRACT-020] GET /api/settings/classes fails with unauthorized error response shape', async () => {
    mocks.requireSchoolPermission.mockResolvedValue({
      error: {
        status: 401,
        json: async () => ({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not logged in' } }),
      } as any,
      user: null,
    })
    const request = new NextRequest('http://localhost/api/settings/classes')
    const response = await GETClasses(request)
    const payload = await response.json()

    expect(response.status).toBe(401)
    const result = ErrorResponseSchema.safeParse(payload)
    expect(result.success).toBe(true)
  })
})
