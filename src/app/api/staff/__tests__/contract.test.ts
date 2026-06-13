import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import {
  StaffListResponseSchema,
  ErrorResponseSchema,
} from '@/test/contracts/schemas'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  hasPermission: vi.fn(),
  staffCount: vi.fn(),
  staffFindMany: vi.fn(),
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
      count: mocks.staffCount,
      findMany: mocks.staffFindMany,
    },
    $transaction: vi.fn((input) => {
      if (Array.isArray(input)) return Promise.all(input)
      return null
    }),
  },
}))

import { GET } from '../route'

describe('Staff API Contract Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.auth.mockResolvedValue({
      user: { id: 'user-1', role: 'STAFF_ADMIN', schoolId: 'school-1' },
    })
    mocks.hasPermission.mockResolvedValue(true)
    mocks.staffCount.mockResolvedValue(1)
    mocks.staffFindMany.mockResolvedValue([
      {
        id: '22222222-2222-2222-2222-222222222222',
        employee_code: 'EMP-101',
        first_name: 'Jane',
        last_name: 'Smith',
        gender: 'FEMALE',
        is_active: true,
        designation: 'Teacher',
        department: 'Science',
        user_id: '33333333-3333-3333-3333-333333333333',
        created_at: new Date('2025-01-01'),
        updated_at: new Date('2025-01-01'),
        user: {
          id: '33333333-3333-3333-3333-333333333333',
          email: 'jane@example.com',
          role: 'TEACHER',
          is_active: true,
        },
        _count: {
          subject_assignments: 2,
        },
      },
    ])
  })

  it('[TEST-CONTRACT-018] GET /api/staff returns valid StaffListResponse shape', async () => {
    const request = new NextRequest('http://localhost/api/staff')
    const response = await GET(request)
    const payload = await response.json()

    expect(response.status).toBe(200)
    const result = StaffListResponseSchema.safeParse(payload)
    expect(result.success).toBe(true)
  })

  it('[TEST-CONTRACT-020] GET /api/staff fails with unauthorized error response shape', async () => {
    mocks.auth.mockResolvedValue(null)
    const request = new NextRequest('http://localhost/api/staff')
    const response = await GET(request)
    const payload = await response.json()

    expect(response.status).toBe(401)
    const result = ErrorResponseSchema.safeParse(payload)
    expect(result.success).toBe(true)
  })
})
