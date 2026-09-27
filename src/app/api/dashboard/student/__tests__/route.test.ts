import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  getDashboardData: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  auth: mocks.auth,
}))

vi.mock('@/lib/dashboard-service', () => ({
  getDashboardData: mocks.getDashboardData,
}))

import { GET } from '../route'

describe('/api/dashboard/student GET', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.auth.mockResolvedValue({
      user: {
        id: 'user-1',
        role: 'STUDENT',
        schoolId: 'school-1',
      },
    })
    mocks.getDashboardData.mockResolvedValue({
      student: { id: 'stu-1', name: 'Asha Rao' },
      attendance_summary: { percentage: 92.4 },
      fee_summary: { total_balance: 0 },
      grade_summary: { percentage: 88.1 },
      homework_summary: { pending_count: 2 },
      announcements: [],
    })
  })

  it('returns 401 when session is missing', async () => {
    mocks.auth.mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/dashboard/student')
    const response = await GET(request)
    const payload = await response.json()

    expect(response.status).toBe(401)
    expect(payload).toEqual({ error: 'Unauthorized' })
  })

  it('returns 403 for non student/parent roles', async () => {
    mocks.auth.mockResolvedValue({
      user: {
        id: 'user-1',
        role: 'TEACHER',
        schoolId: 'school-1',
      },
    })

    const request = new NextRequest('http://localhost/api/dashboard/student')
    const response = await GET(request)
    const payload = await response.json()

    expect(response.status).toBe(403)
    expect(payload).toEqual({ error: 'Forbidden' })
  })

  it('returns dashboard payload and scopes by school/user/student query', async () => {
    const request = new NextRequest(
      'http://localhost/api/dashboard/student?student_id=student-child-1'
    )
    const response = await GET(request)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual(
      expect.objectContaining({
        student: expect.objectContaining({ id: 'stu-1' }),
        attendance_summary: expect.any(Object),
        fee_summary: expect.any(Object),
        grade_summary: expect.any(Object),
        announcements: expect.any(Array),
      })
    )
    expect(mocks.getDashboardData).toHaveBeenCalledWith(
      'user-1',
      'school-1',
      'STUDENT',
      'student-child-1'
    )
  })

  it('maps unauthorized child access errors to 403', async () => {
    mocks.auth.mockResolvedValue({
      user: {
        id: 'parent-user',
        role: 'PARENT',
        schoolId: 'school-1',
      },
    })
    mocks.getDashboardData.mockRejectedValue(new Error('Unauthorized to view this student'))

    const request = new NextRequest(
      'http://localhost/api/dashboard/student?student_id=not-linked-student'
    )
    const response = await GET(request)
    const payload = await response.json()

    expect(response.status).toBe(403)
    expect(payload).toEqual({ error: 'Unauthorized to view this student' })
  })
})

