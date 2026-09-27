import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

const mocks = vi.hoisted(() => ({
  requireSchoolPermission: vi.fn(),
  getRequestMetadata: vi.fn(),
  academicYearFindMany: vi.fn(),
  academicYearFindFirst: vi.fn(),
  classFindMany: vi.fn(),
  classCreate: vi.fn(),
  classCreateMany: vi.fn(),
  staffFindMany: vi.fn(),
  staffFindFirst: vi.fn(),
  studentGroupBy: vi.fn(),
  createAuditLog: vi.fn(),
}))

vi.mock('@/lib/settings-auth', () => ({
  requireSchoolPermission: mocks.requireSchoolPermission,
  getRequestMetadata: mocks.getRequestMetadata,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    academicYear: {
      findMany: mocks.academicYearFindMany,
      findFirst: mocks.academicYearFindFirst,
    },
    class: {
      findMany: mocks.classFindMany,
      create: mocks.classCreate,
      createMany: mocks.classCreateMany,
    },
    staff: {
      findMany: mocks.staffFindMany,
      findFirst: mocks.staffFindFirst,
    },
    student: {
      groupBy: mocks.studentGroupBy,
    },
  },
}))

vi.mock('@/lib/audit', () => ({
  createAuditLog: mocks.createAuditLog,
}))

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

import { GET, POST } from '../route'

const schoolId = 'school-1'
const year1 = '11111111-1111-1111-1111-111111111111'
const year2 = '22222222-2222-2222-2222-222222222222'
const classId = '33333333-3333-3333-3333-333333333333'
const teacherId = '44444444-4444-4444-4444-444444444444'

describe('/api/settings/classes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireSchoolPermission.mockResolvedValue({
      error: null,
      user: {
        id: 'user-1',
        role: 'PRINCIPAL',
        schoolId,
      },
    })
    mocks.getRequestMetadata.mockReturnValue({
      ip_address: '127.0.0.1',
      user_agent: 'vitest',
    })

    mocks.academicYearFindMany.mockResolvedValue([
      { id: year1, name: '2026-2027', is_current: true },
      { id: year2, name: '2027-2028', is_current: false },
    ])
    mocks.academicYearFindFirst.mockResolvedValue({ id: year1, name: '2026-2027' })

    mocks.classFindMany.mockResolvedValue([
      {
        id: classId,
        school_id: schoolId,
        academic_year_id: year1,
        name: 'Grade 6',
        section: 'A',
        room_number: '101',
        max_students: 40,
        class_teacher_id: teacherId,
        class_teacher: {
          id: teacherId,
          first_name: 'Ada',
          last_name: 'Lovelace',
        },
        academic_year: { id: year1, name: '2026-2027' },
      },
    ])

    mocks.staffFindMany.mockResolvedValue([
      { id: teacherId, first_name: 'Ada', last_name: 'Lovelace' },
    ])
    mocks.staffFindFirst.mockResolvedValue({ id: teacherId })
    mocks.studentGroupBy.mockResolvedValue([{ class_id: classId, _count: { class_id: 22 } }])

    mocks.classCreate.mockResolvedValue({
      id: classId,
      academic_year_id: year1,
      name: 'Grade 6',
      section: 'A',
      room_number: '101',
      max_students: 40,
      class_teacher_id: teacherId,
      class_teacher: {
        first_name: 'Ada',
        last_name: 'Lovelace',
      },
    })
    mocks.classCreateMany.mockResolvedValue({ count: 1 })
  })

  it('TEST-SET-005: GET lists classes, teachers, and student counts', async () => {
    const request = new NextRequest(`http://localhost/api/settings/classes?academic_year_id=${year1}`)
    const response = await GET(request)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.success).toBe(true)
    expect(payload.data.classes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: classId,
          display_name: 'Grade 6 - A',
          current_students: 22,
          class_teacher_name: 'Ada Lovelace',
        }),
      ])
    )
  })

  it('TEST-SET-006: POST creates class and writes audit log', async () => {
    const request = new NextRequest('http://localhost/api/settings/classes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        academic_year_id: year1,
        name: 'Grade 6',
        section: 'a',
        max_students: 40,
        room_number: '101',
        class_teacher_id: teacherId,
      }),
    })

    const response = await POST(request)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.success).toBe(true)
    expect(payload.data.class).toEqual(
      expect.objectContaining({
        id: classId,
        section: 'A',
        class_teacher_name: 'Ada Lovelace',
      })
    )
    expect(mocks.createAuditLog).toHaveBeenCalledTimes(1)
  })

  it('TEST-SET-008: POST copy mode duplicates missing classes only', async () => {
    mocks.classFindMany
      .mockResolvedValueOnce([
        { name: 'Grade 6', section: 'A', max_students: 40, room_number: '101' },
        { name: 'Grade 7', section: 'A', max_students: 40, room_number: '102' },
      ])
      .mockResolvedValueOnce([{ name: 'Grade 6', section: 'A' }])
      .mockResolvedValueOnce([
        {
          id: classId,
          name: 'Grade 6',
          section: 'A',
          room_number: '101',
          max_students: 40,
          class_teacher_id: null,
        },
        {
          id: '55555555-5555-5555-5555-555555555555',
          name: 'Grade 7',
          section: 'A',
          room_number: '102',
          max_students: 40,
          class_teacher_id: null,
        },
      ])

    const request = new NextRequest('http://localhost/api/settings/classes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        academic_year_id: year1,
        copy_from_academic_year_id: year2,
      }),
    })

    const response = await POST(request)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.success).toBe(true)
    expect(payload.data.created_count).toBe(1)
    expect(payload.data.skipped_count).toBe(1)
    expect(mocks.classCreateMany).toHaveBeenCalledTimes(1)
    expect(mocks.createAuditLog).toHaveBeenCalledTimes(1)
  })

  it('returns 401 when session is missing', async () => {
    mocks.requireSchoolPermission.mockResolvedValueOnce({
      error: NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'No valid session' } },
        { status: 401 }
      ),
      user: null,
    })

    const request = new NextRequest('http://localhost/api/settings/classes')
    const response = await GET(request)
    const payload = await response.json()

    expect(response.status).toBe(401)
    expect(payload.success).toBe(false)
    expect(payload.error.code).toBe('UNAUTHORIZED')
  })
})
