import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  hasPermission: vi.fn(),
  createAuditLog: vi.fn(),
  attendanceFindUnique: vi.fn(),
  attendanceUpdate: vi.fn(),
  attendanceDelete: vi.fn(),
  staffFindFirst: vi.fn(),
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
    attendance: {
      findUnique: mocks.attendanceFindUnique,
      update: mocks.attendanceUpdate,
      delete: mocks.attendanceDelete,
    },
    staff: {
      findFirst: mocks.staffFindFirst,
    },
  },
}))

import { DELETE, PATCH } from '../route'

const schoolId = 'school-1'
const userId = 'principal-1'
const attendanceId = 'att-1'

function patchRequest(body: unknown) {
  return new NextRequest(`http://localhost/api/admin/attendance/${attendanceId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('/api/admin/attendance/[id] PATCH', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mocks.auth.mockResolvedValue({
      user: {
        id: userId,
        role: 'PRINCIPAL',
        schoolId,
      },
    })
    mocks.hasPermission.mockResolvedValue(true)
    mocks.attendanceFindUnique.mockResolvedValue({
      id: attendanceId,
      school_id: schoolId,
      student_id: 'student-1',
      class_id: 'class-1',
      status: 'PRESENT',
      remarks: null,
    })
    mocks.staffFindFirst.mockResolvedValue({
      id: 'staff-principal',
    })
    mocks.attendanceUpdate.mockResolvedValue({
      id: attendanceId,
      school_id: schoolId,
      student_id: 'student-1',
      class_id: 'class-1',
      status: 'ABSENT',
      remarks: 'Sick',
    })
  })

  it('TEST-ADM-ATT-004 updates a single attendance record using async params', async () => {
    const response = await PATCH(patchRequest({ status: 'ABSENT', remarks: 'Sick' }), {
      params: Promise.resolve({ id: attendanceId }),
    })
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toMatchObject({
      success: true,
      data: {
        message: 'Attendance record updated successfully',
        data: {
          id: attendanceId,
          status: 'ABSENT',
          remarks: 'Sick',
        },
      },
    })
    expect(mocks.attendanceUpdate).toHaveBeenCalledWith({
      where: {
        id: attendanceId,
      },
      data: expect.objectContaining({
        status: 'ABSENT',
        remarks: 'Sick',
        marked_by: 'staff-principal',
        updated_at: expect.any(Date),
      }),
    })
  })

  it('TEST-ADM-ATT-009 writes an audit log on update', async () => {
    await PATCH(patchRequest({ status: 'ABSENT' }), {
      params: Promise.resolve({ id: attendanceId }),
    })

    expect(mocks.createAuditLog).toHaveBeenCalledWith({
      school_id: schoolId,
      user_id: userId,
      action: 'UPDATE',
      entity_type: 'ATTENDANCE',
      entity_id: attendanceId,
      old_value: expect.objectContaining({
        id: attendanceId,
        status: 'PRESENT',
      }),
      new_value: expect.objectContaining({
        id: attendanceId,
        status: 'ABSENT',
      }),
    })
  })

  it('TEST-ADM-ATT-010 scopes the lookup by school_id before update', async () => {
    await PATCH(patchRequest({ remarks: 'Corrected' }), {
      params: Promise.resolve({ id: attendanceId }),
    })

    expect(mocks.attendanceFindUnique).toHaveBeenCalledWith({
      where: {
        id: attendanceId,
        school_id: schoolId,
      },
    })
    expect(mocks.staffFindFirst).toHaveBeenCalledWith({
      where: {
        user_id: userId,
        school_id: schoolId,
      },
    })
  })

  it('returns 400 when no editable fields are provided', async () => {
    const response = await PATCH(patchRequest({}), {
      params: Promise.resolve({ id: attendanceId }),
    })
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.success).toBe(false)
    expect(payload.error.code).toBe('INVALID_PARAMS')
  })

  it('returns 401 when the session is missing', async () => {
    mocks.auth.mockResolvedValue(null)

    const response = await PATCH(patchRequest({ status: 'ABSENT' }), {
      params: Promise.resolve({ id: attendanceId }),
    })
    const payload = await response.json()

    expect(response.status).toBe(401)
    expect(payload.success).toBe(false)
    expect(payload.error.code).toBe('UNAUTHORIZED')
  })

  it('returns 403 without ATTENDANCE.edit permission', async () => {
    mocks.hasPermission.mockResolvedValue(false)

    const response = await PATCH(patchRequest({ status: 'ABSENT' }), {
      params: Promise.resolve({ id: attendanceId }),
    })
    const payload = await response.json()

    expect(response.status).toBe(403)
    expect(payload.success).toBe(false)
    expect(payload.error.code).toBe('FORBIDDEN')
  })
})

describe('/api/admin/attendance/[id] DELETE', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mocks.auth.mockResolvedValue({
      user: {
        id: userId,
        role: 'PRINCIPAL',
        schoolId,
      },
    })
    mocks.hasPermission.mockResolvedValue(true)
    mocks.attendanceFindUnique.mockResolvedValue({
      id: attendanceId,
      school_id: schoolId,
      student_id: 'student-1',
      class_id: 'class-1',
      status: 'PRESENT',
      remarks: null,
    })
    mocks.attendanceDelete.mockResolvedValue({
      id: attendanceId,
    })
  })

  it('TEST-ADM-ATT-005 lets a principal delete an attendance record using async params', async () => {
    const response = await DELETE(new NextRequest(`http://localhost/api/admin/attendance/${attendanceId}`), {
      params: Promise.resolve({ id: attendanceId }),
    })
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual({
      success: true,
      data: {
        message: 'Attendance record deleted successfully',
      },
    })
    expect(mocks.attendanceDelete).toHaveBeenCalledWith({
      where: {
        id: attendanceId,
      },
    })
  })

  it('TEST-ADM-ATT-009 writes an audit log on delete', async () => {
    await DELETE(new NextRequest(`http://localhost/api/admin/attendance/${attendanceId}`), {
      params: Promise.resolve({ id: attendanceId }),
    })

    expect(mocks.createAuditLog).toHaveBeenCalledWith({
      school_id: schoolId,
      user_id: userId,
      action: 'DELETE',
      entity_type: 'ATTENDANCE',
      entity_id: attendanceId,
      old_value: expect.objectContaining({
        id: attendanceId,
        status: 'PRESENT',
      }),
    })
  })

  it('TEST-ADM-ATT-010 scopes the lookup by school_id before delete', async () => {
    await DELETE(new NextRequest(`http://localhost/api/admin/attendance/${attendanceId}`), {
      params: Promise.resolve({ id: attendanceId }),
    })

    expect(mocks.attendanceFindUnique).toHaveBeenCalledWith({
      where: {
        id: attendanceId,
        school_id: schoolId,
      },
    })
  })

  it('returns 401 when the session is missing', async () => {
    mocks.auth.mockResolvedValue(null)

    const response = await DELETE(new NextRequest(`http://localhost/api/admin/attendance/${attendanceId}`), {
      params: Promise.resolve({ id: attendanceId }),
    })
    const payload = await response.json()

    expect(response.status).toBe(401)
    expect(payload.success).toBe(false)
    expect(payload.error.code).toBe('UNAUTHORIZED')
  })

  it('returns 403 for a non-principal role without delete permission', async () => {
    mocks.auth.mockResolvedValue({
      user: {
        id: 'staff-admin-1',
        role: 'STAFF_ADMIN',
        schoolId,
      },
    })
    mocks.hasPermission.mockResolvedValue(false)

    const response = await DELETE(new NextRequest(`http://localhost/api/admin/attendance/${attendanceId}`), {
      params: Promise.resolve({ id: attendanceId }),
    })
    const payload = await response.json()

    expect(response.status).toBe(403)
    expect(payload.success).toBe(false)
    expect(payload.error.code).toBe('FORBIDDEN')
    expect(mocks.attendanceDelete).not.toHaveBeenCalled()
  })
})
