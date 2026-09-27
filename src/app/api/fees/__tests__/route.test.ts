import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  getFeesData: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  auth: mocks.auth,
}))

vi.mock('@/lib/fee-service', () => ({
  getFeesData: mocks.getFeesData,
}))

import { GET } from '../route'

describe('/api/fees GET', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.auth.mockResolvedValue({
      user: {
        id: 'user-1',
        role: 'STUDENT',
        schoolId: 'school-1',
      },
    })
    mocks.getFeesData.mockResolvedValue({
      fee_summary: {
        total_fees: 10000,
        total_concessions: 0,
        total_paid: 10000,
        total_balance: 0,
      },
      fee_details: [],
      all_payments: [{ id: 'payment-1' }],
    })
  })

  it('returns 401 when not authenticated', async () => {
    mocks.auth.mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/fees')
    const response = await GET(request)
    const payload = await response.json()

    expect(response.status).toBe(401)
    expect(payload).toEqual({ error: 'Unauthorized' })
  })

  it('returns 403 for unsupported roles', async () => {
    mocks.auth.mockResolvedValue({
      user: {
        id: 'user-2',
        role: 'TEACHER',
        schoolId: 'school-1',
      },
    })

    const request = new NextRequest('http://localhost/api/fees')
    const response = await GET(request)
    const payload = await response.json()

    expect(response.status).toBe(403)
    expect(payload).toEqual({ error: 'Forbidden' })
  })

  it('returns fee summary/details and omits all_payments from response body', async () => {
    const request = new NextRequest(
      'http://localhost/api/fees?student_id=student-1&academic_year_id=year-1'
    )
    const response = await GET(request)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual(
      expect.objectContaining({
        fee_summary: expect.any(Object),
        fee_details: expect.any(Array),
      })
    )
    expect(payload.all_payments).toBeUndefined()
    expect(mocks.getFeesData).toHaveBeenCalledWith(
      'user-1',
      'school-1',
      'STUDENT',
      'student-1',
      'year-1'
    )
  })
})

