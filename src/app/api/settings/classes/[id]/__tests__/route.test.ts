import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

const mocks = vi.hoisted(() => ({
  requireSchoolPermission: vi.fn(),
  getRequestMetadata: vi.fn(),
  classFindFirst: vi.fn(),
  classDelete: vi.fn(),
  studentCount: vi.fn(),
  createAuditLog: vi.fn(),
}))

vi.mock('@/lib/settings-auth', () => ({
  requireSchoolPermission: mocks.requireSchoolPermission,
  getRequestMetadata: mocks.getRequestMetadata,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    class: {
      findFirst: mocks.classFindFirst,
      delete: mocks.classDelete,
    },
    student: {
      count: mocks.studentCount,
    },
    staff: {
      findFirst: vi.fn(),
    },
  },
}))

vi.mock('@/lib/audit', () => ({
  createAuditLog: mocks.createAuditLog,
}))

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

import { DELETE } from '../route'

const classId = '11111111-1111-1111-1111-111111111111'

describe('/api/settings/classes/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireSchoolPermission.mockResolvedValue({
      error: null,
      user: {
        id: 'user-1',
        role: 'PRINCIPAL',
        schoolId: 'school-1',
      },
    })
    mocks.getRequestMetadata.mockReturnValue({
      ip_address: '127.0.0.1',
      user_agent: 'vitest',
    })
    mocks.classFindFirst.mockResolvedValue({
      id: classId,
      name: 'Grade 6',
      section: 'A',
      academic_year_id: 'year-1',
      room_number: '101',
      max_students: 40,
      class_teacher_id: null,
    })
    mocks.studentCount.mockResolvedValue(0)
    mocks.classDelete.mockResolvedValue({ id: classId })
  })

  it('TEST-SET-007: DELETE removes class and writes audit log', async () => {
    const request = new NextRequest(`http://localhost/api/settings/classes/${classId}`, {
      method: 'DELETE',
    })

    const response = await DELETE(request, { params: Promise.resolve({ id: classId }) })
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.success).toBe(true)
    expect(payload.data.message).toContain('deleted')
    expect(mocks.classDelete).toHaveBeenCalledWith({ where: { id: classId } })
    expect(mocks.createAuditLog).toHaveBeenCalledTimes(1)
  })

  it('TEST-NEG-015: returns 409 when class has active students', async () => {
    mocks.studentCount.mockResolvedValueOnce(3)

    const request = new NextRequest(`http://localhost/api/settings/classes/${classId}`, {
      method: 'DELETE',
    })

    const response = await DELETE(request, { params: Promise.resolve({ id: classId }) })
    const payload = await response.json()

    expect(response.status).toBe(409)
    expect(payload.success).toBe(false)
    expect(payload.error.code).toBe('CLASS_HAS_STUDENTS')
    expect(mocks.classDelete).not.toHaveBeenCalled()
  })

  it('returns 401 when session is missing', async () => {
    mocks.requireSchoolPermission.mockResolvedValueOnce({
      error: NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'No valid session' } },
        { status: 401 }
      ),
      user: null,
    })

    const request = new NextRequest(`http://localhost/api/settings/classes/${classId}`, {
      method: 'DELETE',
    })

    const response = await DELETE(request, { params: Promise.resolve({ id: classId }) })
    const payload = await response.json()

    expect(response.status).toBe(401)
    expect(payload.success).toBe(false)
    expect(payload.error.code).toBe('UNAUTHORIZED')
  })
})
