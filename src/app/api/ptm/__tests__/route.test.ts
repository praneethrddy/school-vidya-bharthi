import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  ptmSessionFindMany: vi.fn(),
  ptmSessionCreate: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  auth: mocks.auth,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    ptmSession: {
      findMany: mocks.ptmSessionFindMany,
      create: mocks.ptmSessionCreate,
    },
  },
}))

import { GET, POST } from '../route'

describe('/api/ptm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('GET returns PTM session list payload shape', async () => {
    mocks.auth.mockResolvedValue({
      user: {
        id: 'parent-user-1',
        role: 'PARENT',
        schoolId: 'school-1',
      },
    })
    mocks.ptmSessionFindMany.mockResolvedValue([])

    const request = new NextRequest('http://localhost/api/ptm')
    const response = await GET(request)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual({
      success: true,
      data: {
        sessions: expect.any(Array),
      },
    })
  })

  it('POST creates PTM session response shape', async () => {
    mocks.auth.mockResolvedValue({
      user: {
        id: 'principal-user-1',
        role: 'PRINCIPAL',
        schoolId: 'school-1',
      },
    })
    mocks.ptmSessionCreate.mockResolvedValue({ id: 'ptm-1' })

    const request = new NextRequest('http://localhost/api/ptm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'PTM 1' }),
    })
    const response = await POST(request)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual({
      success: true,
      data: null,
    })
  })

  it('requires admin authorization for PTM session creation', async () => {
    mocks.auth.mockResolvedValue({
      user: {
        id: 'teacher-user-1',
        role: 'TEACHER',
        schoolId: 'school-1',
      },
    })

    const request = new NextRequest('http://localhost/api/ptm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'PTM 1' }),
    })
    const response = await POST(request)

    expect(response.status).toBe(403)
  })
})
