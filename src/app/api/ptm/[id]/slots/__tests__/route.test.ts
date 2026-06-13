// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '../route'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  findManySlots: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  auth: mocks.auth,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    timetableSlot: {
      findMany: mocks.findManySlots,
    },
  },
}))

describe('/api/ptm/[id]/slots GET', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns slot list payload shape', async () => {
    mocks.auth.mockResolvedValue({
      user: {
        role: 'PARENT',
        schoolId: 'school-1',
      },
    })
    mocks.findManySlots.mockResolvedValue([])

    const request = new NextRequest('http://localhost/api/ptm/ptm-1/slots')
    const response = await GET(request, { params: Promise.resolve({ id: 'ptm-1' }) })
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual({
      success: true,
      data: {
        slots: expect.any(Array),
      },
    })
  })
})

