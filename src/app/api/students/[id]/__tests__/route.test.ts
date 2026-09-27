import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  hasPermission: vi.fn(),
  createAuditLog: vi.fn(),

  studentFindFirst: vi.fn(),
  classFindFirst: vi.fn(),
  academicYearFindFirst: vi.fn(),
  attendanceGroupBy: vi.fn(),
  attendanceCount: vi.fn(),
  gradeAggregate: vi.fn(),
  gradeCount: vi.fn(),
  gradeFindMany: vi.fn(),
  feePaymentAggregate: vi.fn(),
  feePaymentCount: vi.fn(),
  feePaymentFindFirst: vi.fn(),
  auditLogFindMany: vi.fn(),
  transaction: vi.fn(),

  txStudentUpdate: vi.fn(),
  txUserUpdate: vi.fn(),
  txParentFindFirst: vi.fn(),
  txParentCreate: vi.fn(),
  txStudentParentCount: vi.fn(),
  txStudentParentUpdateMany: vi.fn(),
  txStudentParentFindFirst: vi.fn(),
  txStudentParentUpdate: vi.fn(),
  txStudentParentCreate: vi.fn(),
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
    student: {
      findFirst: mocks.studentFindFirst,
    },
    class: {
      findFirst: mocks.classFindFirst,
    },
    academicYear: {
      findFirst: mocks.academicYearFindFirst,
    },
    attendance: {
      groupBy: mocks.attendanceGroupBy,
      count: mocks.attendanceCount,
    },
    grade: {
      aggregate: mocks.gradeAggregate,
      count: mocks.gradeCount,
      findMany: mocks.gradeFindMany,
    },
    feePayment: {
      aggregate: mocks.feePaymentAggregate,
      count: mocks.feePaymentCount,
      findFirst: mocks.feePaymentFindFirst,
    },
    auditLog: {
      findMany: mocks.auditLogFindMany,
    },
    $transaction: mocks.transaction,
  },
}))

import { DELETE, GET, PATCH } from '../route'

const schoolId = 'school-1'
const classId = '11111111-1111-1111-1111-111111111111'
const yearId = '22222222-2222-2222-2222-222222222222'

function expectErrorShape(payload: unknown, code: string) {
  expect(payload).toEqual(
    expect.objectContaining({
      success: false,
      error: expect.objectContaining({
        code,
        message: expect.any(String),
      }),
    })
  )
}

function expectSuccessShape(payload: unknown) {
  expect(payload).toEqual(
    expect.objectContaining({
      success: true,
      data: expect.any(Object),
    })
  )
}

function buildStudentDetail(overrides?: Record<string, unknown>) {
  return {
    id: 'student-1',
    admission_number: 'ADM-1001',
    first_name: 'Aarav',
    last_name: 'Sharma',
    gender: 'MALE',
    date_of_birth: new Date('2011-06-10T00:00:00.000Z'),
    blood_group: null,
    phone: '9999999999',
    address: 'Hyderabad',
    emergency_contact_name: 'Ravi Sharma',
    emergency_contact_phone: '9999990000',
    photo_url: null,
    class_id: classId,
    class: {
      id: classId,
      name: 'Grade 6',
      section: 'A',
    },
    academic_year_id: yearId,
    academic_year: {
      id: yearId,
      name: '2025-2026',
    },
    admission_date: new Date('2025-06-01T00:00:00.000Z'),
    roll_number: '12',
    is_active: true,
    user: {
      id: 'user-student-1',
      email: 'aarav@example.com',
      is_active: true,
    },
    parents: [
      {
        is_primary: true,
        created_at: new Date('2025-06-01T00:00:00.000Z'),
        parent: {
          id: 'parent-1',
          first_name: 'Ravi',
          last_name: 'Sharma',
          relation: 'FATHER',
          email: 'ravi@example.com',
          phone: '9999990000',
        },
      },
    ],
    created_at: new Date('2025-06-01T00:00:00.000Z'),
    updated_at: new Date('2025-06-01T00:00:00.000Z'),
    ...overrides,
  }
}

