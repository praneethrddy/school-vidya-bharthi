import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  hasPermission: vi.fn(),
  createAuditLog: vi.fn(),
  staffFindFirst: vi.fn(),
  staffUpdate: vi.fn(),
  assignmentFindMany: vi.fn(),
  classFindMany: vi.fn(),
  staffAttendanceGroupBy: vi.fn(),
  staffAttendanceCount: vi.fn(),
  auditLogFindMany: vi.fn(),
  subjectFindMany: vi.fn(),
  academicYearFindMany: vi.fn(),
  userFindFirst: vi.fn(),
  userCount: vi.fn(),
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
      findFirst: mocks.staffFindFirst,
      update: mocks.staffUpdate,
    },
    subjectAssignment: {
      findMany: mocks.assignmentFindMany,
    },
    class: {
      findMany: mocks.classFindMany,
    },
    staffAttendance: {
      groupBy: mocks.staffAttendanceGroupBy,
      count: mocks.staffAttendanceCount,
    },
    auditLog: {
      findMany: mocks.auditLogFindMany,
    },
    subject: {
      findMany: mocks.subjectFindMany,
    },
    academicYear: {
      findMany: mocks.academicYearFindMany,
    },
    user: {
      findFirst: mocks.userFindFirst,
      count: mocks.userCount,
    },
    $transaction: mocks.transaction,
  },
}))

import { DELETE, GET, PATCH } from '../route'

