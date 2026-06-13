import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  hasPermission: vi.fn(),
  createAuditLog: vi.fn(),
  staffFindFirst: vi.fn(),
  subjectFindFirst: vi.fn(),
  academicYearFindFirst: vi.fn(),
  assignmentFindFirst: vi.fn(),
  assignmentFindMany: vi.fn(),
  assignmentCreate: vi.fn(),
  assignmentDelete: vi.fn(),
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
    },
    subject: {
      findFirst: mocks.subjectFindFirst,
    },
    academicYear: {
      findFirst: mocks.academicYearFindFirst,
    },
    subjectAssignment: {
      findFirst: mocks.assignmentFindFirst,
      findMany: mocks.assignmentFindMany,
      create: mocks.assignmentCreate,
      delete: mocks.assignmentDelete,
    },
    $transaction: mocks.transaction,
  },
}))

import { DELETE, GET, POST } from '../route'

describe('/api/staff/[id]/subjects route', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mocks.auth.mockResolvedValue({
      user: {
        id: 'staff-admin-1',
        role: 'STAFF_ADMIN',
        schoolId: 'school-1',
      },
    })
    mocks.hasPermission.mockResolvedValue(true)
  })

  it('GET returns 401 for missing session', async () => {
    mocks.auth.mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/staff/staff-1/subjects')
    const response = await GET(request, { params: Promise.resolve({ id: 'staff-1' }) })
    const payload = await response.json()

    expect(response.status).toBe(401)
    expect(payload.error).toBe('Unauthorized')
  })

  it('GET returns assignment list scoped by school and staff', async () => {
    mocks.assignmentFindMany.mockResolvedValueOnce([
      {
        id: 'assign-1',
        school_id: 'school-1',
        staff_id: 'staff-1',
        subject_id: 'subject-1',
        academic_year_id: 'year-1',
        created_at: new Date('2026-01-01T00:00:00.000Z'),
        subject: {
          id: 'subject-1',
          name: 'Math',
          code: 'MATH',
          class: { id: 'class-1', name: 'Grade 6', section: 'A' },
        },
        academic_year: {
          id: 'year-1',
          name: '2025-2026',
          is_current: true,
        },
      },
    ])

    const request = new NextRequest('http://localhost/api/staff/staff-1/subjects')
    const response = await GET(request, { params: Promise.resolve({ id: 'staff-1' }) })
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.data).toHaveLength(1)
    expect(mocks.assignmentFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          school_id: 'school-1',
          staff_id: 'staff-1',
        },
      })
    )
  })

  it('POST validates assignment payload', async () => {
    const request = new NextRequest('http://localhost/api/staff/staff-1/subjects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject_id: 'invalid',
        academic_year_id: 'invalid',
      }),
    })
    const response = await POST(request, { params: Promise.resolve({ id: 'staff-1' }) })
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.error).toBe('Validation failed')
  })

  it('POST rejects duplicates and creates assignment with audit log', async () => {
    mocks.transaction.mockResolvedValueOnce([
      { id: 'staff-1' },
      { id: 'subject-1' },
      { id: 'year-1' },
    ])
    mocks.assignmentFindFirst.mockResolvedValueOnce(null)
    mocks.assignmentCreate.mockResolvedValueOnce({
      id: 'assign-2',
      school_id: 'school-1',
      staff_id: 'staff-1',
      subject_id: 'subject-1',
      academic_year_id: 'year-1',
      created_at: new Date('2026-01-01T00:00:00.000Z'),
      subject: {
        id: 'subject-1',
        name: 'Math',
        code: 'MATH',
        class: { id: 'class-1', name: 'Grade 6', section: 'A' },
      },
      academic_year: { id: 'year-1', name: '2025-2026', is_current: true },
    })

    const request = new NextRequest('http://localhost/api/staff/staff-1/subjects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject_id: '11111111-1111-1111-1111-111111111111',
        academic_year_id: '22222222-2222-2222-2222-222222222222',
      }),
    })
    const response = await POST(request, { params: Promise.resolve({ id: 'staff-1' }) })
    const payload = await response.json()

    expect(response.status).toBe(201)
    expect(payload.data.id).toBe('assign-2')
    expect(mocks.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'CREATE',
        entity_type: 'subject_assignment',
      })
    )
  })

  it('DELETE removes assignment when it belongs to staff and school', async () => {
    mocks.assignmentFindFirst.mockResolvedValueOnce({
      id: 'assign-1',
      school_id: 'school-1',
      staff_id: 'staff-1',
      subject_id: 'subject-1',
      academic_year_id: 'year-1',
    })
    mocks.assignmentDelete.mockResolvedValueOnce({ id: 'assign-1' })

    const request = new NextRequest('http://localhost/api/staff/staff-1/subjects', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assignment_id: '33333333-3333-3333-3333-333333333333',
      }),
    })
    const response = await DELETE(request, { params: Promise.resolve({ id: 'staff-1' }) })
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.success).toBe(true)
    expect(mocks.assignmentDelete).toHaveBeenCalledWith({
      where: {
        id: 'assign-1',
      },
    })
    expect(mocks.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'DELETE',
        entity_type: 'subject_assignment',
      })
    )
  })
})