describe('/api/students/[id] route', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mocks.auth.mockResolvedValue({
      user: {
        id: 'user-1',
        role: 'STUDENT_ADMIN',
        schoolId,
      },
    })
    mocks.hasPermission.mockResolvedValue(true)

    mocks.studentFindFirst.mockResolvedValue(buildStudentDetail())
    mocks.classFindFirst.mockResolvedValue({
      id: classId,
      academic_year_id: yearId,
    })
    mocks.academicYearFindFirst.mockResolvedValue({
      id: yearId,
    })

    mocks.attendanceGroupBy.mockResolvedValue([
      { status: 'PRESENT', _count: { _all: 20 } },
      { status: 'ABSENT', _count: { _all: 2 } },
      { status: 'LATE', _count: { _all: 1 } },
    ])
    mocks.attendanceCount.mockResolvedValue(23)
    mocks.gradeAggregate.mockResolvedValue({
      _avg: {
        marks_obtained: 84.5,
      },
    })
    mocks.gradeCount.mockResolvedValue(6)
    mocks.gradeFindMany.mockResolvedValue([{ exam_id: 'exam-1' }, { exam_id: 'exam-2' }])
    mocks.feePaymentAggregate.mockResolvedValue({
      _sum: {
        amount_paid: 45000,
      },
    })
    mocks.feePaymentCount.mockResolvedValue(4)
    mocks.feePaymentFindFirst.mockResolvedValue({
      payment_date: new Date('2025-12-10T00:00:00.000Z'),
      amount_paid: 12000,
      receipt_number: 'VBHS-2025-000123',
    })
    mocks.auditLogFindMany.mockResolvedValue([
      {
        id: 'audit-1',
        action: 'UPDATE',
        old_value: { class_id: 'old-class' },
        new_value: { class_id: classId },
        created_at: new Date('2025-12-10T00:00:00.000Z'),
        user: {
          email: 'admin@example.com',
          role: 'STUDENT_ADMIN',
        },
      },
    ])

    mocks.txStudentUpdate.mockResolvedValue({ id: 'student-1' })
    mocks.txUserUpdate.mockResolvedValue({ id: 'user-student-1' })
    mocks.txParentFindFirst.mockResolvedValue({ id: 'parent-1' })
    mocks.txParentCreate.mockResolvedValue({ id: 'parent-created-1' })
    mocks.txStudentParentCount.mockResolvedValue(0)
    mocks.txStudentParentUpdateMany.mockResolvedValue({ count: 0 })
    mocks.txStudentParentFindFirst.mockResolvedValue(null)
    mocks.txStudentParentUpdate.mockResolvedValue({ id: 'student-parent-link-1' })
    mocks.txStudentParentCreate.mockResolvedValue({ id: 'student-parent-link-1' })

    mocks.transaction.mockImplementation(async (input: unknown) => {
      if (Array.isArray(input)) {
        return Promise.all(input)
      }
      if (typeof input === 'function') {
        return (input as (tx: any) => unknown)({
          student: {
            update: mocks.txStudentUpdate,
          },
          user: {
            update: mocks.txUserUpdate,
          },
          parent: {
            findFirst: mocks.txParentFindFirst,
            create: mocks.txParentCreate,
          },
          studentParent: {
            count: mocks.txStudentParentCount,
            updateMany: mocks.txStudentParentUpdateMany,
            findFirst: mocks.txStudentParentFindFirst,
            update: mocks.txStudentParentUpdate,
            create: mocks.txStudentParentCreate,
          },
        })
      }
      return null
    })
  })

  it('GET returns 401 when user is not authenticated', async () => {
    mocks.auth.mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/students/student-1')
    const response = await GET(request, {
      params: Promise.resolve({ id: 'student-1' }),
    })
    const payload = await response.json()

    expect(response.status).toBe(401)
    expectErrorShape(payload, 'UNAUTHORIZED')
  })

  it('TEST-STU-003 GET returns detailed student payload with scoped aggregates', async () => {
    const request = new NextRequest('http://localhost/api/students/student-1')
    const response = await GET(request, {
      params: Promise.resolve({ id: 'student-1' }),
    })
    const payload = await response.json()

    expect(response.status).toBe(200)
    expectSuccessShape(payload)
    expect(payload.data.student).toEqual(
      expect.objectContaining({
        id: 'student-1',
        admission_number: 'ADM-1001',
        first_name: 'Aarav',
      })
    )
    expect(payload.data.summaries.attendance).toEqual(
      expect.objectContaining({
        total_records: 23,
        present: 20,
        absent: 2,
        late: 1,
      })
    )
    expect(payload.data.summaries.fees.latest_payment).toEqual(
      expect.objectContaining({
        receipt_number: 'VBHS-2025-000123',
      })
    )
    expect(payload.data.activity).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'audit-1',
          action: 'UPDATE',
          actor_email: 'admin@example.com',
        }),
      ])
    )

    expect(mocks.studentFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          school_id: schoolId,
          id: 'student-1',
        },
      })
    )
    expect(mocks.attendanceGroupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          school_id: schoolId,
          student_id: 'student-1',
        }),
      })
    )
  })

  it('GET returns 404 when student is outside school scope or not found', async () => {
    mocks.studentFindFirst.mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/students/student-1')
    const response = await GET(request, {
      params: Promise.resolve({ id: 'student-1' }),
    })
    const payload = await response.json()

    expect(response.status).toBe(404)
    expectErrorShape(payload, 'NOT_FOUND')
  })

  it('TEST-STU-004 PATCH updates student and writes audit log', async () => {
    mocks.studentFindFirst
      .mockResolvedValueOnce({
        id: 'student-1',
        admission_number: 'ADM-1001',
        first_name: 'Aarav',
        last_name: 'Sharma',
        class_id: classId,
        academic_year_id: yearId,
        is_active: true,
      })
      .mockResolvedValueOnce(
        buildStudentDetail({
          first_name: 'Aarush',
        })
      )

    const request = new NextRequest('http://localhost/api/students/student-1', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': '10.0.0.11',
        'user-agent': 'vitest-agent',
      },
      body: JSON.stringify({
        first_name: 'Aarush',
      }),
    })

    const response = await PATCH(request, {
      params: Promise.resolve({ id: 'student-1' }),
    })
    const payload = await response.json()

    expect(response.status).toBe(200)
    expectSuccessShape(payload)
    expect(payload.data.student.first_name).toBe('Aarush')
    expect(mocks.txStudentUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'student-1',
        },
        data: expect.objectContaining({
          first_name: 'Aarush',
        }),
      })
    )
    expect(mocks.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        school_id: schoolId,
        user_id: 'user-1',
        action: 'UPDATE',
        entity_type: 'student',
        entity_id: 'student-1',
        ip_address: '10.0.0.11',
        user_agent: 'vitest-agent',
      })
    )
  })

  it('PATCH returns 409 for duplicate admission number in same school', async () => {
    mocks.studentFindFirst
      .mockResolvedValueOnce({
        id: 'student-1',
        admission_number: 'ADM-1001',
        first_name: 'Aarav',
        last_name: 'Sharma',
        class_id: classId,
        academic_year_id: yearId,
        is_active: true,
      })
      .mockResolvedValueOnce({
        id: 'student-2',
      })

    const request = new NextRequest('http://localhost/api/students/student-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        admission_number: 'ADM-DUP',
      }),
    })

    const response = await PATCH(request, {
      params: Promise.resolve({ id: 'student-1' }),
    })
    const payload = await response.json()

    expect(response.status).toBe(409)
    expectErrorShape(payload, 'DUPLICATE_ADMISSION_NUMBER')
  })

  it('PATCH returns 401 for missing session', async () => {
    mocks.auth.mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/students/student-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        first_name: 'Aarush',
      }),
    })

    const response = await PATCH(request, {
      params: Promise.resolve({ id: 'student-1' }),
    })
    const payload = await response.json()

    expect(response.status).toBe(401)
    expectErrorShape(payload, 'UNAUTHORIZED')
  })

  it('TEST-STU-005 DELETE blocks non-principal roles', async () => {
    mocks.auth.mockResolvedValue({
      user: {
        id: 'user-1',
        role: 'STUDENT_ADMIN',
        schoolId,
      },
    })

    const request = new NextRequest('http://localhost/api/students/student-1', {
      method: 'DELETE',
    })

    const response = await DELETE(request, {
      params: Promise.resolve({ id: 'student-1' }),
    })
    const payload = await response.json()

    expect(response.status).toBe(403)
    expectErrorShape(payload, 'FORBIDDEN')
  })

  it('TEST-NEG-014: DELETE soft-deactivates student and linked user with audit log', async () => {
    mocks.auth.mockResolvedValue({
      user: {
        id: 'principal-1',
        role: 'PRINCIPAL',
        schoolId,
      },
    })

    mocks.studentFindFirst.mockResolvedValue({
      id: 'student-1',
      is_active: true,
      user_id: 'user-student-1',
      admission_number: 'ADM-1001',
      first_name: 'Aarav',
      last_name: 'Sharma',
    })

    const request = new NextRequest('http://localhost/api/students/student-1', {
      method: 'DELETE',
      headers: {
        'x-forwarded-for': '10.0.0.21',
        'user-agent': 'vitest-agent',
      },
    })

    const response = await DELETE(request, {
      params: Promise.resolve({ id: 'student-1' }),
    })
    const payload = await response.json()

    expect(response.status).toBe(200)
    expectSuccessShape(payload)
    expect(payload.data.message).toContain('deactivated')
    expect(mocks.studentFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'student-1',
          school_id: schoolId,
        },
      })
    )
    expect(mocks.txStudentUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'student-1',
        },
        data: {
          is_active: false,
        },
      })
    )
    expect(mocks.txUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'user-student-1',
        },
        data: {
          is_active: false,
        },
      })
    )
    expect(mocks.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        school_id: schoolId,
        user_id: 'principal-1',
        action: 'DELETE',
        entity_type: 'student',
        entity_id: 'student-1',
        ip_address: '10.0.0.21',
        user_agent: 'vitest-agent',
      })
    )
  })

  it('DELETE returns 401 when session is missing', async () => {
    mocks.auth.mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/students/student-1', {
      method: 'DELETE',
    })

    const response = await DELETE(request, {
      params: Promise.resolve({ id: 'student-1' }),
    })
    const payload = await response.json()

    expect(response.status).toBe(401)
    expectErrorShape(payload, 'UNAUTHORIZED')
  })
})
