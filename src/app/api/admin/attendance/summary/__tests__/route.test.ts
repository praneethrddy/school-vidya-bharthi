import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  hasPermission: vi.fn(),
  classFindMany: vi.fn(),
  attendanceFindMany: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  auth: mocks.auth,
}))

vi.mock('@/lib/permissions', () => ({
  hasPermission: mocks.hasPermission,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    class: {
      findMany: mocks.classFindMany,
    },
    attendance: {
      findMany: mocks.attendanceFindMany,
    },
  },
}))

import { GET } from '../route'

const schoolId = 'school-1'
const date = '2026-05-27'

describe('/api/admin/attendance/summary GET', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mocks.auth.mockResolvedValue({
      user: {
        id: 'principal-1',
        role: 'PRINCIPAL',
        schoolId,
      },
    })
    mocks.hasPermission.mockResolvedValue(true)
    mocks.classFindMany.mockResolvedValue([
      {
        id: 'class-1',
        name: 'Grade 6',
        section: 'A',
        _count: {
          students: 3,
        },
      },
      {
        id: 'class-2',
        name: 'Grade 7',
        section: 'B',
        _count: {
          students: 1,
        },
      },
    ])
    mocks.attendanceFindMany.mockResolvedValue([
      {
        id: 'att-1',
        class_id: 'class-1',
        status: 'PRESENT',
        updated_at: new Date('2026-05-27T08:00:00.000Z'),
        marker: {
          first_name: 'Anita',
          last_name: 'Rao',
        },
      },
      {
        id: 'att-2',
        class_id: 'class-1',
        status: 'LATE',
        updated_at: new Date('2026-05-27T08:05:00.000Z'),
        marker: null,
      },
      {
        id: 'att-3',
        class_id: 'class-1',
        status: 'ABSENT',
        updated_at: new Date('2026-05-27T08:01:00.000Z'),
        marker: null,
      },
    ])
  })

  it('TEST-ADM-ATT-003 returns class summaries and school totals', async () => {
    const response = await GET(new NextRequest(`http://localhost/api/admin/attendance/summary?date=${date}`))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toMatchObject({
      success: true,
      data: {
        date,
        classes: [
          {
            class_id: 'class-1',
            class_name: 'Grade 6 A',
            total_students: 3,
            present: 1,
            absent: 1,
            late: 1,
            half_day: 0,
            is_marked: true,
            marked_by: 'Anita Rao',
            marked_at: '2026-05-27T08:05:00.000Z',
          },
          {
            class_id: 'class-2',
            class_name: 'Grade 7 B',
            total_students: 1,
            present: 0,
            absent: 0,
            late: 0,
            half_day: 0,
            is_marked: false,
            marked_by: null,
            marked_at: null,
          },
        ],
        school_total: {
          total_students: 4,
          present: 1,
          absent: 1,
          percentage: 50,
          classes_marked: 1,
          classes_not_marked: 1,
        },
      },
    })
  })

  it('TEST-ADM-ATT-010 scopes summary class and attendance queries by school_id', async () => {
    await GET(new NextRequest(`http://localhost/api/admin/attendance/summary?date=${date}&academic_year_id=ay-1`))

    expect(mocks.classFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          school_id: schoolId,
          academic_year_id: 'ay-1',
        },
      })
    )
    expect(mocks.attendanceFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          school_id: schoolId,
          date: expect.any(Date),
        },
      })
    )
  })

  it('returns 400 for an invalid summary date', async () => {
    const response = await GET(new NextRequest('http://localhost/api/admin/attendance/summary?date=not-a-date'))
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.success).toBe(false)
    expect(payload.error.code).toBe('INVALID_DATE')
  })

  it('returns 401 when the session is missing', async () => {
    mocks.auth.mockResolvedValue(null)

    const response = await GET(new NextRequest(`http://localhost/api/admin/attendance/summary?date=${date}`))
    const payload = await response.json()

    expect(response.status).toBe(401)
    expect(payload.success).toBe(false)
    expect(payload.error.code).toBe('UNAUTHORIZED')
  })

  it('returns 403 without ATTENDANCE.view_all permission', async () => {
    mocks.hasPermission.mockResolvedValue(false)

    const response = await GET(new NextRequest(`http://localhost/api/admin/attendance/summary?date=${date}`))
    const payload = await response.json()

    expect(response.status).toBe(403)
    expect(payload.success).toBe(false)
    expect(payload.error.code).toBe('FORBIDDEN')
  })
})
