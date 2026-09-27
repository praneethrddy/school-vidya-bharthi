import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  auth: mocks.auth,
}))

import { GET } from '../route'

describe('/api/homework GET', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns homework list payload shape', async () => {
    mocks.auth.mockResolvedValue({
      user: {
        id: 'student-user-1',
        role: 'STUDENT',
        schoolId: 'school-1',
      },
    })

    const request = new NextRequest('http://localhost/api/homework')
    const response = await GET(request)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          homework: expect.any(Array),
          pagination: expect.objectContaining({
            total: expect.any(Number),
            page: expect.any(Number),
            limit: expect.any(Number),
            total_pages: expect.any(Number),
          }),
        }),
      })
    )
  })

  it('requires authentication for homework API access', async () => {
    mocks.auth.mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/homework')
    const response = await GET(request)

    expect(response.status).toBe(401)
  })
})
