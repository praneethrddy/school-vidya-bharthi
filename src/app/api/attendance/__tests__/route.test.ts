import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  studentFindFirst: vi.fn(),
  parentFindFirst: vi.fn(),
  studentParentFindFirst: vi.fn(),
  attendanceFindMany: vi.fn(),
  schoolSettingFindUnique: vi.fn(),
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
    },
    parent: {
      findFirst: mocks.parentFindFirst,
    },
    studentParent: {
      findFirst: mocks.studentParentFindFirst,
    },
    attendance: {
      findMany: mocks.attendanceFindMany,
    },
    schoolSetting: {
      findUnique: mocks.schoolSettingFindUnique,
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

describe('/api/attendance GET', () => {
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
    mocks.attendanceFindMany.mockResolvedValue([
      { date: new Date('2026-04-01'), status: 'PRESENT', remarks: null },
      { date: new Date('2026-04-02'), status: 'ABSENT', remarks: 'Sick leave' },
    ])
    mocks.schoolSettingFindUnique.mockResolvedValue({
      setting_value: 'MON,TUE,WED,THU,FRI',
    })
    mocks.redisGet.mockResolvedValue(null)
    mocks.redisSet.mockResolvedValue('OK')
  })

  it('returns 401 when session is missing', async () => {
    mocks.auth.mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/attendance?month=2026-04')
    const response = await GET(request)
    const payload = await response.json()

    expect(response.status).toBe(401)
    expect(payload).toEqual({ error: 'Unauthorized' })
  })

  it('returns 400 when month query parameter is missing', async () => {
    const request = new NextRequest('http://localhost/api/attendance')
    const response = await GET(request)
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.error).toContain('month')
  })

  it('returns attendance records + summary and enforces school/student scoping', async () => {
    const request = new NextRequest('http://localhost/api/attendance?month=2026-04')
    const response = await GET(request)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual(
      expect.objectContaining({
        records: expect.arrayContaining([
          expect.objectContaining({
            date: '2026-04-01',
            status: 'PRESENT',
          }),
          expect.objectContaining({
            date: '2026-04-02',
            status: 'ABSENT',
            remarks: 'Sick leave',
          }),
        ]),
        summary: expect.objectContaining({
          total_working_days: expect.any(Number),
          present: expect.any(Number),
          absent: expect.any(Number),
          percentage: expect.any(Number),
        }),
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
      'http://localhost/api/attendance?month=2026-04&student_id=student-other'
    )
    const response = await GET(request)
    const payload = await response.json()

    expect(response.status).toBe(403)
    expect(payload).toEqual({ error: 'Unauthorized to view this student' })
  })
})

