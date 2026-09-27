import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import {
  FeesResponseSchema,
  ErrorResponseSchema,
} from '@/test/contracts/schemas'

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

describe('Fees API Contract Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.auth.mockResolvedValue({
      user: { id: '00000000-0000-0000-0000-000000000000', role: 'STUDENT', schoolId: '00000000-0000-0000-0000-000000000001' },
    })
  })

  it('[TEST-CONTRACT-018] GET /api/fees returns valid FeesResponse shape', async () => {
    mocks.getFeesData.mockResolvedValue({
      fee_summary: {
        total_fees: 1000,
        total_concessions: 100,
        total_paid: 500,
        total_balance: 400,
      },
      fee_details: [
        {
          fee_structure_id: '22222222-2222-2222-2222-222222222222',
          category_name: 'Tuition',
          amount: 1000,
          frequency: 'ANNUALLY',
          due_date: new Date('2026-06-01').toISOString(),
          concession: {
            type: 'PERCENTAGE',
            value: 10,
            status: 'APPROVED',
            deduction: 100,
          },
          total_paid: 500,
          balance: 400,
          status: 'PARTIAL',
          payments: [
            {
              id: '33333333-3333-3333-3333-333333333333',
              amount_paid: 500,
              payment_date: new Date('2026-05-15').toISOString(),
              payment_mode: 'CASH',
              receipt_number: 'REC-12345',
              receipt_url: null,
              category_name: 'Tuition',
            },
          ],
        },
      ],
      all_payments: [],
    })

    const request = new NextRequest('http://localhost/api/fees')
    const response = await GET(request)
    const payload = await response.json()

    expect(response.status).toBe(200)
    const result = FeesResponseSchema.safeParse(payload)
    expect(result.success).toBe(true)
  })

  it('[TEST-CONTRACT-020] GET /api/fees fails with unauthorized error response shape', async () => {
    mocks.auth.mockResolvedValue(null)
    const request = new NextRequest('http://localhost/api/fees')
    const response = await GET(request)
    const payload = await response.json()

    expect(response.status).toBe(401)
    const result = ErrorResponseSchema.safeParse(payload)
    expect(result.success).toBe(true)
  })
})
