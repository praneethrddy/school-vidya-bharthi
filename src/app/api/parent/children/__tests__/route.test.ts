import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  auth: mocks.auth,
}))

import { GET } from '../route'

describe('/api/parent/children GET', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns children list payload structure', async () => {
    mocks.auth.mockResolvedValue({
      user: {
        id: 'parent-user-1',
        role: 'PARENT',
        schoolId: 'school-1',
      },
    })

    const request = new NextRequest('http://localhost/api/parent/children')
    const response = await GET(request)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual({
      success: true,
      data: {
        children: expect.any(Array),
      },
    })
  })

  it('rejects non-parent users with 401/403', async () => {
    mocks.auth.mockResolvedValue({
      user: {
        id: 'teacher-user-1',
        role: 'TEACHER',
        schoolId: 'school-1',
      },
    })

    const request = new NextRequest('http://localhost/api/parent/children')
    const response = await GET(request)

    expect([401, 403]).toContain(response.status)
  })
})
