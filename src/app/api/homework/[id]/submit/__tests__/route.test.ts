import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  auth: mocks.auth,
}))

import { POST } from '../route'

describe('/api/homework/[id]/submit POST', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns submission payload shape', async () => {
    mocks.auth.mockResolvedValue({
      user: {
        id: 'student-user-1',
        role: 'STUDENT',
        schoolId: 'school-1',
      },
    })

    const request = new NextRequest('http://localhost/api/homework/homework-1/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    const response = await POST(request, { params: Promise.resolve({ id: 'homework-1' }) })
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual({
      success: true,
      data: null,
    })
  })

  it('requires authentication before homework submission', async () => {
    mocks.auth.mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/homework/homework-1/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    const response = await POST(request, { params: Promise.resolve({ id: 'homework-1' }) })

    expect(response.status).toBe(401)
  })
})
