import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  hasPermission: vi.fn(),
  prismaStaffFindFirst: vi.fn(),
  prismaUserFindFirst: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  auth: mocks.auth,
}))

vi.mock('@/lib/permissions', () => ({
  hasPermission: mocks.hasPermission,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    staff: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
      findFirst: mocks.prismaStaffFindFirst,
      count: vi.fn().mockResolvedValue(0),
    },
    user: {
      findFirst: mocks.prismaUserFindFirst,
    },
    $transaction: vi.fn((cb) =>
      cb({
        user: { create: vi.fn().mockResolvedValue({ id: 'u-1' }) },
        staff: { create: vi.fn().mockResolvedValue({ id: 'staff-1' }) },
      })
    ),
  },
}))

import { GET, POST } from '../route'

const schoolId = 'school-1'

describe('/api/staff Negative & Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mocks.auth.mockResolvedValue({
      user: {
        id: 'admin-1',
        role: 'STAFF_ADMIN',
        schoolId,
      },
    })
    mocks.hasPermission.mockResolvedValue(true)
    mocks.prismaStaffFindFirst.mockResolvedValue(null)
    mocks.prismaUserFindFirst.mockResolvedValue(null)
  })

  describe('23A - Input Validation', () => {
    it('TEST-NEG-001: Empty request body on POST routes returns 400', async () => {
      const response = await POST(
        new NextRequest('http://localhost/api/staff', {
          method: 'POST',
          body: JSON.stringify({}),
        })
      )
      const payload = await response.json()

      expect(response.status).toBe(400)
      expect(payload).toEqual(
        expect.objectContaining({
          error: 'Validation failed',
          details: expect.any(Array),
        })
      )
    })

    it('TEST-NEG-002: Missing required fields returns 400', async () => {
      const response = await POST(
        new NextRequest('http://localhost/api/staff', {
          method: 'POST',
          body: JSON.stringify({
            phone: '1234567890',
          }),
        })
      )
      const payload = await response.json()

      expect(response.status).toBe(400)
      expect(payload).toEqual(
        expect.objectContaining({
          error: 'Validation failed',
          details: expect.any(Array),
        })
      )
    })

    it('TEST-NEG-005: Invalid enum values return 400', async () => {
      const response = await POST(
        new NextRequest('http://localhost/api/staff', {
          method: 'POST',
          body: JSON.stringify({
            employee_code: 'EMP-100',
            first_name: 'Jane',
            last_name: 'Doe',
            create_account: true,
            email: 'jane@example.com',
            role: 'PRINCIPAL',
            auto_generate_password: true,
          }),
        })
      )
      const payload = await response.json()

      expect(response.status).toBe(400)
      expect(payload).toEqual(
        expect.objectContaining({
          error: 'Validation failed',
          details: expect.any(Array),
        })
      )
    })
  })

  describe('23B - Auth Edge Cases', () => {
    it('TEST-NEG-010 / TEST-NEG-012: Expired JWT or deleted user session returns 401', async () => {
      mocks.auth.mockResolvedValue(null)

      const response = await GET(new NextRequest('http://localhost/api/staff'))
      const payload = await response.json()

      expect(response.status).toBe(401)
      expect(payload).toEqual(
        expect.objectContaining({
          error: 'Unauthorized',
        })
      )
    })

    it('TEST-NEG-011: Tampered JWT token is rejected by permission layer', async () => {
      mocks.hasPermission.mockResolvedValue(false)

      const response = await GET(new NextRequest('http://localhost/api/staff'))
      const payload = await response.json()

      expect(response.status).toBe(403)
      expect(payload).toEqual(
        expect.objectContaining({
          error: 'Forbidden',
        })
      )
    })

    it('TEST-NEG-013: Session without school_id returns 400 appropriately', async () => {
      mocks.auth.mockResolvedValue({
        user: { id: 'superadmin', role: 'SUPER_ADMIN', schoolId: null },
      })

      const response = await GET(new NextRequest('http://localhost/api/staff'))
      const payload = await response.json()

      expect(response.status).toBe(400)
      expect(payload).toEqual(
        expect.objectContaining({
          error: 'School context is required',
        })
      )
    })
  })

  describe('23C - Data Integrity Edge Cases', () => {
    it('TEST-NEG-017: Prevents duplicate employee codes', async () => {
      mocks.prismaStaffFindFirst.mockResolvedValue({ id: 'existing-staff-id' })

      const response = await POST(
        new NextRequest('http://localhost/api/staff', {
          method: 'POST',
          body: JSON.stringify({
            first_name: 'Jane',
            last_name: 'Doe',
            employee_code: 'EMP-001',
          }),
        })
      )
      const payload = await response.json()

      expect(response.status).toBe(409)
      expect(payload).toEqual(
        expect.objectContaining({
          error: 'Employee code already exists',
        })
      )
    })

    it('TEST-NEG-018: Prevents duplicate emails when creating user account', async () => {
      mocks.prismaStaffFindFirst.mockResolvedValue(null)
      mocks.prismaUserFindFirst.mockResolvedValue({ id: 'existing-user-id' })

      const response = await POST(
        new NextRequest('http://localhost/api/staff', {
          method: 'POST',
          body: JSON.stringify({
            first_name: 'Jane',
            last_name: 'Doe',
            employee_code: 'EMP-002',
            create_account: true,
            email: 'jane@example.com',
            role: 'TEACHER',
            auto_generate_password: true,
          }),
        })
      )
      const payload = await response.json()

      expect(response.status).toBe(409)
      expect(payload).toEqual(
        expect.objectContaining({
          error: 'Email already in use',
        })
      )
    })
  })
})
