import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  hasPermission: vi.fn(),
  studentFindMany: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({ auth: mocks.auth }))
vi.mock('@/lib/permissions', () => ({ hasPermission: mocks.hasPermission }))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    student: {
      findMany: mocks.studentFindMany,
    },
  },
}))

import { GET } from '../route'

describe('/api/admin/fees/students GET', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.auth.mockResolvedValue({
      user: { role: 'ACCOUNTANT', schoolId: 'school-1' },
    })
    mocks.hasPermission.mockResolvedValue(true)
  })

  it('returns 401 when unauthenticated', async () => {
    mocks.auth.mockResolvedValue(null)
    const response = await GET(new NextRequest('http://localhost/api/admin/fees/students?q=rah'))
    const payload = await response.json()

    expect(response.status).toBe(401)
    expect(payload).toMatchObject({ success: false, error: { code: 'UNAUTHORIZED' } })
  })

  it('returns 403 when all fee-module permissions are missing', async () => {
    mocks.hasPermission.mockResolvedValue(false)
    const response = await GET(new NextRequest('http://localhost/api/admin/fees/students?q=rah'))
    const payload = await response.json()

    expect(response.status).toBe(403)
    expect(payload).toMatchObject({ success: false, error: { code: 'FORBIDDEN' } })
  })

  it('returns mapped student search results', async () => {
    mocks.studentFindMany.mockResolvedValue([
      {
        id: 'student-1',
        first_name: 'Rahul',
        last_name: 'Sharma',
        admission_number: 'ADM-1',
        class_id: 'class-1',
        academic_year_id: 'year-1',
        class: { name: 'Grade 6', section: 'A' },
      },
    ])

    const response = await GET(
      new NextRequest('http://localhost/api/admin/fees/students?q=rah&class_id=class-1&limit=10')
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toMatchObject({
      success: true,
      data: [
        {
          id: 'student-1',
          name: 'Rahul Sharma',
          admission_number: 'ADM-1',
          class_name: 'Grade 6 A',
          class_id: 'class-1',
          academic_year_id: 'year-1',
        },
      ],
    })
  })
})
