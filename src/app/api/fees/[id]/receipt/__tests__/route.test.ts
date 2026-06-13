import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  feePaymentFindUnique: vi.fn(),
  parentFindFirst: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  auth: mocks.auth,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    feePayment: {
      findUnique: mocks.feePaymentFindUnique,
    },
    parent: {
      findFirst: mocks.parentFindFirst,
    },
  },
}))

import { GET } from '../route'

describe('/api/fees/[id]/receipt GET', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.auth.mockResolvedValue({
      user: {
        id: 'user-1',
        role: 'STUDENT',
        schoolId: 'school-1',
      },
    })
    mocks.feePaymentFindUnique.mockResolvedValue({
      id: 'payment-1',
      school_id: 'school-1',
      student_id: 'student-1',
      student: {
        user_id: 'user-1',
      },
      structure: {
        category: { name: 'Tuition' },
        class: { name: '10', section: 'A' },
      },
      collector: {
        first_name: 'Asha',
        last_name: 'Patel',
      },
      receipt_url: null,
    })
    mocks.parentFindFirst.mockResolvedValue({
      id: 'parent-1',
      students: [{ student_id: 'student-1' }],
    })
  })

  it('returns 401 when session is missing', async () => {
    mocks.auth.mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/fees/payment-1/receipt')
    const response = await GET(request, { params: Promise.resolve({ id: 'payment-1' }) })
    const payload = await response.json()

    expect(response.status).toBe(401)
    expect(payload).toEqual({ error: 'Unauthorized' })
  })

  it('returns receipt data for owned student payment', async () => {
    const request = new NextRequest('http://localhost/api/fees/payment-1/receipt')
    const response = await GET(request, { params: Promise.resolve({ id: 'payment-1' }) })
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual(
      expect.objectContaining({
        receiptData: expect.objectContaining({
          id: 'payment-1',
          student_id: 'student-1',
        }),
      })
    )
    expect(mocks.feePaymentFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'payment-1',
          school_id: 'school-1',
        }),
      })
    )
  })

  it('returns redirect when receipt URL already exists', async () => {
    mocks.feePaymentFindUnique.mockResolvedValue({
      id: 'payment-1',
      school_id: 'school-1',
      student_id: 'student-1',
      student: { user_id: 'user-1' },
      structure: { category: { name: 'Tuition' }, class: { name: '10', section: 'A' } },
      collector: { first_name: 'Asha', last_name: 'Patel' },
      receipt_url: 'https://cdn.example.com/receipt.pdf',
    })

    const request = new NextRequest('http://localhost/api/fees/payment-1/receipt')
    const response = await GET(request, { params: Promise.resolve({ id: 'payment-1' }) })

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('https://cdn.example.com/receipt.pdf')
  })

  it('returns 403 when parent is not linked to the payment student', async () => {
    mocks.auth.mockResolvedValue({
      user: {
        id: 'parent-user',
        role: 'PARENT',
        schoolId: 'school-1',
      },
    })
    mocks.parentFindFirst.mockResolvedValue({
      id: 'parent-1',
      students: [{ student_id: 'another-student' }],
    })

    const request = new NextRequest('http://localhost/api/fees/payment-1/receipt')
    const response = await GET(request, { params: Promise.resolve({ id: 'payment-1' }) })
    const payload = await response.json()

    expect(response.status).toBe(403)
    expect(payload).toEqual({ error: 'Forbidden' })
  })
})

