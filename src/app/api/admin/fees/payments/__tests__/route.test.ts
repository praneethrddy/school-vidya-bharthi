import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  hasPermission: vi.fn(),
  createAuditLog: vi.fn(),
  cacheDel: vi.fn(),
  uploadFile: vi.fn(),
  renderToBuffer: vi.fn(),

  staffFindFirst: vi.fn(),
  schoolFindFirst: vi.fn(),
  settingFindFirst: vi.fn(),
  studentFindFirst: vi.fn(),
  structureFindFirst: vi.fn(),
  paymentFindMany: vi.fn(),
  concessionFindMany: vi.fn(),
  paymentUpdate: vi.fn(),
  paymentCount: vi.fn(),
  paymentFindManyHistory: vi.fn(),
  paymentHistoryCount: vi.fn(),

  transaction: vi.fn(),
  txQueryRawUnsafe: vi.fn(),
  txPaymentCreate: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  auth: mocks.auth,
}))

vi.mock('@/lib/permissions', () => ({
  hasPermission: mocks.hasPermission,
}))

vi.mock('@/lib/audit', () => ({
  createAuditLog: mocks.createAuditLog,
}))

vi.mock('@/lib/cache', () => ({
  cacheDel: mocks.cacheDel,
}))

vi.mock('@/lib/r2', () => ({
  uploadFile: mocks.uploadFile,
}))

vi.mock('@react-pdf/renderer', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@react-pdf/renderer')>()
  return {
    ...actual,
    renderToBuffer: mocks.renderToBuffer,
  }
})

vi.mock('@/lib/prisma', () => ({
  prisma: {
    staff: {
      findFirst: mocks.staffFindFirst,
    },
    school: {
      findFirst: mocks.schoolFindFirst,
    },
    schoolSetting: {
      findFirst: mocks.settingFindFirst,
    },
    student: {
      findFirst: mocks.studentFindFirst,
    },
    feeStructure: {
      findFirst: mocks.structureFindFirst,
    },
    feePayment: {
      findMany: mocks.paymentFindMany,
      update: mocks.paymentUpdate,
      count: mocks.paymentCount,
    },
    feeConcession: {
      findMany: mocks.concessionFindMany,
    },
    $transaction: mocks.transaction,
  },
}))

import { GET, POST } from '../route'

