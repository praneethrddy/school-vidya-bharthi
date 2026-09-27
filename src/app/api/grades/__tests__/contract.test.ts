import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import {
  GradesResponseSchema,
  ErrorResponseSchema,
} from '@/test/contracts/schemas'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  studentFindFirst: vi.fn(),
  parentFindFirst: vi.fn(),
  studentParentFindFirst: vi.fn(),
  schoolSettingFindFirst: vi.fn(),
  examFindMany: vi.fn(),
  gradeFindMany: vi.fn(),
  calculateGrade: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  auth: mocks.auth,
}))

vi.mock('@/lib/grades-utils', () => ({
  calculateGrade: mocks.calculateGrade,
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
    schoolSetting: {
      findFirst: mocks.schoolSettingFindFirst,
    },
    exam: {
      findMany: mocks.examFindMany,
    },
    grade: {
      findMany: mocks.gradeFindMany,
    },
  },
}))

import { GET } from '../route'

describe('Grades API Contract Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.auth.mockResolvedValue({
      user: { id: '00000000-0000-0000-0000-000000000000', role: 'STUDENT', schoolId: '00000000-0000-0000-0000-000000000001' },
    })
    mocks.studentFindFirst.mockResolvedValue({
      id: '11111111-1111-1111-1111-111111111111',
    })
    mocks.schoolSettingFindFirst.mockResolvedValue({
      setting_value: 'PERCENTAGE',
    })
    mocks.examFindMany.mockResolvedValue([
      {
        id: '22222222-2222-2222-2222-222222222222',
        name: 'Mid Term',
        start_date: new Date('2026-03-01'),
        end_date: new Date('2026-03-15'),
        term: {
          name: 'Term 1',
        },
        exam_subjects: [
          {
            subject_id: '33333333-3333-3333-3333-333333333333',
            max_marks: 100,
            passing_marks: 35,
            subject: {
              name: 'Mathematics',
              code: 'MATH101',
            },
          },
        ],
      },
    ])
    mocks.gradeFindMany.mockResolvedValue([
      {
        exam_id: '22222222-2222-2222-2222-222222222222',
        subject_id: '33333333-3333-3333-3333-333333333333',
        marks_obtained: 85,
        grade: 'A',
        remarks: 'Excellent',
      },
    ])
    mocks.calculateGrade.mockReturnValue('A')
  })

  it('[TEST-CONTRACT-018] GET /api/grades returns valid GradesResponse shape', async () => {
    const request = new NextRequest('http://localhost/api/grades')
    const response = await GET(request)
    const payload = await response.json()

    expect(response.status).toBe(200)
    const result = GradesResponseSchema.safeParse(payload)
    expect(result.success).toBe(true)
  })

  it('[TEST-CONTRACT-020] GET /api/grades fails with unauthorized error response shape', async () => {
    mocks.auth.mockResolvedValue(null)
    const request = new NextRequest('http://localhost/api/grades')
    const response = await GET(request)
    const payload = await response.json()

    expect(response.status).toBe(401)
    const result = ErrorResponseSchema.safeParse(payload)
    expect(result.success).toBe(true)
  })
})
