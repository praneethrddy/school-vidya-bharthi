import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import {
  AttendanceRecordsResponseSchema,
  ErrorResponseSchema,
} from '@/test/contracts/schemas'

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
    attendance: {
      findMany: mocks.attendanceFindMany,
    },
    schoolSetting: {
      findUnique: mocks.schoolSettingFindUnique,
    },
  },
}))

import { GET } from '../route'

describe('Attendance API Contract Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.auth.mockResolvedValue({
      user: { id: '00000000-0000-0000-0000-000000000000', role: 'STUDENT', schoolId: '00000000-0000-0000-0000-000000000001' },
    })
    mocks.studentFindFirst.mockResolvedValue({
      id: '11111111-1111-1111-1111-111111111111',
    })
    mocks.attendanceFindMany.mockResolvedValue([
      {
        date: new Date('2026-05-01T00:00:00.000Z'),
        status: 'PRESENT',
        remarks: 'Good',
      },
    ])
    mocks.schoolSettingFindUnique.mockResolvedValue({
      setting_value: 'MON,TUE,WED,THU,FRI,SAT',
    })
  })

  it('[TEST-CONTRACT-018] GET /api/attendance returns valid AttendanceRecordsResponse shape', async () => {
    const request = new NextRequest('http://localhost/api/attendance?month=2026-05')
    const response = await GET(request)
    const payload = await response.json()

    expect(response.status).toBe(200)
    const result = AttendanceRecordsResponseSchema.safeParse(payload)
    expect(result.success).toBe(true)
  })

  it('[TEST-CONTRACT-020] GET /api/attendance fails with unauthorized error response shape', async () => {
    mocks.auth.mockResolvedValue(null)
    const request = new NextRequest('http://localhost/api/attendance?month=2026-05')
    const response = await GET(request)
    const payload = await response.json()

    expect(response.status).toBe(401)
    const result = ErrorResponseSchema.safeParse(payload)
    expect(result.success).toBe(true)
  })
})
