import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import {
  TimetableResponseSchema,
  ErrorResponseSchema,
} from '@/test/contracts/schemas'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  studentFindFirst: vi.fn(),
  parentFindFirst: vi.fn(),
  studentParentFindFirst: vi.fn(),
  classFindUnique: vi.fn(),
  termFindUnique: vi.fn(),
  schoolSettingFindUnique: vi.fn(),
  timetableSlotFindMany: vi.fn(),
  redisGet: vi.fn(),
  redisSet: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  auth: mocks.auth,
}))

vi.mock('@/lib/redis', () => ({
  redis: {
    get: mocks.redisGet,
    set: mocks.redisSet,
  },
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
    class: {
      findUnique: mocks.classFindUnique,
    },
    term: {
      findUnique: mocks.termFindUnique,
      findFirst: vi.fn(),
    },
    schoolSetting: {
      findUnique: mocks.schoolSettingFindUnique,
    },
    timetableSlot: {
      findMany: mocks.timetableSlotFindMany,
    },
  },
}))

import { GET } from '../route'

describe('Timetable API Contract Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.auth.mockResolvedValue({
      user: { id: '00000000-0000-0000-0000-000000000000', role: 'STUDENT', schoolId: '00000000-0000-0000-0000-000000000001' },
    })
    mocks.studentFindFirst.mockResolvedValue({
      id: '11111111-1111-1111-1111-111111111111',
      class_id: '44444444-4444-4444-4444-444444444444',
    })
    mocks.classFindUnique.mockResolvedValue({
      id: '44444444-4444-4444-4444-444444444444',
      name: 'Grade 6',
      section: 'A',
    })
    mocks.termFindUnique.mockResolvedValue({
      id: '33333333-3333-3333-3333-333333333333',
      name: 'Term 1',
    })
    mocks.schoolSettingFindUnique.mockResolvedValue({
      setting_value: 'MON,TUE,WED,THU,FRI,SAT',
    })
    mocks.timetableSlotFindMany.mockResolvedValue([
      {
        id: '55555555-5555-5555-5555-555555555555',
        day_of_week: 'MON',
        period_number: 1,
        start_time: new Date('2026-01-01T09:00:00Z'),
        end_time: new Date('2026-01-01T09:45:00Z'),
        subject: {
          name: 'Mathematics',
          code: 'MATH101',
        },
        staff: {
          first_name: 'Jane',
          last_name: 'Smith',
        },
      },
    ])
  })

  it('[TEST-CONTRACT-018] GET /api/timetable returns valid TimetableResponse shape', async () => {
    const request = new NextRequest('http://localhost/api/timetable?class_id=44444444-4444-4444-4444-444444444444&term_id=33333333-3333-3333-3333-333333333333')
    const response = await GET(request)
    const payload = await response.json()

    expect(response.status).toBe(200)
    const result = TimetableResponseSchema.safeParse(payload)
    expect(result.success).toBe(true)
  })

  it('[TEST-CONTRACT-020] GET /api/timetable fails with unauthorized error response shape', async () => {
    mocks.auth.mockResolvedValue(null)
    const request = new NextRequest('http://localhost/api/timetable')
    const response = await GET(request)
    const payload = await response.json()

    expect(response.status).toBe(401)
    const result = ErrorResponseSchema.safeParse(payload)
    expect(result.success).toBe(true)
  })
})
