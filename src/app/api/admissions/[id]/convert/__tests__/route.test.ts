import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  hasPermission: vi.fn(),
  createAuditLog: vi.fn(),
  admissionFindFirst: vi.fn(),
  classFindFirst: vi.fn(),
  studentCount: vi.fn(),
  transaction: vi.fn(),

  txStudentFindFirst: vi.fn(),
  txParentCreate: vi.fn(),
  txStudentCreate: vi.fn(),
  txStudentParentCreate: vi.fn(),
  txAdmissionUpdate: vi.fn(),
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
    admission: {
      findFirst: mocks.admissionFindFirst,
    },
    class: {
      findFirst: mocks.classFindFirst,
    },
    student: {
      count: mocks.studentCount,
    },
    $transaction: mocks.transaction,
  },
}))

import { POST } from '../route'

describe('/api/admissions/[id]/convert POST', () => {
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

    mocks.admissionFindFirst.mockResolvedValue({
      id: 'admission-1',
      academic_year_id: 'year-1',
      applicant_name: 'Aarav Sharma',
      date_of_birth: new Date('2014-06-10'),
      gender: 'MALE',
      applying_for_class: 'Grade 6 - A',
      parent_name: 'Rohit Sharma',
      parent_phone: '9999999999',
      parent_email: 'rohit@example.com',
      address: 'Hyderabad',
      status: 'ADMITTED',
      remarks: null,
    })

    mocks.classFindFirst.mockResolvedValue({
      id: 'class-1',
      school_id: 'school-1',
      academic_year_id: 'year-1',
      name: 'Grade 6',
      section: 'A',
      max_students: 40,
    })

    mocks.studentCount.mockResolvedValue(12)

    mocks.txStudentFindFirst.mockResolvedValue(null)
    mocks.txParentCreate.mockResolvedValue({ id: 'parent-1' })
    mocks.txStudentCreate.mockResolvedValue({ id: 'student-1' })
    mocks.txStudentParentCreate.mockResolvedValue({ id: 'link-1' })
    mocks.txAdmissionUpdate.mockResolvedValue({ id: 'admission-1' })

    mocks.transaction.mockImplementation(async (callback: any) => {
      return callback({
        student: {
          findFirst: mocks.txStudentFindFirst,
          create: mocks.txStudentCreate,
        },
        parent: {
          create: mocks.txParentCreate,
        },
        studentParent: {
          create: mocks.txStudentParentCreate,
        },
        admission: {
          update: mocks.txAdmissionUpdate,
        },
      })
    })
  })

  it('converts ADMITTED applicant to student and writes audit entries', async () => {
    const request = new NextRequest('http://localhost/api/admissions/admission-1/convert', {
      method: 'POST',
    })

    const response = await POST(request, {
      params: Promise.resolve({ id: 'admission-1' }),
    })

    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.success).toBe(true)
    expect(payload.data).toMatchObject({
      student_id: 'student-1',
      parent_id: 'parent-1',
      class_id: 'class-1',
    })
    expect(mocks.createAuditLog).toHaveBeenCalledTimes(2)
  })

  it('rejects conversion when status is not ADMITTED', async () => {
    mocks.admissionFindFirst.mockResolvedValue({
      id: 'admission-1',
      academic_year_id: 'year-1',
      applicant_name: 'Aarav Sharma',
      date_of_birth: new Date('2014-06-10'),
      gender: 'MALE',
      applying_for_class: 'Grade 6 - A',
      parent_name: 'Rohit Sharma',
      parent_phone: '9999999999',
      parent_email: 'rohit@example.com',
      address: 'Hyderabad',
      status: 'APPLIED',
      remarks: null,
    })

    const request = new NextRequest('http://localhost/api/admissions/admission-1/convert', {
      method: 'POST',
    })

    const response = await POST(request, {
      params: Promise.resolve({ id: 'admission-1' }),
    })
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.success).toBe(false)
    expect(payload.error.code).toBe('INVALID_STATUS')
  })

  it('returns 409 when record is already converted', async () => {
    mocks.admissionFindFirst.mockResolvedValue({
      id: 'admission-1',
      academic_year_id: 'year-1',
      applicant_name: 'Aarav Sharma',
      date_of_birth: new Date('2014-06-10'),
      gender: 'MALE',
      applying_for_class: 'Grade 6 - A',
      parent_name: 'Rohit Sharma',
      parent_phone: '9999999999',
      parent_email: 'rohit@example.com',
      address: 'Hyderabad',
      status: 'ADMITTED',
      remarks: '[CONVERTED:student-1]',
    })

    const response = await POST(new NextRequest('http://localhost/api/admissions/admission-1/convert', {
      method: 'POST',
    }), {
      params: Promise.resolve({ id: 'admission-1' }),
    })
    const payload = await response.json()

    expect(response.status).toBe(409)
    expect(payload.success).toBe(false)
    expect(payload.error.code).toBe('ALREADY_CONVERTED')
  })

  it('returns 409 when class capacity is full', async () => {
    mocks.studentCount.mockResolvedValue(40)

    const response = await POST(new NextRequest('http://localhost/api/admissions/admission-1/convert', {
      method: 'POST',
    }), {
      params: Promise.resolve({ id: 'admission-1' }),
    })
    const payload = await response.json()

    expect(response.status).toBe(409)
    expect(payload.success).toBe(false)
    expect(payload.error.code).toBe('CLASS_FULL')
  })

  it('returns 401 when session is missing', async () => {
    mocks.auth.mockResolvedValue(null)

    const response = await POST(new NextRequest('http://localhost/api/admissions/admission-1/convert', {
      method: 'POST',
    }), {
      params: Promise.resolve({ id: 'admission-1' }),
    })
    const payload = await response.json()

    expect(response.status).toBe(401)
    expect(payload.success).toBe(false)
    expect(payload.error.code).toBe('UNAUTHORIZED')
  })
})