describe('/api/admin/fees/payments POST', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mocks.auth.mockResolvedValue({
      user: {
        id: 'user-1',
        role: 'ACCOUNTANT',
        schoolId: 'school-1',
      },
    })

    mocks.hasPermission.mockResolvedValue(true)

    mocks.staffFindFirst.mockResolvedValue({
      id: 'staff-1',
      first_name: 'Asha',
      last_name: 'Patel',
    })

    mocks.schoolFindFirst.mockResolvedValue({
      id: 'school-1',
      name: 'VBHS',
      slug: 'vbhs',
      address: 'Address',
      phone: '9999999999',
    })

    mocks.settingFindFirst.mockResolvedValue({
      setting_value: 'VBHS',
    })

    mocks.studentFindFirst.mockResolvedValue({
      id: 'student-1',
      first_name: 'Rahul',
      last_name: 'Sharma',
      admission_number: 'ADM-1',
      class_id: 'class-1',
    })

    mocks.structureFindFirst.mockResolvedValue({
      id: 'structure-1',
      class_id: 'class-1',
      amount: { toNumber: () => 5000 },
      category: { name: 'Tuition' },
      class: { name: 'Grade 6', section: 'A' },
      academic_year: { name: '2025-2026' },
    })

    mocks.paymentFindMany.mockResolvedValue([])
    mocks.concessionFindMany.mockResolvedValue([])
    mocks.paymentCount.mockResolvedValue(1)

    mocks.txQueryRawUnsafe.mockResolvedValue([{ nextval: 123 }])
    mocks.txPaymentCreate.mockResolvedValue({
      id: 'payment-1',
      student_id: 'student-1',
      fee_structure_id: 'structure-1',
      amount_paid: { toNumber: () => 1000 },
      payment_date: new Date('2025-06-10'),
      payment_mode: 'CASH',
      receipt_number: 'VBHS-2025-000123',
      receipt_url: null,
      structure: {
        category: { name: 'Tuition' },
        class: { name: 'Grade 6', section: 'A' },
        academic_year: { name: '2025-2026' },
      },
      student: {
        first_name: 'Rahul',
        last_name: 'Sharma',
      },
      collector: {
        first_name: 'Asha',
        last_name: 'Patel',
      },
    })

    mocks.transaction.mockImplementation(async (callback: any) => {
      return callback({
        $queryRawUnsafe: mocks.txQueryRawUnsafe,
        feePayment: {
          create: mocks.txPaymentCreate,
        },
      })
    })

    mocks.renderToBuffer.mockResolvedValue(Buffer.from('pdf-content'))
    mocks.uploadFile.mockResolvedValue('https://mock.r2/receipt.pdf')

    mocks.paymentUpdate.mockResolvedValue({
      id: 'payment-1',
      student_id: 'student-1',
      fee_structure_id: 'structure-1',
      amount_paid: { toNumber: () => 1000 },
      payment_date: new Date('2025-06-10'),
      payment_mode: 'CASH',
      receipt_number: 'VBHS-2025-000123',
      receipt_url: 'https://mock.r2/receipt.pdf',
      structure: {
        category: { name: 'Tuition' },
        class: { name: 'Grade 6', section: 'A' },
        academic_year: { name: '2025-2026' },
      },
      student: {
        first_name: 'Rahul',
        last_name: 'Sharma',
      },
      collector: {
        first_name: 'Asha',
        last_name: 'Patel',
      },
    })
  })

  it('GET returns 401 when unauthenticated', async () => {
    mocks.auth.mockResolvedValue(null)

    const response = await GET(new NextRequest('http://localhost/api/admin/fees/payments'))
    const payload = await response.json()

    expect(response.status).toBe(401)
    expect(payload).toMatchObject({ success: false, error: { code: 'UNAUTHORIZED' } })
  })

  it('GET returns payment history with pagination', async () => {
    mocks.paymentCount.mockResolvedValue(1)
    mocks.paymentFindMany.mockResolvedValueOnce([
      {
        id: 'payment-1',
        student_id: 'student-1',
        amount_paid: { toNumber: () => 1500 },
        payment_date: new Date('2025-06-10T00:00:00.000Z'),
        payment_mode: 'CASH',
        receipt_number: 'VBHS-2025-000123',
        receipt_url: 'https://mock.r2/receipt.pdf',
        reference_number: null,
        remarks: null,
        created_at: new Date('2025-06-10T00:00:00.000Z'),
        student: { first_name: 'Rahul', last_name: 'Sharma', class: { name: 'Grade 6', section: 'A' } },
        structure: { category: { name: 'Tuition' } },
        collector: { first_name: 'Asha', last_name: 'Patel' },
      },
    ])

    const response = await GET(
      new NextRequest('http://localhost/api/admin/fees/payments?page=1&limit=20&student_id=student-1')
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toMatchObject({
      success: true,
      data: {
        payments: [
          {
            id: 'payment-1',
            student_id: 'student-1',
            category_name: 'Tuition',
            amount_paid: 1500,
            receipt_number: 'VBHS-2025-000123',
          },
        ],
        pagination: { total: 1, page: 1, limit: 20, total_pages: 1 },
      },
    })
  })

  it('returns 201 and receipt details for normal payment', async () => {
    const request = new NextRequest('http://localhost/api/admin/fees/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        student_id: '11111111-1111-1111-1111-111111111111',
        fee_structure_id: '22222222-2222-2222-2222-222222222222',
        amount_paid: 1000,
        payment_date: '2025-06-10',
        payment_mode: 'CASH',
      }),
    })

    const response = await POST(request)
    const payload = await response.json()

    expect(response.status).toBe(201)
    expect(payload.success).toBe(true)
    expect(payload.data.receipt_number).toBe('VBHS-2025-000123')
    expect(payload.data.receipt_number).toMatch(/^VBHS-\d{4}-\d{6}$/)
    expect(payload.data.receipt_url).toBe('https://mock.r2/receipt.pdf')
    expect(mocks.cacheDel).toHaveBeenCalledWith('fee:balance:school-1:student-1')
    expect(mocks.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'CREATE',
        entity_type: 'fee_payment',
        entity_id: 'payment-1',
      })
    )
  })

  it('TEST-NEG-017: Duplicate receipt numbers are retried with sequence and eventually succeed', async () => {
    const duplicateReceiptError = Object.assign(
      new Error('Unique constraint failed on receipt_number'),
      { code: 'P2002' }
    )

    mocks.transaction
      .mockImplementationOnce(async () => {
        throw duplicateReceiptError
      })
      .mockImplementationOnce(async (callback: any) =>
        callback({
          $queryRawUnsafe: mocks.txQueryRawUnsafe,
          feePayment: {
            create: mocks.txPaymentCreate,
          },
        })
      )

    const request = new NextRequest('http://localhost/api/admin/fees/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        student_id: '11111111-1111-1111-1111-111111111111',
        fee_structure_id: '22222222-2222-2222-2222-222222222222',
        amount_paid: 1000,
        payment_date: '2025-06-10',
        payment_mode: 'CASH',
      }),
    })

    const response = await POST(request)
    const payload = await response.json()

    expect(response.status).toBe(201)
    expect(payload.success).toBe(true)
    expect(payload.data.receipt_number).toMatch(/^VBHS-\d{4}-\d{6}$/)
    expect(mocks.transaction).toHaveBeenCalledTimes(2)
    expect(mocks.txPaymentCreate).toHaveBeenCalledTimes(1)
  })

  it('returns 200 with overpayment warning when amount exceeds balance', async () => {
    mocks.paymentFindMany.mockResolvedValue([{ amount_paid: { toNumber: () => 4900 } }])

    const request = new NextRequest('http://localhost/api/admin/fees/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        student_id: '11111111-1111-1111-1111-111111111111',
        fee_structure_id: '22222222-2222-2222-2222-222222222222',
        amount_paid: 500,
        payment_date: '2025-06-10',
        payment_mode: 'CASH',
      }),
    })

    const response = await POST(request)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.success).toBe(true)
    expect(payload.data.overpayment_warning).toBe(true)
    expect(payload.warning).toContain('overpayment')
  })

  it('returns 401 for missing session on POST', async () => {
    mocks.auth.mockResolvedValue(null)

    const response = await POST(
      new NextRequest('http://localhost/api/admin/fees/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: '11111111-1111-1111-1111-111111111111',
          fee_structure_id: '22222222-2222-2222-2222-222222222222',
          amount_paid: 1000,
          payment_date: '2025-06-10',
          payment_mode: 'CASH',
        }),
      })
    )
    const payload = await response.json()

    expect(response.status).toBe(401)
    expect(payload).toMatchObject({
      success: false,
      error: { code: 'UNAUTHORIZED' },
    })
  })
})
