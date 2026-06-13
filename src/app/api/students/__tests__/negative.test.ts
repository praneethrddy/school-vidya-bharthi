import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  hasPermission: vi.fn(),
  prismaParentFindMany: vi.fn(),
  prismaStudentCount: vi.fn(),
  prismaStudentFindMany: vi.fn(),
  prismaStudentFindFirst: vi.fn(),
  prismaClassFindMany: vi.fn(),
  prismaClassFindFirst: vi.fn(),
  prismaAcademicYearFindMany: vi.fn(),
  prismaAcademicYearFindFirst: vi.fn(),
  prismaUserFindFirst: vi.fn(),
  prismaTransaction: vi.fn(),
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
      findMany: mocks.prismaParentFindMany,
    },
    student: {
      count: mocks.prismaStudentCount,
      findMany: mocks.prismaStudentFindMany,
      findFirst: mocks.prismaStudentFindFirst,
    },
    class: {
      findMany: mocks.prismaClassFindMany,
      findFirst: mocks.prismaClassFindFirst,
    },
    academicYear: {
      findMany: mocks.prismaAcademicYearFindMany,
      findFirst: mocks.prismaAcademicYearFindFirst,
    },
    user: {
      findFirst: mocks.prismaUserFindFirst,
    },
    $transaction: mocks.prismaTransaction,
  },
}))

import { GET, POST } from '../route'

const schoolId = 'school-1'
const classId = '11111111-1111-1111-1111-111111111111'
const yearId = '22222222-2222-2222-2222-222222222222'

function expectErrorShape(payload: unknown, code: string) {
  expect(payload).toEqual(
    expect.objectContaining({
      success: false,
      error: expect.objectContaining({
        code,
        message: expect.any(String),
      }),
    })
  )
}

