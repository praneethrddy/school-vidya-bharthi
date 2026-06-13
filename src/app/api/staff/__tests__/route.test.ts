import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  hasPermission: vi.fn(),
  createAuditLog: vi.fn(),
  staffCount: vi.fn(),
  staffFindMany: vi.fn(),
  staffFindFirst: vi.fn(),
  userFindFirst: vi.fn(),
  transaction: vi.fn(),
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
    staff: {
      count: mocks.staffCount,
      findMany: mocks.staffFindMany,
      findFirst: mocks.staffFindFirst,
    },
    user: {
      findFirst: mocks.userFindFirst,
    },
    $transaction: mocks.transaction,
  },
}))

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashed-password'),
  },
}))

import { GET, POST } from '../route'

describe('/api/staff route', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mocks.auth.mockResolvedValue({
      user: {
        id: 'user-1',
        role: 'STAFF_ADMIN',
        schoolId: 'school-1',
      },
    })
    mocks.hasPermission.mockResolvedValue(true)
    mocks.staffCount.mockResolvedValue(0)
    mocks.staffFindMany.mockResolvedValue([])
  })

  it('GET returns 401 for missing session', async () => {
    mocks.auth.mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/staff')
    const response = await GET(request)
    const payload = await response.json()

    expect(response.status).toBe(401)
    expect(payload.error).toBe('Unauthorized')
  })

  it('GET returns 403 when STAFF.view permission is missing', async () => {
    mocks.hasPermission.mockResolvedValue(false)

    const request = new NextRequest('http://localhost/api/staff')
    const response = await GET(request)
    const payload = await response.json()

    expect(response.status).toBe(403)
    expect(payload.error).toBe('Forbidden')
    expect(mocks.hasPermission).toHaveBeenCalledWith('school-1', 'STAFF_ADMIN', 'STAFF.view')
  })

  it('GET lists staff using search/filters/pagination and omits encrypted search fields', async () => {
    const staffRow = {
      id: 'staff-1',
      employee_code: 'EMP-001',
      first_name: 'Anika',
      last_name: 'Rao',
      photo_url: null,
      designation: 'Teacher',
      department: 'Science',
      is_active: true,
      user_id: 'user-2',
      created_at: new Date('2026-01-01T00:00:00.000Z'),
      updated_at: new Date('2026-01-02T00:00:00.000Z'),
      user: {
        id: 'user-2',
        email: 'anika@school.com',
        role: 'TEACHER',
        is_active: true,
      },
      _count: {
        subject_assignments: 2,
      },
    }

    mocks.transaction.mockResolvedValue([
      1,
      [staffRow],
      [{ department: 'Science' }],
      [{ designation: 'Teacher' }],
    ])

    const request = new NextRequest(
      'http://localhost/api/staff?search=an&department=Science&designation=Teacher&is_active=true&page=2&limit=10&sort_by=first_name&sort_order=asc'
    )
    const response = await GET(request)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.data).toHaveLength(1)
    expect(payload.data[0]).toEqual(
      expect.objectContaining({
        id: 'staff-1',
        user_role: 'TEACHER',
        subjects_count: 2,
      })
    )
    expect(payload.pagination).toEqual({
      total: 1,
      page: 2,
      limit: 10,
      totalPages: 1,
    })
    expect(payload.filters.departments).toEqual(['Science'])
    expect(payload.filters.designations).toEqual(['Teacher'])

    const whereClause = mocks.staffFindMany.mock.calls[0][0].where
    expect(JSON.stringify(whereClause)).not.toContain('phone')
    expect(JSON.stringify(whereClause)).not.toContain('address')
  })

  it('GET returns 400 for invalid query parameters', async () => {
    const request = new NextRequest('http://localhost/api/staff?sort_order=invalid')
    const response = await GET(request)
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.error).toBe('Invalid query parameters')
    expect(Array.isArray(payload.details)).toBe(true)
  })

  it('POST rejects duplicate employee code per school', async () => {
    mocks.staffFindFirst.mockResolvedValueOnce({ id: 'existing-staff' })

    const request = new NextRequest('http://localhost/api/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employee_code: 'EMP-001',
        first_name: 'Riya',
        last_name: 'Sharma',
      }),
    })
    const response = await POST(request)
    const payload = await response.json()

    expect(response.status).toBe(409)
    expect(payload.error).toBe('Employee code already exists')
  })

  it('POST blocks disallowed account role (PRINCIPAL/SUPER_ADMIN)', async () => {
    const request = new NextRequest('http://localhost/api/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employee_code: 'EMP-010',
        first_name: 'Riya',
        last_name: 'Sharma',
        create_account: true,
        email: 'riya@school.com',
        role: 'PRINCIPAL',
        auto_generate_password: true,
      }),
    })
    const response = await POST(request)
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.error).toBe('Validation failed')
    expect(Array.isArray(payload.details)).toBe(true)
  })

  it('POST creates staff with optional account and returns generated password', async () => {
    mocks.staffFindFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'staff-2',
        employee_code: 'EMP-002',
        first_name: 'Riya',
        last_name: 'Sharma',
        photo_url: null,
        designation: 'Teacher',
        department: 'Science',
        is_active: true,
        user_id: 'user-2',
        created_at: new Date('2026-01-01T00:00:00.000Z'),
        updated_at: new Date('2026-01-02T00:00:00.000Z'),
        user: {
          id: 'user-2',
          email: 'riya@school.com',
          role: 'TEACHER',
          is_active: true,
        },
        _count: {
          subject_assignments: 0,
        },
      })

    mocks.userFindFirst.mockResolvedValueOnce(null)
    mocks.transaction.mockImplementationOnce(async (callback: any) =>
      callback({
        user: {
          create: vi.fn().mockResolvedValue({ id: 'user-2' }),
        },
        staff: {
          create: vi.fn().mockResolvedValue({ id: 'staff-2' }),
        },
      })
    )

    const request = new NextRequest('http://localhost/api/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employee_code: 'EMP-002',
        first_name: 'Riya',
        last_name: 'Sharma',
        department: 'Science',
        designation: 'Teacher',
        create_account: true,
        email: 'riya@school.com',
        role: 'TEACHER',
        auto_generate_password: true,
      }),
    })
    const response = await POST(request)
    const payload = await response.json()

    expect(response.status).toBe(201)
    expect(payload.data).toEqual(
      expect.objectContaining({
        id: 'staff-2',
        user_role: 'TEACHER',
      })
    )
    expect(typeof payload.generatedPassword).toBe('string')
    expect(payload.generatedPassword.length).toBeGreaterThanOrEqual(8)
    expect(mocks.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        school_id: 'school-1',
        user_id: 'user-1',
        action: 'CREATE',
        entity_type: 'staff',
      })
    )
  })
})
