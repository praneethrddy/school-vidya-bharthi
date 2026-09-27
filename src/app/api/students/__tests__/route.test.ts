import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  hasPermission: vi.fn(),
  createAuditLog: vi.fn(),
  generatePassword: vi.fn(),
  bcryptHash: vi.fn(),

  parentFindMany: vi.fn(),
  studentCount: vi.fn(),
  studentFindMany: vi.fn(),
  studentFindFirst: vi.fn(),
  classFindMany: vi.fn(),
  classFindFirst: vi.fn(),
  academicYearFindMany: vi.fn(),
  academicYearFindFirst: vi.fn(),
  userFindFirst: vi.fn(),
  transaction: vi.fn(),

  txUserCreate: vi.fn(),
  txStudentCreate: vi.fn(),
  txParentFindFirst: vi.fn(),
  txParentCreate: vi.fn(),
  txStudentParentUpdateMany: vi.fn(),
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

vi.mock('@/lib/utils', () => ({
  generatePassword: mocks.generatePassword,
}))

vi.mock('bcryptjs', () => ({
  default: {
    hash: mocks.bcryptHash,
  },
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    parent: {
      findMany: mocks.parentFindMany,
    },
    student: {
      count: mocks.studentCount,
      findMany: mocks.studentFindMany,
      findFirst: mocks.studentFindFirst,
    },
    class: {
      findMany: mocks.classFindMany,
      findFirst: mocks.classFindFirst,
    },
    academicYear: {
      findMany: mocks.academicYearFindMany,
      findFirst: mocks.academicYearFindFirst,
    },
    user: {
      findFirst: mocks.userFindFirst,
    },
    $transaction: mocks.transaction,
  },
}))

import { GET, POST } from '../route'

const schoolId = 'school-1'
const classId = '11111111-1111-1111-1111-111111111111'
const yearId = '22222222-2222-2222-2222-222222222222'
const parentId = '33333333-3333-3333-3333-333333333333'

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

