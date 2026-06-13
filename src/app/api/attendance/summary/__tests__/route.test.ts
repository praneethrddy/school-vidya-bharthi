import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  studentFindFirst: vi.fn(),
  parentFindFirst: vi.fn(),
  studentParentFindFirst: vi.fn(),
  studentFindUnique: vi.fn(),
  academicYearFindUnique: vi.fn(),
  attendanceFindMany: vi.fn(),
  redisGet: vi.fn(),
  redisSet: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  auth: mocks.auth,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    student: {
      findFirst: mocks.studentFindFirst,
      findUnique: mocks.studentFindUnique,
    },
    parent: {
      findFirst: mocks.parentFindFirst,
    },
    studentParent: {
      findFirst: mocks.studentParentFindFirst,
    },
    academicYear: {
      findUnique: mocks.academicYearFindUnique,
    },
    attendance: {
      findMany: mocks.attendanceFindMany,
    },
  },
}))

vi.mock('@/lib/redis', () => ({
  redis: {
    get: mocks.redisGet,
    set: mocks.redisSet,
  },
}))

import { GET } from '../route'

describe('/api/attendance/summary GET', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mocks.auth.mockResolvedValue({
      user: {
        id: 'user-1',
        role: 'STUDENT',
        schoolId: 'school-1',
      },
    })
    mocks.studentFindFirst.mockResolvedValue({ id: 'student-1' })
    mocks.parentFindFirst.mockResolvedValue({ id: 'parent-1' })
    mocks.studentParentFindFirst.mockResolvedValue({ student_id: 'student-1' })
    mocks.studentFindUnique.mockResolvedValue({
      id: 'student-1',
      academic_year_id: 'year-1',
      class: { id: 'class-1' },
    })
    mocks.academicYearFindUnique.mockResolvedValue({
      id: 'year-1',
      start_date: new Date('2026-06-01'),
      end_date: new Date('2027-03-31'),
    })
    mocks.attendanceFindMany.mockResolvedValue([
      { status: 'PRESENT' },
      { status: 'PRESENT' },
      { status: 'ABSENT' },
      { status: 'LATE' },
    ])
    mocks.redisGet.mockResolvedValue(null)
    mocks.redisSet.mockResolvedValue('OK')
  })

  it('returns 401 when user is not authenticated', async () => {
    mocks.auth.mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/attendance/summary')
    const response = await GET(request)
    const payload = await response.json()

    expect(response.status).toBe(401)
    expect(payload).toEqual({ error: 'Unauthorized' })
  })

  it('returns academic year attendance summary shape', async () => {
    const request = new NextRequest('http://localhost/api/attendance/summary')
    const response = await GET(request)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual(
      expect.objectContaining({
        percentage: expect.any(Number),
        present: expect.any(Number),
        absent: expect.any(Number),
        late: expect.any(Number),
        half_day: expect.any(Number),
        total_days: expect.any(Number),
      })
    )
    expect(mocks.attendanceFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          school_id: 'school-1',
          student_id: 'student-1',
        }),
      })
    )
  })

  it('returns 403 when parent requests an unlinked child', async () => {
    mocks.auth.mockResolvedValue({
      user: {
        id: 'parent-user',
        role: 'PARENT',
        schoolId: 'school-1',
      },
    })
    mocks.studentParentFindFirst.mockResolvedValue(null)

    const request = new NextRequest(
      'http://localhost/api/attendance/summary?student_id=student-other'
    )
    const response = await GET(request)
    const payload = await response.json()

    expect(response.status).toBe(403)
    expect(payload).toEqual({ error: 'Unauthorized to view this student' })
  })
})

