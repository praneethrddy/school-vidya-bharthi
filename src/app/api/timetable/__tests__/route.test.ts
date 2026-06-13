import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { z } from 'zod'

const timetableResponseSchema = z.object({
  class_name: z.string().min(1),
  term_name: z.string().min(1),
  working_days: z.array(z.string().min(3)),
  schedule: z.record(
    z.array(
      z.object({
        period_number: z.number().int().positive(),
        start_time: z.string().regex(/^\d{2}:\d{2}$/),
        end_time: z.string().regex(/^\d{2}:\d{2}$/),
        subject_name: z.string().min(1),
        subject_code: z.string(),
        teacher_name: z.string().min(1),
      })
    )
  ),
})

const errorResponseSchema = z.object({
  error: z.string().min(1),
  message: z.string().optional(),
})

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  studentFindFirst: vi.fn(),
  parentFindFirst: vi.fn(),
  studentParentFindFirst: vi.fn(),
  termFindFirst: vi.fn(),
  classFindUnique: vi.fn(),
  termFindUnique: vi.fn(),
  schoolSettingFindUnique: vi.fn(),
  timetableSlotFindMany: vi.fn(),
  timetableSlotCreate: vi.fn(),
  redisGet: vi.fn(),
  redisSet: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  auth: mocks.auth,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    student: { findFirst: mocks.studentFindFirst },
    parent: { findFirst: mocks.parentFindFirst },
    studentParent: { findFirst: mocks.studentParentFindFirst },
    term: {
      findFirst: mocks.termFindFirst,
      findUnique: mocks.termFindUnique,
    },
    class: { findUnique: mocks.classFindUnique },
    schoolSetting: { findUnique: mocks.schoolSettingFindUnique },
    timetableSlot: {
      findMany: mocks.timetableSlotFindMany,
      create: mocks.timetableSlotCreate,
    },
  },
}))

vi.mock('@/lib/redis', () => ({
  redis: {
    get: mocks.redisGet,
    set: mocks.redisSet,
  },
}))

import * as timetableRoute from '../route'

