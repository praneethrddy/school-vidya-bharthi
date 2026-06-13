import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  hasPermission: vi.fn(),
  createAuditLog: vi.fn(),
  studentFindFirst: vi.fn(),
  classFindFirst: vi.fn(),
  academicYearFindFirst: vi.fn(),
  studentUpdate: vi.fn(),
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
      update: mocks.studentUpdate,
    },
    class: {
      findFirst: mocks.classFindFirst,
    },
    academicYear: {
      findFirst: mocks.academicYearFindFirst,
    },
  },
}))

import { PATCH } from '../route'

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

describe('/api/students/[id]/assign-class PATCH', () => {
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

    mocks.studentFindFirst.mockResolvedValue({
      id: 'student-1',
      class_id: 'old-class-id',
      academic_year_id: 'old-year-id',
    })
    mocks.classFindFirst.mockResolvedValue({
      id: classId,
      name: 'Grade 6',
      section: 'A',
      academic_year_id: yearId,
    })
    mocks.academicYearFindFirst.mockResolvedValue({
      id: yearId,
      name: '2025-2026',
    })
    mocks.studentUpdate.mockResolvedValue({
      id: 'student-1',
      class_id: classId,
      academic_year_id: yearId,
      class: {
        id: classId,
        name: 'Grade 6',
        section: 'A',
      },
      academic_year: {
        id: yearId,
        name: '2025-2026',
      },
    })
  })

  it('returns 401 for missing session', async () => {
    mocks.auth.mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/students/student-1/assign-class', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        class_id: classId,
      }),
    })

    const response = await PATCH(request, {
      params: Promise.resolve({ id: 'student-1' }),
    })
    const payload = await response.json()

    expect(response.status).toBe(401)
    expectErrorShape(payload, 'UNAUTHORIZED')
  })

  it('returns 403 for missing permission', async () => {
    mocks.hasPermission.mockResolvedValue(false)

    const request = new NextRequest('http://localhost/api/students/student-1/assign-class', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        class_id: classId,
      }),
    })

    const response = await PATCH(request, {
      params: Promise.resolve({ id: 'student-1' }),
    })
    const payload = await response.json()

    expect(response.status).toBe(403)
    expectErrorShape(payload, 'FORBIDDEN')
  })

  it('returns 400 for invalid class_id payload', async () => {
    const request = new NextRequest('http://localhost/api/students/student-1/assign-class', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        class_id: 'grade-6-a',
      }),
    })

    const response = await PATCH(request, {
      params: Promise.resolve({ id: 'student-1' }),
    })
    const payload = await response.json()

    expect(response.status).toBe(400)
    expectErrorShape(payload, 'VALIDATION_ERROR')
  })

  it('returns 404 when student is outside school scope', async () => {
    mocks.studentFindFirst.mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/students/student-1/assign-class', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        class_id: classId,
      }),
    })

    const response = await PATCH(request, {
      params: Promise.resolve({ id: 'student-1' }),
    })
    const payload = await response.json()

    expect(response.status).toBe(404)
    expectErrorShape(payload, 'NOT_FOUND')
    expect(mocks.studentFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'student-1',
          school_id: schoolId,
        },
      })
    )
  })

  it('returns 400 when class does not belong to school scope', async () => {
    mocks.classFindFirst.mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/students/student-1/assign-class', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        class_id: classId,
      }),
    })

    const response = await PATCH(request, {
      params: Promise.resolve({ id: 'student-1' }),
    })
    const payload = await response.json()

    expect(response.status).toBe(400)
    expectErrorShape(payload, 'INVALID_CLASS')
    expect(mocks.classFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: classId,
          school_id: schoolId,
        },
      })
    )
  })

  it('returns 400 when class and provided academic year mismatch', async () => {
    const request = new NextRequest('http://localhost/api/students/student-1/assign-class', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        class_id: classId,
        academic_year_id: '33333333-3333-3333-3333-333333333333',
      }),
    })

    const response = await PATCH(request, {
      params: Promise.resolve({ id: 'student-1' }),
    })
    const payload = await response.json()

    expect(response.status).toBe(400)
    expectErrorShape(payload, 'CLASS_YEAR_MISMATCH')
  })

  it('returns 400 when academic year is outside school scope', async () => {
    mocks.academicYearFindFirst.mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/students/student-1/assign-class', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        class_id: classId,
      }),
    })

    const response = await PATCH(request, {
      params: Promise.resolve({ id: 'student-1' }),
    })
    const payload = await response.json()

    expect(response.status).toBe(400)
    expectErrorShape(payload, 'INVALID_ACADEMIC_YEAR')
    expect(mocks.academicYearFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: yearId,
          school_id: schoolId,
        },
      })
    )
  })

  it('TEST-STU-006 assigns class, updates school-scoped student, and writes audit log', async () => {
    const request = new NextRequest('http://localhost/api/students/student-1/assign-class', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': '10.0.0.7',
        'user-agent': 'vitest-agent',
      },
      body: JSON.stringify({
        class_id: classId,
      }),
    })

    const response = await PATCH(request, {
      params: Promise.resolve({ id: 'student-1' }),
    })
    const payload = await response.json()

    expect(response.status).toBe(200)
    expectSuccessShape(payload)
    expect(payload.data).toEqual(
      expect.objectContaining({
        student_id: 'student-1',
        class: expect.objectContaining({
          id: classId,
        }),
      })
    )

    expect(mocks.studentUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'student-1',
        },
        data: {
          class_id: classId,
          academic_year_id: yearId,
        },
      })
    )
    expect(mocks.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        school_id: schoolId,
        user_id: 'user-1',
        action: 'UPDATE',
        entity_type: 'student',
        entity_id: 'student-1',
        ip_address: '10.0.0.7',
        user_agent: 'vitest-agent',
      })
    )
  })
})