describe('/api/students Negative & Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mocks.auth.mockResolvedValue({
      user: {
        id: 'admin-1',
        role: 'STUDENT_ADMIN',
        schoolId,
      },
    })
    mocks.hasPermission.mockResolvedValue(true)

    mocks.prismaParentFindMany.mockResolvedValue([])
    mocks.prismaStudentCount.mockResolvedValue(0)
    mocks.prismaStudentFindMany.mockResolvedValue([])
    mocks.prismaClassFindMany.mockResolvedValue([])
    mocks.prismaClassFindFirst.mockResolvedValue({
      id: classId,
      academic_year_id: yearId,
    })
    mocks.prismaAcademicYearFindMany.mockResolvedValue([])
    mocks.prismaAcademicYearFindFirst.mockResolvedValue({
      id: yearId,
      name: '2025-2026',
    })
    mocks.prismaStudentFindFirst.mockResolvedValue(null)
    mocks.prismaUserFindFirst.mockResolvedValue(null)

    mocks.prismaTransaction.mockImplementation(async (input: unknown) => {
      if (Array.isArray(input)) {
        return Promise.all(input)
      }

      if (typeof input === 'function') {
        return (input as (tx: any) => unknown)({
          user: { create: vi.fn().mockResolvedValue({ id: 'u-1' }) },
          student: { create: vi.fn().mockResolvedValue({ id: 's-1' }) },
          parent: { findFirst: vi.fn(), create: vi.fn() },
          studentParent: { updateMany: vi.fn(), create: vi.fn() },
        })
      }

      return null
    })
  })

  describe('23A - Input Validation', () => {
    it('TEST-NEG-001: Empty request body on POST routes returns 400', async () => {
      const response = await POST(new NextRequest('http://localhost/api/students', {
        method: 'POST',
        body: JSON.stringify({}),
      }))
      const payload = await response.json()

      expect(response.status).toBe(400)
      expectErrorShape(payload, 'VALIDATION_ERROR')
    })

    it('TEST-NEG-002: Missing required fields returns 400 with field-level errors', async () => {
      const response = await POST(new NextRequest('http://localhost/api/students', {
        method: 'POST',
        body: JSON.stringify({
          class_id: classId,
        }),
      }))
      const payload = await response.json()

      expect(response.status).toBe(400)
      expectErrorShape(payload, 'VALIDATION_ERROR')
    })

    it('TEST-NEG-003: Invalid UUID params returns 400', async () => {
      const response = await GET(new NextRequest('http://localhost/api/students?class_id=bad-uuid'))
      const payload = await response.json()

      expect(response.status).toBe(400)
      expectErrorShape(payload, 'VALIDATION_ERROR')
    })

    it('TEST-NEG-004: Strings exceeding max length return 400', async () => {
      const response = await POST(new NextRequest('http://localhost/api/students', {
        method: 'POST',
        body: JSON.stringify({
          admission_number: 'A'.repeat(51),
          first_name: 'John',
          last_name: 'Doe',
          date_of_birth: '2010-01-01',
          class_id: classId,
        }),
      }))
      const payload = await response.json()

      expect(response.status).toBe(400)
      expectErrorShape(payload, 'VALIDATION_ERROR')
    })

    it('TEST-NEG-005: Invalid enum values return 400', async () => {
      const response = await POST(new NextRequest('http://localhost/api/students', {
        method: 'POST',
        body: JSON.stringify({
          admission_number: 'ADM-001',
          first_name: 'John',
          last_name: 'Doe',
          gender: 'INVALID',
          date_of_birth: '2010-01-01',
          class_id: classId,
        }),
      }))
      const payload = await response.json()

      expect(response.status).toBe(400)
      expectErrorShape(payload, 'VALIDATION_ERROR')
    })

    it('TEST-NEG-006: Invalid date formats return 400', async () => {
      const response = await POST(new NextRequest('http://localhost/api/students', {
        method: 'POST',
        body: JSON.stringify({
          admission_number: 'ADM-001',
          first_name: 'John',
          last_name: 'Doe',
          date_of_birth: 'not-a-date',
          class_id: classId,
        }),
      }))
      const payload = await response.json()

      expect(response.status).toBe(400)
      expectErrorShape(payload, 'VALIDATION_ERROR')
    })

    it('TEST-NEG-007: Negative numbers where positive required return 400', async () => {
      const response = await GET(new NextRequest('http://localhost/api/students?limit=-1'))
      const payload = await response.json()

      expect(response.status).toBe(400)
      expectErrorShape(payload, 'VALIDATION_ERROR')
    })

    it('TEST-NEG-008: SQL-like characters in search params stay parameterized and safe', async () => {
      const searchPayload = "' OR 1=1 --"
      const response = await GET(
        new NextRequest(`http://localhost/api/students?search=${encodeURIComponent(searchPayload)}`)
      )
      const payload = await response.json()

      expect(response.status).toBe(200)
      expect(payload).toEqual(
        expect.objectContaining({
          success: true,
          data: expect.any(Object),
        })
      )

      const where = mocks.prismaStudentCount.mock.calls[0]?.[0]?.where
      expect(where).toEqual(expect.objectContaining({ school_id: schoolId }))
      expect(JSON.stringify(where)).toContain(searchPayload)
    })

    it('TEST-NEG-009: XSS payloads in text search are treated as plain data', async () => {
      const xssPayload = '<script>alert(1)</script>'
      const response = await GET(
        new NextRequest(`http://localhost/api/students?search=${encodeURIComponent(xssPayload)}`)
      )
      const payload = await response.json()

      expect(response.status).toBe(200)
      expect(payload).toEqual(
        expect.objectContaining({
          success: true,
          data: expect.any(Object),
        })
      )

      const where = mocks.prismaStudentCount.mock.calls[0]?.[0]?.where
      expect(where).toEqual(expect.objectContaining({ school_id: schoolId }))
      expect(JSON.stringify(where)).toContain(xssPayload)
    })
  })

  describe('23B - Auth Edge Cases', () => {
    it('TEST-NEG-010 / TEST-NEG-012: Expired JWT / Deleted user session returns 401', async () => {
      mocks.auth.mockResolvedValue(null)
      const response = await GET(new NextRequest('http://localhost/api/students'))
      const payload = await response.json()

      expect(response.status).toBe(401)
      expectErrorShape(payload, 'UNAUTHORIZED')
    })

    it('TEST-NEG-013: Session without school_id returns 400 appropriately', async () => {
      mocks.auth.mockResolvedValue({
        user: { id: 'superadmin', role: 'SUPER_ADMIN', schoolId: null },
      })
      const response = await GET(new NextRequest('http://localhost/api/students'))
      const payload = await response.json()

      expect(response.status).toBe(400)
      expectErrorShape(payload, 'SCHOOL_REQUIRED')
    })
  })

  describe('23C - Data Integrity Edge Cases', () => {
    it('TEST-NEG-017: Prevents duplicate admission numbers', async () => {
      mocks.prismaStudentFindFirst.mockResolvedValue({ id: 'existing-student' })

      const response = await POST(new NextRequest('http://localhost/api/students', {
        method: 'POST',
        body: JSON.stringify({
          first_name: 'John',
          last_name: 'Doe',
          admission_number: 'ADM-001',
          class_id: classId,
          academic_year_id: yearId,
          date_of_birth: '2010-01-01',
        }),
      }))
      const payload = await response.json()

      expect(response.status).toBe(409)
      expectErrorShape(payload, 'DUPLICATE_ADMISSION_NUMBER')
    })
  })
})
