import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  createAuditLog: vi.fn(),
  staffFindMany: vi.fn(),
  staffFindFirst: vi.fn(),
  staffAttendanceFindMany: vi.fn(),
  transaction: vi.fn(),
  txStaffAttendanceFindUnique: vi.fn(),
  txStaffAttendanceCreate: vi.fn(),
  txStaffAttendanceUpdate: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  auth: mocks.auth,
}))

vi.mock('@/lib/audit', () => ({
  createAuditLog: mocks.createAuditLog,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    staff: {
      findMany: mocks.staffFindMany,
      findFirst: mocks.staffFindFirst,
    },
    staffAttendance: {
      findMany: mocks.staffAttendanceFindMany,
    },
    $transaction: mocks.transaction,
  },
}))

import { GET, POST } from '../route'

const schoolId = 'school-1'
const userId = 'staff-admin-1'
const date = '2026-05-26'

function postRequest(body: unknown) {
  return new NextRequest('http://localhost/api/admin/staff-attendance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('/api/admin/staff-attendance GET', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mocks.auth.mockResolvedValue({
      user: {
        id: userId,
        role: 'STAFF_ADMIN',
        schoolId,
      },
    })
    mocks.staffFindMany.mockResolvedValue([
      {
        id: 'staff-1',
        employee_code: 'EMP001',
        first_name: 'Anita',
        last_name: 'Rao',
        department: 'Science',
        designation: 'Teacher',
        photo_url: null,
      },
      {
        id: 'staff-2',
        employee_code: 'EMP002',
        first_name: 'Mohan',
        last_name: 'Das',
        department: 'Admin',
        designation: 'Clerk',
        photo_url: '/mohan.jpg',
      },
    ])
    mocks.staffAttendanceFindMany.mockResolvedValue([
      {
        id: 'staff-att-1',
        staff_id: 'staff-1',
        status: 'PRESENT',
        check_in: new Date('2026-05-26T09:00:00.000Z'),
        check_out: new Date('2026-05-26T15:30:00.000Z'),
        remarks: 'Assembly duty',
      },
    ])
  })

  it('TEST-ADM-ATT-006 returns staff attendance records for a date', async () => {
    const response = await GET(
      new NextRequest(`http://localhost/api/admin/staff-attendance?date=${date}&department=Science`)
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toMatchObject({
      success: true,
      data: {
        date,
        records: [
          {
            staff_id: 'staff-1',
            employee_code: 'EMP001',
            name: 'Anita Rao',
            department: 'Science',
            designation: 'Teacher',
            photo_url: null,
            status: 'PRESENT',
            check_in: '2026-05-26T09:00:00.000Z',
            check_out: '2026-05-26T15:30:00.000Z',
            remarks: 'Assembly duty',
            id: 'staff-att-1',
          },
          {
            staff_id: 'staff-2',
            employee_code: 'EMP002',
            name: 'Mohan Das',
            department: 'Admin',
            designation: 'Clerk',
            photo_url: '/mohan.jpg',
            status: null,
            check_in: null,
            check_out: null,
            remarks: null,
            id: null,
          },
        ],
      },
    })
  })

  it('TEST-ADM-ATT-010 scopes staff and staff_attendance queries by school_id', async () => {
    await GET(new NextRequest(`http://localhost/api/admin/staff-attendance?date=${date}&department=Science`))

    expect(mocks.staffFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          school_id: schoolId,
          is_active: true,
          department: 'Science',
        },
      })
    )
    expect(mocks.staffAttendanceFindMany).toHaveBeenCalledWith({
      where: {
        school_id: schoolId,
        date: expect.any(Date),
      },
    })
  })

  it('returns 400 when date is missing', async () => {
    const response = await GET(new NextRequest('http://localhost/api/admin/staff-attendance'))
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.success).toBe(false)
    expect(payload.error.code).toBe('INVALID_PARAMS')
  })

  it('returns 401 when the session is missing', async () => {
    mocks.auth.mockResolvedValue(null)

    const response = await GET(new NextRequest(`http://localhost/api/admin/staff-attendance?date=${date}`))
    const payload = await response.json()

    expect(response.status).toBe(401)
    expect(payload.success).toBe(false)
    expect(payload.error.code).toBe('UNAUTHORIZED')
  })

  it('returns 403 for roles outside STAFF_ADMIN and PRINCIPAL', async () => {
    mocks.auth.mockResolvedValue({
      user: {
        id: 'teacher-1',
        role: 'TEACHER',
        schoolId,
      },
    })

    const response = await GET(new NextRequest(`http://localhost/api/admin/staff-attendance?date=${date}`))
    const payload = await response.json()

    expect(response.status).toBe(403)
    expect(payload.success).toBe(false)
    expect(payload.error.code).toBe('FORBIDDEN')
  })
})

