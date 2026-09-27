import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  hasPermission: vi.fn(),
  createAuditLog: vi.fn(),
  classFindFirst: vi.fn(),
  studentFindMany: vi.fn(),
  attendanceFindMany: vi.fn(),
  staffFindFirst: vi.fn(),
  transaction: vi.fn(),
  txAttendanceFindUnique: vi.fn(),
  txAttendanceCreate: vi.fn(),
  txAttendanceUpdate: vi.fn(),
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
    class: {
      findFirst: mocks.classFindFirst,
    },
    student: {
      findMany: mocks.studentFindMany,
    },
    attendance: {
      findMany: mocks.attendanceFindMany,
    },
    staff: {
      findFirst: mocks.staffFindFirst,
    },
    $transaction: mocks.transaction,
  },
}))

import { GET, POST } from '../route'

const schoolId = 'school-1'
const userId = 'user-1'
const classId = 'class-1'
const attendanceDate = '2026-05-26'

function jsonRequest(url: string, body: unknown) {
  return new NextRequest(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('/api/admin/attendance GET', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mocks.auth.mockResolvedValue({
      user: {
        id: userId,
        role: 'STUDENT_ADMIN',
        schoolId,
      },
    })

    mocks.hasPermission.mockImplementation(async (_schoolId: string, _role: string, permission: string) => {
      return permission === 'ATTENDANCE.view_all'
    })

    mocks.classFindFirst.mockResolvedValue({
      id: classId,
      name: 'Grade 6',
      section: 'A',
      _count: {
        students: 2,
      },
    })

    mocks.studentFindMany.mockResolvedValue([
      {
        id: 'student-1',
        first_name: 'Rahul',
        last_name: 'Sharma',
        roll_number: '01',
        photo_url: null,
      },
      {
        id: 'student-2',
        first_name: 'Meera',
        last_name: 'Iyer',
        roll_number: '02',
        photo_url: '/meera.jpg',
      },
    ])

    mocks.attendanceFindMany.mockResolvedValue([
      {
        id: 'att-1',
        school_id: schoolId,
        student_id: 'student-1',
        class_id: classId,
        date: new Date(attendanceDate),
        status: 'PRESENT',
        remarks: 'On time',
      },
    ])
  })

  it('TEST-ADM-ATT-001 returns class student records by class and date', async () => {
    const response = await GET(
      new NextRequest(`http://localhost/api/admin/attendance?class_id=${classId}&date=${attendanceDate}`)
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toMatchObject({
      success: true,
      data: {
        class: {
          id: classId,
          name: 'Grade 6',
          section: 'A',
          total_students: 2,
        },
        date: attendanceDate,
        is_marked: true,
        summary: {
          present: 1,
          absent: 0,
          late: 0,
          half_day: 0,
          not_marked: 1,
        },
      },
    })
    expect(payload.data.records).toEqual([
      {
        student_id: 'student-1',
        student_name: 'Rahul Sharma',
        roll_number: '01',
        photo_url: null,
        status: 'PRESENT',
        remarks: 'On time',
        id: 'att-1',
      },
      {
        student_id: 'student-2',
        student_name: 'Meera Iyer',
        roll_number: '02',
        photo_url: '/meera.jpg',
        status: null,
        remarks: null,
        id: null,
      },
    ])
  })

  it('TEST-ADM-ATT-010 scopes class, student, and attendance queries by school_id', async () => {
    await GET(new NextRequest(`http://localhost/api/admin/attendance?class_id=${classId}&date=${attendanceDate}`))

    expect(mocks.classFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: classId,
          school_id: schoolId,
        },
      })
    )
    expect(mocks.studentFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          school_id: schoolId,
          class_id: classId,
          is_active: true,
        },
      })
    )
    expect(mocks.attendanceFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          school_id: schoolId,
          class_id: classId,
          date: expect.any(Date),
        },
      })
    )
  })

  it('TEST-ADM-ATT-011 returns 400 when class_id or date is missing', async () => {
    const response = await GET(new NextRequest(`http://localhost/api/admin/attendance?class_id=${classId}`))
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload).toEqual({
      success: false,
      error: {
        code: 'INVALID_PARAMS',
        message: 'class_id and date are required',
      },
    })
  })

  it('returns 400 for invalid date format', async () => {
    const response = await GET(new NextRequest(`http://localhost/api/admin/attendance?class_id=${classId}&date=nope`))
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.success).toBe(false)
    expect(payload.error.code).toBe('INVALID_DATE')
  })

  it('returns 401 when the session is missing', async () => {
    mocks.auth.mockResolvedValue(null)

    const response = await GET(
      new NextRequest(`http://localhost/api/admin/attendance?class_id=${classId}&date=${attendanceDate}`)
    )
    const payload = await response.json()

    expect(response.status).toBe(401)
    expect(payload.success).toBe(false)
    expect(payload.error.code).toBe('UNAUTHORIZED')
  })

  it('returns 403 when no attendance view permission is granted', async () => {
    mocks.hasPermission.mockResolvedValue(false)

    const response = await GET(
      new NextRequest(`http://localhost/api/admin/attendance?class_id=${classId}&date=${attendanceDate}`)
    )
    const payload = await response.json()

    expect(response.status).toBe(403)
    expect(payload.success).toBe(false)
    expect(payload.error.code).toBe('FORBIDDEN')
  })
})