describe('/api/staff/[id] route', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mocks.auth.mockResolvedValue({
      user: {
        id: 'principal-1',
        role: 'PRINCIPAL',
        schoolId: 'school-1',
      },
    })
    mocks.hasPermission.mockResolvedValue(true)
    mocks.assignmentFindMany.mockResolvedValue([])
    mocks.classFindMany.mockResolvedValue([])
    mocks.staffAttendanceGroupBy.mockResolvedValue([])
    mocks.staffAttendanceCount.mockResolvedValue(0)
    mocks.auditLogFindMany.mockResolvedValue([])
    mocks.subjectFindMany.mockResolvedValue([])
    mocks.academicYearFindMany.mockResolvedValue([])
  })

  it('GET returns 401 when not authenticated', async () => {
    mocks.auth.mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/staff/staff-1')
    const response = await GET(request, { params: Promise.resolve({ id: 'staff-1' }) })
    const payload = await response.json()

    expect(response.status).toBe(401)
    expect(payload.error).toBe('Unauthorized')
  })

  it('GET returns 404 when staff member is not found in school scope', async () => {
    mocks.staffFindFirst.mockResolvedValueOnce(null)

    const request = new NextRequest('http://localhost/api/staff/staff-1')
    const response = await GET(request, { params: Promise.resolve({ id: 'staff-1' }) })
    const payload = await response.json()

    expect(response.status).toBe(404)
    expect(payload.error).toBe('Staff member not found')
  })

  it('GET returns full staff detail payload', async () => {
    mocks.staffFindFirst.mockResolvedValueOnce({
      id: 'staff-1',
      school_id: 'school-1',
      user_id: 'user-2',
      employee_code: 'EMP-001',
      first_name: 'Anika',
      last_name: 'Rao',
      gender: 'FEMALE',
      date_of_birth: new Date('1990-01-01'),
      phone: '9999999999',
      address: 'Hyderabad',
      photo_url: null,
      designation: 'Teacher',
      department: 'Science',
      date_of_joining: new Date('2020-06-01'),
      qualification: 'MSc',
      is_active: true,
      created_at: new Date('2026-01-01T00:00:00.000Z'),
      updated_at: new Date('2026-01-02T00:00:00.000Z'),
      user: {
        id: 'user-2',
        email: 'anika@school.com',
        role: 'TEACHER',
        is_active: true,
        last_login: null,
      },
    })

    mocks.transaction.mockResolvedValueOnce([
      [],
      [],
      [],
      0,
      [],
      [],
      [],
      [],
    ])

    const request = new NextRequest('http://localhost/api/staff/staff-1')
    const response = await GET(request, { params: Promise.resolve({ id: 'staff-1' }) })
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.data.staff).toEqual(
      expect.objectContaining({
        id: 'staff-1',
        first_name: 'Anika',
      })
    )
    expect(payload.data.attendance_summary.total_records).toBe(0)
    expect(Array.isArray(payload.data.assignments)).toBe(true)
    expect(Array.isArray(payload.data.lookups.classes)).toBe(true)
  })

  it('PATCH rejects duplicate employee code', async () => {
    mocks.staffFindFirst
      .mockResolvedValueOnce({
        id: 'staff-1',
        school_id: 'school-1',
        employee_code: 'EMP-001',
        first_name: 'Anika',
        last_name: 'Rao',
        gender: null,
        phone: null,
        address: null,
        designation: null,
        department: null,
        date_of_joining: null,
        qualification: null,
        is_active: true,
      })
      .mockResolvedValueOnce({ id: 'staff-2' })

    const request = new NextRequest('http://localhost/api/staff/staff-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employee_code: 'EMP-002',
      }),
    })
    const response = await PATCH(request, { params: Promise.resolve({ id: 'staff-1' }) })
    const payload = await response.json()

    expect(response.status).toBe(409)
    expect(payload.error).toBe('Employee code already exists')
  })

  it('PATCH updates staff and writes audit log', async () => {
    mocks.staffFindFirst.mockResolvedValueOnce({
      id: 'staff-1',
      school_id: 'school-1',
      employee_code: 'EMP-001',
      first_name: 'Anika',
      last_name: 'Rao',
      gender: 'FEMALE',
      phone: '9999999999',
      address: 'Hyderabad',
      designation: 'Teacher',
      department: 'Science',
      date_of_joining: new Date('2020-01-01'),
      qualification: 'MSc',
      is_active: true,
    })
    mocks.staffUpdate.mockResolvedValueOnce({
      id: 'staff-1',
      school_id: 'school-1',
      employee_code: 'EMP-001',
      first_name: 'Anika Updated',
      last_name: 'Rao',
      gender: 'FEMALE',
      date_of_birth: null,
      phone: '8888888888',
      address: 'Warangal',
      photo_url: null,
      designation: 'Senior Teacher',
      department: 'Science',
      date_of_joining: null,
      qualification: 'MSc',
      is_active: true,
      created_at: new Date('2026-01-01T00:00:00.000Z'),
      updated_at: new Date('2026-01-02T00:00:00.000Z'),
    })

    const request = new NextRequest('http://localhost/api/staff/staff-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        first_name: 'Anika Updated',
        phone: '8888888888',
        address: 'Warangal',
        designation: 'Senior Teacher',
      }),
    })
    const response = await PATCH(request, { params: Promise.resolve({ id: 'staff-1' }) })
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.data.first_name).toBe('Anika Updated')
    expect(mocks.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        school_id: 'school-1',
        user_id: 'principal-1',
        action: 'UPDATE',
        entity_type: 'staff',
      })
    )
  })

  it('DELETE returns 403 when caller is not PRINCIPAL', async () => {
    mocks.auth.mockResolvedValue({
      user: {
        id: 'staff-admin-1',
        role: 'STAFF_ADMIN',
        schoolId: 'school-1',
      },
    })
    mocks.hasPermission.mockResolvedValue(true)

    const request = new NextRequest('http://localhost/api/staff/staff-1', { method: 'DELETE' })
    const response = await DELETE(request, { params: Promise.resolve({ id: 'staff-1' }) })
    const payload = await response.json()

    expect(response.status).toBe(403)
    expect(payload.error).toBe('Forbidden. Only Principal can deactivate staff.')
  })

  it('DELETE blocks self-deactivation', async () => {
    mocks.staffFindFirst.mockResolvedValueOnce({
      id: 'staff-1',
      school_id: 'school-1',
      user_id: 'principal-1',
      first_name: 'Anika',
      last_name: 'Rao',
      is_active: true,
    })

    const request = new NextRequest('http://localhost/api/staff/staff-1', { method: 'DELETE' })
    const response = await DELETE(request, { params: Promise.resolve({ id: 'staff-1' }) })
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.error).toBe('Cannot deactivate yourself')
  })

  it('DELETE soft-deactivates staff and linked user', async () => {
    mocks.staffFindFirst.mockResolvedValueOnce({
      id: 'staff-1',
      school_id: 'school-1',
      user_id: 'user-2',
      first_name: 'Anika',
      last_name: 'Rao',
      is_active: true,
    })
    mocks.userFindFirst.mockResolvedValueOnce({
      id: 'user-2',
      role: 'TEACHER',
    })
    mocks.transaction.mockImplementationOnce(async (callback: any) =>
      callback({
        staff: { update: vi.fn().mockResolvedValue({ id: 'staff-1', is_active: false }) },
        user: { update: vi.fn().mockResolvedValue({ id: 'user-2', is_active: false }) },
      })
    )

    const request = new NextRequest('http://localhost/api/staff/staff-1', { method: 'DELETE' })
    const response = await DELETE(request, { params: Promise.resolve({ id: 'staff-1' }) })
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.data).toEqual(
      expect.objectContaining({
        id: 'staff-1',
        is_active: false,
      })
    )
    expect(mocks.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'DELETE',
        entity_type: 'staff',
        entity_id: 'staff-1',
      })
    )
  })
})
