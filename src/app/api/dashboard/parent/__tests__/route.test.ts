import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  auth: mocks.auth,
}))

import { GET } from '../route'

describe('/api/dashboard/parent GET', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns success payload structure', async () => {
    mocks.auth.mockResolvedValue({
      user: {
        id: 'parent-user-1',
        role: 'PARENT',
        schoolId: 'school-1',
      },
    })

    const request = new NextRequest('http://localhost/api/dashboard/parent')
    const response = await GET(request)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          child: null,
          attendance_summary: null,
          fee_summary: null,
          grade_summary: null,
          homework_summary: null,
          announcements: expect.any(Array),
          all_children_summary: expect.any(Array),
        }),
      })
    )
  })

  it('requires authentication for parent dashboard access', async () => {
    mocks.auth.mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/dashboard/parent')
    const response = await GET(request)

    expect(response.status).toBe(401)
  })
})
