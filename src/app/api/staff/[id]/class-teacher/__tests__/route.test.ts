import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  hasPermission: vi.fn(),
  createAuditLog: vi.fn(),
  staffFindFirst: vi.fn(),
  classFindFirst: vi.fn(),
  classFindMany: vi.fn(),
  classUpdate: vi.fn(),
  classUpdateMany: vi.fn(),
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
    class: {
      findFirst: mocks.classFindFirst,
      findMany: mocks.classFindMany,
      update: mocks.classUpdate,
      updateMany: mocks.classUpdateMany,
    },
  },
}))

import { PATCH } from '../route'

describe('/api/staff/[id]/class-teacher PATCH', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mocks.auth.mockResolvedValue({
      user: {
        id: 'staff-admin-1',
        role: 'STAFF_ADMIN',
        schoolId: 'school-1',
      },
    })
    mocks.hasPermission.mockImplementation(async (_schoolId: string, _role: string, permission: string) => {
      return permission === 'STAFF.edit'
    })
    mocks.staffFindFirst.mockResolvedValue({
      id: 'staff-1',
      first_name: 'Anika',
      last_name: 'Rao',
    })
  })

  it('returns 401 for missing session', async () => {
    mocks.auth.mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/staff/staff-1/class-teacher', {
      method: 'PATCH',
      body: JSON.stringify({ class_id: null }),
    })
    const response = await PATCH(request, { params: Promise.resolve({ id: 'staff-1' }) })
    const payload = await response.json()

    expect(response.status).toBe(401)
    expect(payload.error).toBe('Unauthorized')
  })

  it('returns 403 when neither STAFF.edit nor TIMETABLE.create is granted', async () => {
    mocks.hasPermission.mockResolvedValue(false)

    const request = new NextRequest('http://localhost/api/staff/staff-1/class-teacher', {
      method: 'PATCH',
      body: JSON.stringify({ class_id: null }),
    })
    const response = await PATCH(request, { params: Promise.resolve({ id: 'staff-1' }) })
    const payload = await response.json()

    expect(response.status).toBe(403)
    expect(payload.error).toBe('Forbidden')
  })

  it('assigns class teacher when class_id is provided', async () => {
    mocks.classFindFirst.mockResolvedValueOnce({
      id: 'class-1',
      name: 'Grade 6',
      section: 'A',
      class_teacher_id: 'staff-old',
    })
    mocks.classUpdate.mockResolvedValueOnce({
      id: 'class-1',
      name: 'Grade 6',
      section: 'A',
      class_teacher_id: 'staff-1',
      academic_year: {
        id: 'year-1',
        name: '2025-2026',
      },
    })

    const request = new NextRequest('http://localhost/api/staff/staff-1/class-teacher', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        class_id: '11111111-1111-1111-1111-111111111111',
      }),
    })
    const response = await PATCH(request, { params: Promise.resolve({ id: 'staff-1' }) })
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.data.class_teacher_id).toBe('staff-1')
    expect(mocks.classUpdate).toHaveBeenCalledWith({
      where: { id: '11111111-1111-1111-1111-111111111111' },
      data: { class_teacher_id: 'staff-1' },
      select: expect.any(Object),
    })
  })

  it('removes class teacher assignment when class_id is null', async () => {
    mocks.classFindMany.mockResolvedValueOnce([
      { id: 'class-1' },
      { id: 'class-2' },
    ])
    mocks.classUpdateMany.mockResolvedValueOnce({ count: 2 })

    const request = new NextRequest('http://localhost/api/staff/staff-1/class-teacher', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        class_id: null,
      }),
    })
    const response = await PATCH(request, { params: Promise.resolve({ id: 'staff-1' }) })
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.data.removed_count).toBe(2)
    expect(mocks.classUpdateMany).toHaveBeenCalledWith({
      where: {
        school_id: 'school-1',
        class_teacher_id: 'staff-1',
      },
      data: {
        class_teacher_id: null,
      },
    })
  })
})

