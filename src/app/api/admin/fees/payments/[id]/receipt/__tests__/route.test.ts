import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  hasPermission: vi.fn(),
  renderToBuffer: vi.fn(),
  uploadFile: vi.fn(),
  paymentFindFirst: vi.fn(),
  paymentFindMany: vi.fn(),
  concessionFindMany: vi.fn(),
  paymentUpdate: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({ auth: mocks.auth }))
vi.mock('@/lib/permissions', () => ({ hasPermission: mocks.hasPermission }))
vi.mock('@/lib/r2', () => ({ uploadFile: mocks.uploadFile }))
vi.mock('@react-pdf/renderer', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@react-pdf/renderer')>()
  return {
    ...actual,
    renderToBuffer: mocks.renderToBuffer,
  }
})
vi.mock('@/lib/prisma', () => ({
  prisma: {
    feePayment: {
      findFirst: mocks.paymentFindFirst,
      findMany: mocks.paymentFindMany,
      update: mocks.paymentUpdate,
    },
    feeConcession: {
      findMany: mocks.concessionFindMany,
    },
  },
}))

import { GET } from '../route'

const paymentRecord = {
  id: 'payment-1',
  school_id: 'school-1',
  student_id: 'student-1',
  fee_structure_id: 'structure-1',
  receipt_number: 'VBHS-2025-000099',
  receipt_url: null,
  payment_date: new Date('2025-06-10T00:00:00.000Z'),
  payment_mode: 'CASH',
  reference_number: null,
  remarks: null,
  amount_paid: { toNumber: () => 1000 },
  school: { name: 'VBHS', address: 'Addr', phone: '9999999999', slug: 'vbhs' },
  student: { id: 'student-1', first_name: 'Rahul', last_name: 'Sharma', admission_number: 'ADM-1' },
  collector: { first_name: 'Asha', last_name: 'Patel' },
  structure: {
    amount: { toNumber: () => 5000 },
    category: { name: 'Tuition' },
    class: { name: 'Grade 6', section: 'A' },
    academic_year: { name: '2025-26' },
  },
}

describe('/api/admin/fees/payments/[id]/receipt GET', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.auth.mockResolvedValue({
      user: { role: 'ACCOUNTANT', schoolId: 'school-1' },
    })
    mocks.hasPermission.mockResolvedValue(true)
  })

  it('returns 401 when unauthenticated', async () => {
    mocks.auth.mockResolvedValue(null)

    const response = await GET(new NextRequest('http://localhost/api/admin/fees/payments/payment-1/receipt'), {
      params: Promise.resolve({ id: 'payment-1' }),
    })
    const payload = await response.json()

    expect(response.status).toBe(401)
    expect(payload).toMatchObject({ success: false, error: { code: 'UNAUTHORIZED' } })
  })

  it('redirects to existing receipt URL when available', async () => {
    mocks.paymentFindFirst.mockResolvedValue({
      ...paymentRecord,
      receipt_url: 'https://mock.r2/receipt-existing.pdf',
    })

    const response = await GET(new NextRequest('http://localhost/api/admin/fees/payments/payment-1/receipt'), {
      params: Promise.resolve({ id: 'payment-1' }),
    })

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('https://mock.r2/receipt-existing.pdf')
  })

  it('generates, uploads and stores receipt URL when missing', async () => {
    mocks.paymentFindFirst.mockResolvedValue(paymentRecord)
    mocks.paymentFindMany.mockResolvedValue([
      { amount_paid: { toNumber: () => 1000 } },
      { amount_paid: { toNumber: () => 500 } },
    ])
    mocks.concessionFindMany.mockResolvedValue([
      { concession_type: 'FIXED_AMOUNT', concession_value: { toNumber: () => 300 } },
    ])
    mocks.renderToBuffer.mockResolvedValue(Buffer.from('pdf'))
    mocks.uploadFile.mockResolvedValue('https://mock.r2/new-receipt.pdf')
    mocks.paymentUpdate.mockResolvedValue({ id: 'payment-1' })

    const response = await GET(new NextRequest('http://localhost/api/admin/fees/payments/payment-1/receipt'), {
      params: Promise.resolve({ id: 'payment-1' }),
    })

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('https://mock.r2/new-receipt.pdf')
    expect(mocks.uploadFile).toHaveBeenCalledWith(
      expect.stringContaining('receipts/vbhs/2025-26/VBHS-2025-000099.pdf'),
      expect.any(Buffer),
      'application/pdf'
    )
    expect(mocks.paymentUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'payment-1', school_id: 'school-1' },
      })
    )
  })
})
