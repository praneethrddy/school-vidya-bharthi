import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  ptmBookingFindFirst: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  auth: mocks.auth,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    ptmBooking: {
      findFirst: mocks.ptmBookingFindFirst,
    },
  },
}))

import { POST } from '../route'

describe('/api/ptm/[id]/book POST', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.auth.mockResolvedValue({
      user: {
        id: 'parent-user-1',
        role: 'PARENT',
        schoolId: 'school-1',
      },
    })
  })

  it('returns booking response shape', async () => {
    mocks.ptmBookingFindFirst.mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/ptm/ptm-1/book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slot_id: 'slot-1' }),
    })
    const response = await POST(request, { params: Promise.resolve({ id: 'ptm-1' }) })
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual({
      success: true,
      data: null,
    })
  })

  it('prevents double booking the same slot', async () => {
    mocks.ptmBookingFindFirst.mockResolvedValue({ id: 'booking-1' })

    const request = new NextRequest('http://localhost/api/ptm/ptm-1/book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slot_id: 'slot-1' }),
    })
    const response = await POST(request, { params: Promise.resolve({ id: 'ptm-1' }) })

    expect([400, 409]).toContain(response.status)
  })
})