describe('/api/timetable module contracts', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mocks.auth.mockResolvedValue({
      user: {
        id: 'user-1',
        role: 'STUDENT',
        schoolId: 'school-1',
      },
    })

    mocks.studentFindFirst.mockResolvedValue({
      id: 'student-1',
      class_id: 'class-1',
      class: { id: 'class-1' },
    })

    mocks.parentFindFirst.mockResolvedValue({ id: 'parent-1' })
    mocks.studentParentFindFirst.mockResolvedValue({
      student_id: 'student-1',
      student: {
        id: 'student-1',
        class_id: 'class-1',
        class: { id: 'class-1' },
      },
    })

    mocks.termFindFirst.mockResolvedValue({
      id: 'term-1',
      start_date: new Date('2026-01-01T00:00:00.000Z'),
      end_date: new Date('2026-12-31T00:00:00.000Z'),
    })

    mocks.classFindUnique.mockResolvedValue({ id: 'class-1', name: '10', section: 'A' })
    mocks.termFindUnique.mockResolvedValue({ id: 'term-1', name: 'Term 1' })
    mocks.schoolSettingFindUnique.mockResolvedValue({ setting_value: 'MON,TUE,WED,THU,FRI' })

    mocks.timetableSlotFindMany.mockResolvedValue([
      {
        day_of_week: 'MON',
        period_number: 1,
        start_time: new Date('1970-01-01T09:00:00.000Z'),
        end_time: new Date('1970-01-01T09:40:00.000Z'),
        subject: { name: 'Math', code: 'MTH' },
        staff: { first_name: 'Meera', last_name: 'Shah' },
      },
    ])

    mocks.redisGet.mockResolvedValue(null)
    mocks.redisSet.mockResolvedValue('OK')
  })

  it('[TEST-TT-001] GET returns 401 + error shape when session is missing', async () => {
    mocks.auth.mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/timetable')
    const response = await timetableRoute.GET(request)
    const payload = await response.json()

    expect(response.status).toBe(401)
    expect(errorResponseSchema.safeParse(payload).success).toBe(true)
    expect(payload).toEqual({ error: 'Unauthorized' })
  })

  it('[TEST-TT-001] GET returns class schedule payload for student context', async () => {
    const request = new NextRequest('http://localhost/api/timetable')
    const response = await timetableRoute.GET(request)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(timetableResponseSchema.safeParse(payload).success).toBe(true)
    expect(payload.class_name).toBe('10 A')
    expect(payload.term_name).toBe('Term 1')
    expect(payload.schedule.MON).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          period_number: 1,
          subject_name: 'Math',
          teacher_name: 'Meera Shah',
        }),
      ])
    )
  })

  it('[TEST-TT-001] GET returns 403 when parent requests an unlinked student', async () => {
    mocks.auth.mockResolvedValue({
      user: {
        id: 'parent-user-1',
        role: 'PARENT',
        schoolId: 'school-1',
      },
    })
    mocks.parentFindFirst.mockResolvedValue({ id: 'parent-1' })
    mocks.studentParentFindFirst.mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/timetable?student_id=student-unlinked')
    const response = await timetableRoute.GET(request)
    const payload = await response.json()

    expect(response.status).toBe(403)
    expect(errorResponseSchema.safeParse(payload).success).toBe(true)
    expect(payload.error).toBe('Unauthorized to view this student')
  })

  it('[TEST-TT-003] GET serves cached timetable and skips DB fetches on cache hit', async () => {
    mocks.redisGet.mockResolvedValue(
      JSON.stringify({
        class_name: '10 A',
        term_name: 'Term 1',
        working_days: ['MON', 'TUE'],
        schedule: { MON: [] },
      })
    )

    const request = new NextRequest('http://localhost/api/timetable?class_id=class-1&term_id=term-1')
    const response = await timetableRoute.GET(request)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(timetableResponseSchema.safeParse(payload).success).toBe(true)
    expect(mocks.redisGet).toHaveBeenCalledWith('timetable:class-1:term-1')
    expect(mocks.timetableSlotFindMany).not.toHaveBeenCalled()
  })

  it('[TEST-TT-003] GET writes computed timetable to Redis with 24h TTL', async () => {
    const request = new NextRequest('http://localhost/api/timetable?class_id=class-1&term_id=term-1')
    const response = await timetableRoute.GET(request)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(timetableResponseSchema.safeParse(payload).success).toBe(true)
    expect(mocks.redisSet).toHaveBeenCalledWith(
      'timetable:class-1:term-1',
      expect.any(String),
      86400
    )
  })

  it('[TEST-TT-004] GET scopes current-term lookup by school_id', async () => {
    const request = new NextRequest('http://localhost/api/timetable')
    const response = await timetableRoute.GET(request)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(timetableResponseSchema.safeParse(payload).success).toBe(true)
    expect(mocks.termFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          school_id: 'school-1',
        }),
      })
    )
  })

  it('[TEST-TT-004] GET scopes timetable slots by school_id + class_id + term_id', async () => {
    const request = new NextRequest('http://localhost/api/timetable?class_id=class-1&term_id=term-1')
    const response = await timetableRoute.GET(request)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(timetableResponseSchema.safeParse(payload).success).toBe(true)
    expect(mocks.timetableSlotFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          school_id: 'school-1',
          class_id: 'class-1',
          term_id: 'term-1',
        }),
      })
    )
  })

  it('[TEST-TT-004] GET should also scope class metadata lookup by school_id', async () => {
    const request = new NextRequest('http://localhost/api/timetable?class_id=class-1&term_id=term-1')
    const response = await timetableRoute.GET(request)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(timetableResponseSchema.safeParse(payload).success).toBe(true)
    expect(JSON.stringify(mocks.classFindUnique.mock.calls[0]?.[0] ?? {})).toContain('school_id')
  })

  it('[TEST-TT-002] POST handler exists for create/update slots contract', async () => {
    expect(typeof (timetableRoute as { POST?: unknown }).POST).toBe('function')
  })

  it('[TEST-TT-005] POST rejects duplicate slots for same class/day/period with 409', async () => {
    const postHandler = (timetableRoute as { POST?: (request: NextRequest) => Promise<Response> }).POST
    expect(typeof postHandler).toBe('function')

    if (!postHandler) {
      return
    }

    const request = new NextRequest('http://localhost/api/timetable', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        class_id: 'class-1',
        term_id: 'term-1',
        day_of_week: 'MON',
        period_number: 1,
        subject_id: 'subject-1',
        staff_id: 'staff-1',
        start_time: '09:00',
        end_time: '09:40',
      }),
    })

    const response = await postHandler(request)
    const payload = await response.json()

    expect(response.status).toBe(409)
    expect(errorResponseSchema.safeParse(payload).success).toBe(true)
    expect(String(payload.error).toLowerCase()).toContain('duplicate')
  })
})