describe('/api/admin/attendance POST', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mocks.auth.mockResolvedValue({
      user: {
        id: userId,
        role: 'TEACHER',
        schoolId,
      },
    })

    mocks.hasPermission.mockResolvedValue(true)
    mocks.staffFindFirst.mockResolvedValue({
      id: 'staff-1',
    })

    mocks.txAttendanceFindUnique.mockReset()
    mocks.txAttendanceCreate.mockReset()
    mocks.txAttendanceUpdate.mockReset()

    mocks.transaction.mockImplementation(async (callback: any) => {
      return callback({
        attendance: {
          findUnique: mocks.txAttendanceFindUnique,
          create: mocks.txAttendanceCreate,
          update: mocks.txAttendanceUpdate,
        },
      })
    })
  })

  it('TEST-ADM-ATT-002 bulk creates and updates attendance records', async () => {
    mocks.txAttendanceFindUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({
      id: 'att-existing',
      school_id: schoolId,
      student_id: 'student-2',
      class_id: classId,
      date: new Date(attendanceDate),
      status: 'ABSENT',
      remarks: 'Sick',
    })
    mocks.txAttendanceCreate.mockResolvedValue({
      id: 'att-new',
    })
    mocks.txAttendanceUpdate.mockResolvedValue({
      id: 'att-existing',
      status: 'PRESENT',
      remarks: null,
    })

    const response = await POST(
      jsonRequest('http://localhost/api/admin/attendance', {
        class_id: classId,
        date: attendanceDate,
        records: [
          {
            student_id: 'student-1',
            status: 'PRESENT',
            remarks: 'On time',
          },
          {
            student_id: 'student-2',
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
        message: 'Attendance marked successfully',
        updated_count: 2,
      },
    })
    expect(mocks.txAttendanceCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        school_id: schoolId,
        class_id: classId,
        student_id: 'student-1',
        status: 'PRESENT',
        marked_by: 'staff-1',
      }),
    })
    expect(mocks.txAttendanceUpdate).toHaveBeenCalledWith({
      where: {
        id: 'att-existing',
      },
      data: expect.objectContaining({
        status: 'PRESENT',
        remarks: null,
        marked_by: 'staff-1',
      }),
    })
  })

  it('TEST-ADM-ATT-009 writes an audit log for each created or updated record', async () => {
    mocks.txAttendanceFindUnique.mockResolvedValue(null)
    mocks.txAttendanceCreate.mockResolvedValueOnce({ id: 'att-1' }).mockResolvedValueOnce({ id: 'att-2' })

    await POST(
      jsonRequest('http://localhost/api/admin/attendance', {
        class_id: classId,
        date: attendanceDate,
        records: [
          {
            student_id: 'student-1',
            status: 'PRESENT',
          },
          {
            student_id: 'student-2',
            status: 'ABSENT',
            remarks: 'Sick',
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
        entity_type: 'ATTENDANCE',
        entity_id: 'att-1',
        old_value: undefined,
        new_value: expect.objectContaining({
          school_id: schoolId,
          student_id: 'student-1',
          class_id: classId,
          status: 'PRESENT',
        }),
      })
    )
  })

  it('TEST-ADM-ATT-010 scopes duplicate checks by school_id, student_id, and date', async () => {
    mocks.txAttendanceFindUnique.mockResolvedValue(null)
    mocks.txAttendanceCreate.mockResolvedValue({ id: 'att-new' })

    await POST(
      jsonRequest('http://localhost/api/admin/attendance', {
        class_id: classId,
        date: attendanceDate,
        records: [
          {
            student_id: 'student-1',
            status: 'PRESENT',
          },
        ],
      })
    )

    expect(mocks.txAttendanceFindUnique).toHaveBeenCalledWith({
      where: {
        school_id_student_id_date: {
          school_id: schoolId,
          student_id: 'student-1',
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

  it('TEST-NEG-018 / TEST-ADM-ATT-008 returns 409 when the attendance unique constraint is hit during create', async () => {
    const uniqueError = Object.assign(
      new Error('Unique constraint failed on the fields: (`school_id`,`student_id`,`date`)'),
      { code: 'P2002' }
    )
    mocks.txAttendanceFindUnique.mockResolvedValue(null)
    mocks.txAttendanceCreate.mockRejectedValue(uniqueError)

    const response = await POST(
      jsonRequest('http://localhost/api/admin/attendance', {
        class_id: classId,
        date: attendanceDate,
        records: [
          {
            student_id: 'student-1',
            status: 'PRESENT',
          },
        ],
      })
    )
    const payload = await response.json()

    expect(response.status).toBe(409)
    expect(payload).toEqual({
      success: false,
      error: {
        code: 'DUPLICATE_ATTENDANCE',
        message: 'Attendance was already marked for one or more selected students',
      },
    })
  })

  it('returns 400 when required bulk mark fields are missing', async () => {
    const response = await POST(
      jsonRequest('http://localhost/api/admin/attendance', {
        class_id: classId,
        date: attendanceDate,
      })
    )
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.success).toBe(false)
    expect(payload.error.code).toBe('INVALID_PARAMS')
  })

  it('returns 400 when trying to mark a future date', async () => {
    const response = await POST(
      jsonRequest('http://localhost/api/admin/attendance', {
        class_id: classId,
        date: '2999-01-01',
        records: [
          {
            student_id: 'student-1',
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
      jsonRequest('http://localhost/api/admin/attendance', {
        class_id: classId,
        date: attendanceDate,
        records: [],
      })
    )
    const payload = await response.json()

    expect(response.status).toBe(401)
    expect(payload.success).toBe(false)
    expect(payload.error.code).toBe('UNAUTHORIZED')
  })

  it('returns 403 without attendance mark permission', async () => {
    mocks.hasPermission.mockResolvedValue(false)

    const response = await POST(
      jsonRequest('http://localhost/api/admin/attendance', {
        class_id: classId,
        date: attendanceDate,
        records: [],
      })
    )
    const payload = await response.json()

    expect(response.status).toBe(403)
    expect(payload.success).toBe(false)
    expect(payload.error.code).toBe('FORBIDDEN')
  })
})