describe('/api/admin/staff-attendance POST', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mocks.auth.mockResolvedValue({
      user: {
        id: userId,
        role: 'STAFF_ADMIN',
        schoolId,
      },
    })
    mocks.staffFindFirst.mockResolvedValue({
      id: 'staff-admin-record',
    })

    mocks.txStaffAttendanceFindUnique.mockReset()
    mocks.txStaffAttendanceCreate.mockReset()
    mocks.txStaffAttendanceUpdate.mockReset()

    mocks.transaction.mockImplementation(async (callback: any) => {
      return callback({
        staffAttendance: {
          findUnique: mocks.txStaffAttendanceFindUnique,
          create: mocks.txStaffAttendanceCreate,
          update: mocks.txStaffAttendanceUpdate,
        },
      })
    })
  })

  it('TEST-ADM-ATT-007 creates and updates staff attendance records', async () => {
    mocks.txStaffAttendanceFindUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({
      id: 'staff-att-existing',
      staff_id: 'staff-2',
      status: 'ABSENT',
      check_in: null,
      check_out: null,
      remarks: 'Sick',
    })
    mocks.txStaffAttendanceCreate.mockResolvedValue({
      id: 'staff-att-new',
    })
    mocks.txStaffAttendanceUpdate.mockResolvedValue({
      id: 'staff-att-existing',
    })

    const response = await POST(
      postRequest({
        date,
        records: [
          {
            staff_id: 'staff-1',
            status: 'PRESENT',
            check_in: '2026-05-26T09:00:00.000Z',
            check_out: '2026-05-26T15:30:00.000Z',
            remarks: 'Assembly duty',
          },
          {
            staff_id: 'staff-2',
            status: 'PRESENT',
            remarks: null,
          },
        ],
      })
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual({
      success: true,
      data: {
        message: 'Staff attendance marked successfully',
        updated_count: 2,
      },
    })
    expect(mocks.txStaffAttendanceCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        school_id: schoolId,
        staff_id: 'staff-1',
        status: 'PRESENT',
        check_in: expect.any(Date),
        check_out: expect.any(Date),
        remarks: 'Assembly duty',
      }),
    })
    expect(mocks.txStaffAttendanceUpdate).toHaveBeenCalledWith({
      where: {
        id: 'staff-att-existing',
      },
      data: expect.objectContaining({
        status: 'PRESENT',
        remarks: null,
      }),
    })
  })

  it('TEST-ADM-ATT-009 writes an audit log for each staff attendance change', async () => {
    mocks.txStaffAttendanceFindUnique.mockResolvedValue(null)
    mocks.txStaffAttendanceCreate.mockResolvedValueOnce({ id: 'staff-att-1' }).mockResolvedValueOnce({
      id: 'staff-att-2',
    })

    await POST(
      postRequest({
        date,
        records: [
          {
            staff_id: 'staff-1',
            status: 'PRESENT',
          },
          {
            staff_id: 'staff-2',
            status: 'LEAVE',
            remarks: 'Approved leave',
          },
        ],
      })
    )

    expect(mocks.createAuditLog).toHaveBeenCalledTimes(2)
    expect(mocks.createAuditLog).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        school_id: schoolId,
        user_id: userId,
        action: 'CREATE',
        entity_type: 'STAFF_ATTENDANCE',
        entity_id: 'staff-att-1',
        old_value: undefined,
        new_value: expect.objectContaining({
          school_id: schoolId,
          staff_id: 'staff-1',
          status: 'PRESENT',
        }),
      })
    )
  })

  it('TEST-ADM-ATT-010 scopes staff duplicate checks by school_id, staff_id, and date', async () => {
    mocks.txStaffAttendanceFindUnique.mockResolvedValue(null)
    mocks.txStaffAttendanceCreate.mockResolvedValue({
      id: 'staff-att-1',
    })

    await POST(
      postRequest({
        date,
        records: [
          {
            staff_id: 'staff-1',
            status: 'PRESENT',
          },
        ],
      })
    )

    expect(mocks.txStaffAttendanceFindUnique).toHaveBeenCalledWith({
      where: {
        school_id_staff_id_date: {
          school_id: schoolId,
          staff_id: 'staff-1',
          date: expect.any(Date),
        },
      },
    })
    expect(mocks.staffFindFirst).toHaveBeenCalledWith({
      where: {
        user_id: userId,
        school_id: schoolId,
      },
    })
  })

  it('returns 400 when date or records are missing', async () => {
    const response = await POST(
      postRequest({
        date,
      })
    )
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.success).toBe(false)
    expect(payload.error.code).toBe('INVALID_PARAMS')
  })

  it('returns 400 when trying to mark a future date', async () => {
    const response = await POST(
      postRequest({
        date: '2999-01-01',
        records: [
          {
            staff_id: 'staff-1',
            status: 'PRESENT',
          },
        ],
      })
    )
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.success).toBe(false)
    expect(payload.error.code).toBe('FUTURE_DATE')
  })

  it('returns 401 when the session is missing', async () => {
    mocks.auth.mockResolvedValue(null)

    const response = await POST(
      postRequest({
        date,
        records: [],
      })
    )
    const payload = await response.json()

    expect(response.status).toBe(401)
    expect(payload.success).toBe(false)
    expect(payload.error.code).toBe('UNAUTHORIZED')
  })

  it('returns 403 for roles outside STAFF_ADMIN and PRINCIPAL', async () => {
    mocks.auth.mockResolvedValue({
      user: {
        id: 'teacher-1',
        role: 'TEACHER',
        schoolId,
      },
    })

    const response = await POST(
      postRequest({
        date,
        records: [],
      })
    )
    const payload = await response.json()

    expect(response.status).toBe(403)
    expect(payload.success).toBe(false)
    expect(payload.error.code).toBe('FORBIDDEN')
  })
})