function buildCreatedStudent(overrides?: Record<string, unknown>) {
  return {
    id: 'student-created-id',
    admission_number: 'ADM-2001',
    first_name: 'Aarav',
    last_name: 'Sharma',
    gender: 'MALE',
    date_of_birth: new Date('2011-06-10T00:00:00.000Z'),
    blood_group: null,
    phone: '9999999999',
    address: 'Hyderabad',
    emergency_contact_name: null,
    emergency_contact_phone: null,
    photo_url: null,
    class_id: classId,
    class: { id: classId, name: 'Grade 6', section: 'A' },
    academic_year_id: yearId,
    academic_year: { id: yearId, name: '2025-2026' },
    admission_date: new Date('2025-06-01T00:00:00.000Z'),
    roll_number: null,
    is_active: true,
    user: { id: 'user-student-1', email: 'aarav@example.com', is_active: true },
    parents: [
      {
        created_at: new Date('2025-06-01T00:00:00.000Z'),
        is_primary: true,
        parent: {
          id: parentId,
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

describe('/api/students route', () => {
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
    mocks.generatePassword.mockReturnValue('Auto@Pass123')
    mocks.bcryptHash.mockResolvedValue('hashed-password')

    mocks.parentFindMany.mockResolvedValue([])
    mocks.studentCount.mockResolvedValue(1)
    mocks.studentFindMany.mockResolvedValue([
      {
        id: 'student-1',
        admission_number: 'ADM-1001',
        first_name: 'Aarav',
        last_name: 'Sharma',
        class_id: classId,
        class: {
          name: 'Grade 6',
          section: 'A',
        },
        gender: 'MALE',
        is_active: true,
        photo_url: null,
      },
    ])
    mocks.classFindMany.mockResolvedValue([
      {
        id: classId,
        name: 'Grade 6',
        section: 'A',
        academic_year_id: yearId,
      },
    ])
    mocks.classFindFirst.mockResolvedValue({
      id: classId,
      name: 'Grade 6',
      section: 'A',
      academic_year_id: yearId,
    })
    mocks.academicYearFindMany.mockResolvedValue([
      {
        id: yearId,
        name: '2025-2026',
        is_current: true,
      },
    ])
    mocks.academicYearFindFirst.mockResolvedValue({
      id: yearId,
      name: '2025-2026',
    })
    mocks.userFindFirst.mockResolvedValue(null)
    mocks.studentFindFirst.mockResolvedValue(null)

    mocks.txUserCreate.mockResolvedValue({ id: 'user-student-1' })
    mocks.txStudentCreate.mockResolvedValue({ id: 'student-created-id' })
    mocks.txParentFindFirst.mockResolvedValue({ id: parentId })
    mocks.txParentCreate.mockResolvedValue({ id: parentId })
    mocks.txStudentParentUpdateMany.mockResolvedValue({ count: 0 })
    mocks.txStudentParentCreate.mockResolvedValue({ id: 'student-parent-link-1' })

    mocks.transaction.mockImplementation(async (input: unknown) => {
      if (Array.isArray(input)) {
        return Promise.all(input)
      }
      if (typeof input === 'function') {
        return (input as (tx: any) => unknown)({
          user: {
            create: mocks.txUserCreate,
          },
          student: {
            create: mocks.txStudentCreate,
          },
          parent: {
            findFirst: mocks.txParentFindFirst,
            create: mocks.txParentCreate,
          },
          studentParent: {
            updateMany: mocks.txStudentParentUpdateMany,
            create: mocks.txStudentParentCreate,
          },
        })
      }
      return null
    })
  })

  it('TEST-STU-001 + TEST-STU-008 + TEST-STU-009 GET returns paginated list with filters scoped by school_id', async () => {
    const request = new NextRequest(
      `http://localhost/api/students?search=aarav&page=2&limit=10&class_id=${classId}&gender=MALE&is_active=true&sort_by=class&sort_order=desc`
    )

    const response = await GET(request)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expectSuccessShape(payload)
    expect(payload.data.students).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'student-1',
          admission_number: 'ADM-1001',
          name: 'Aarav Sharma',
        }),
      ])
    )
    expect(payload.data.pagination).toEqual(
      expect.objectContaining({
        total: 1,
        page: 2,
        limit: 10,
      })
    )
    expect(payload.data.search_note).toContain('encrypted')

    const studentWhere = mocks.studentCount.mock.calls[0]?.[0]?.where
    expect(studentWhere).toEqual(
      expect.objectContaining({
        school_id: schoolId,
        class_id: classId,
        gender: 'MALE',
        is_active: true,
      })
    )
    expect(JSON.stringify(studentWhere)).not.toContain('phone')
    expect(JSON.stringify(studentWhere)).not.toContain('address')

    expect(mocks.classFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ school_id: schoolId }),
      })
    )
    expect(mocks.academicYearFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ school_id: schoolId }),
      })
    )
  })

  it('GET supports parent search by name and school scope', async () => {
    mocks.parentFindMany.mockResolvedValue([
      {
        id: parentId,
        first_name: 'Asha',
        last_name: 'Sharma',
        relation: 'MOTHER',
        email: 'asha@example.com',
      },
    ])

    const request = new NextRequest('http://localhost/api/students?parent_search=ash&limit=10')
    const response = await GET(request)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expectSuccessShape(payload)
    expect(payload.data.parents).toEqual([
      expect.objectContaining({
        id: parentId,
        name: 'Asha Sharma',
      }),
    ])
    expect(mocks.parentFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          school_id: schoolId,
        }),
      })
    )
  })

  it('GET returns 401 when user is not authenticated', async () => {
    mocks.auth.mockResolvedValue(null)

    const response = await GET(new NextRequest('http://localhost/api/students'))
    const payload = await response.json()

    expect(response.status).toBe(401)
    expectErrorShape(payload, 'UNAUTHORIZED')
  })

  it('TEST-STU-002 POST validates request payload', async () => {
    const request = new NextRequest('http://localhost/api/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        first_name: 'Missing admission number',
      }),
    })

    const response = await POST(request)
    const payload = await response.json()

    expect(response.status).toBe(400)
    expectErrorShape(payload, 'VALIDATION_ERROR')
  })

  it('TEST-STU-010 POST blocks duplicate admission numbers with 409', async () => {
    mocks.studentFindFirst.mockResolvedValueOnce({
      id: 'existing-student',
    })

    const request = new NextRequest('http://localhost/api/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        admission_number: 'ADM-1001',
        first_name: 'Rahul',
        last_name: 'Kumar',
        date_of_birth: '2010-05-10',
        class_id: classId,
      }),
    })

    const response = await POST(request)
    const payload = await response.json()

    expect(response.status).toBe(409)
    expectErrorShape(payload, 'DUPLICATE_ADMISSION_NUMBER')
  })

  it('POST returns 401 when user is not authenticated', async () => {
    mocks.auth.mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        admission_number: 'ADM-2001',
        first_name: 'Aarav',
        last_name: 'Sharma',
        date_of_birth: '2011-06-10',
        class_id: classId,
      }),
    })

    const response = await POST(request)
    const payload = await response.json()

    expect(response.status).toBe(401)
    expectErrorShape(payload, 'UNAUTHORIZED')
  })

  it('TEST-STU-011 POST links an existing parent in the same school', async () => {
    mocks.studentFindFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(
        buildCreatedStudent({
          user: null,
        })
      )
    mocks.txParentFindFirst.mockResolvedValue({
      id: parentId,
    })

    const request = new NextRequest('http://localhost/api/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        admission_number: 'ADM-2005',
        first_name: 'Nisha',
        last_name: 'Verma',
        date_of_birth: '2011-06-10',
        class_id: classId,
        parent: {
          existing_parent_id: parentId,
          is_primary: true,
        },
      }),
    })

    const response = await POST(request)
    const payload = await response.json()

    expect(response.status).toBe(201)
    expectSuccessShape(payload)
    expect(mocks.txParentFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: parentId,
          school_id: schoolId,
        },
      })
    )
    expect(mocks.txParentCreate).not.toHaveBeenCalled()
    expect(mocks.txStudentParentCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          school_id: schoolId,
          parent_id: parentId,
        }),
      })
    )
  })

  it('TEST-STU-011 + TEST-STU-012 POST creates student with parent creation and user account generation', async () => {
    mocks.studentFindFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(buildCreatedStudent())

    const request = new NextRequest('http://localhost/api/students', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': '10.20.30.40',
        'user-agent': 'vitest-agent',
      },
      body: JSON.stringify({
        admission_number: 'ADM-2001',
        first_name: 'Aarav',
        last_name: 'Sharma',
        date_of_birth: '2011-06-10',
        class_id: classId,
        phone: '9999999999',
        address: 'Hyderabad',
        parent: {
          create_parent: {
            first_name: 'Ravi',
            last_name: 'Sharma',
            relation: 'FATHER',
            phone: '9999990000',
            email: 'ravi@example.com',
          },
          is_primary: true,
        },
        account: {
          create_user: true,
          email: 'aarav@example.com',
          auto_generate_password: true,
        },
      }),
    })

    const response = await POST(request)
    const payload = await response.json()

    expect(response.status).toBe(201)
    expectSuccessShape(payload)
    expect(payload.data.student).toEqual(
      expect.objectContaining({
        id: 'student-created-id',
        admission_number: 'ADM-2001',
        first_name: 'Aarav',
        last_name: 'Sharma',
      })
    )
    expect(payload.data.generated_password).toBe('Auto@Pass123')

    expect(mocks.txStudentCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          school_id: schoolId,
          class_id: classId,
          academic_year_id: yearId,
          phone: '9999999999',
          address: 'Hyderabad',
        }),
      })
    )
    expect(mocks.txParentCreate).toHaveBeenCalledTimes(1)
    expect(mocks.txUserCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          school_id: schoolId,
          email: 'aarav@example.com',
          role: 'STUDENT',
        }),
      })
    )
    expect(mocks.createAuditLog).toHaveBeenCalledTimes(1)
    expect(mocks.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        school_id: schoolId,
        user_id: 'user-1',
        action: 'CREATE',
        entity_type: 'student',
        entity_id: 'student-created-id',
        ip_address: '10.20.30.40',
        user_agent: 'vitest-agent',
      })
    )
  })

  it('POST returns 400 when existing parent does not belong to school scope', async () => {
    mocks.studentFindFirst.mockResolvedValueOnce(null)
    mocks.txParentFindFirst.mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        admission_number: 'ADM-2002',
        first_name: 'Diya',
        last_name: 'Sharma',
        date_of_birth: '2011-06-10',
        class_id: classId,
        parent: {
          existing_parent_id: parentId,
        },
      }),
    })

    const response = await POST(request)
    const payload = await response.json()

    expect(response.status).toBe(400)
    expectErrorShape(payload, 'INVALID_PARENT')
  })
})
