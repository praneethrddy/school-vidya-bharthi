import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  getPermissionsForRole: vi.fn(),
  loggerError: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  auth: mocks.auth,
}))

vi.mock('@/lib/permissions', () => ({
  getPermissionsForRole: mocks.getPermissionsForRole,
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    error: mocks.loggerError,
  },
}))

import { GET } from '../route'

function expectErrorShape(payload: unknown, code: string) {
  expect(payload).toEqual(
    expect.objectContaining({
      success: false,
      error: expect.objectContaining({
        code,
        message: expect.any(String),
      }),
    })
  )
}

describe('/api/permissions/my', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.auth.mockResolvedValue({
      user: {
        id: 'teacher-user',
        role: 'TEACHER',
        schoolId: 'school-1',
      },
    })
    mocks.getPermissionsForRole.mockResolvedValue(['ATTENDANCE.mark', 'HOMEWORK.create'])
  })

  it('GET as authenticated user returns own permissions', async () => {
    const request = new NextRequest('http://localhost/api/permissions/my')
    const response = await GET(request)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.success).toBe(true)
    expect(payload.data).toEqual(
      expect.objectContaining({
        user_id: 'teacher-user',
        role: 'TEACHER',
        school_id: 'school-1',
        permissions: expect.arrayContaining(['ATTENDANCE.mark', 'HOMEWORK.create']),
      })
    )
    expect(payload.data.role).toBe('TEACHER')
    expect(payload.data.permissions).toEqual(['ATTENDANCE.mark', 'HOMEWORK.create'])
  })

  it('GET returns 401 when session is missing', async () => {
    mocks.auth.mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/permissions/my')
    const response = await GET(request)
    const payload = await response.json()

    expect(response.status).toBe(401)
    expectErrorShape(payload, 'UNAUTHORIZED')
  })
})
