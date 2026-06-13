import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  studentFindFirst: vi.fn(),
  parentFindFirst: vi.fn(),
  studentFindUnique: vi.fn(),
  yearFindFirst: vi.fn(),
  structureFindMany: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    student: {
      findFirst: mocks.studentFindFirst,
      findUnique: mocks.studentFindUnique,
    },
    parent: {
      findFirst: mocks.parentFindFirst,
    },
    academicYear: {
      findFirst: mocks.yearFindFirst,
    },
    feeStructure: {
      findMany: mocks.structureFindMany,
    },
  },
}))

import { getFeesData } from '../fee-service'

describe('getFeesData', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mocks.studentFindUnique.mockResolvedValue({
      id: 'student-1',
      class_id: 'class-1',
      class: { id: 'class-1', name: 'Grade 6', section: 'A' },
    })
    mocks.yearFindFirst.mockResolvedValue({ id: 'year-1' })
    mocks.structureFindMany.mockResolvedValue([
      {
        id: 'structure-1',
        amount: 1000,
        frequency: 'MONTHLY',
        due_date: new Date('2025-06-10T00:00:00.000Z'),
        category: { name: 'Tuition' },
        fee_payments: [
          {
            id: 'pay-1',
            amount_paid: 300,
            payment_date: new Date('2025-06-01T00:00:00.000Z'),
            payment_mode: 'CASH',
            receipt_number: 'VBHS-2025-000001',
            receipt_url: null,
          },
        ],
        fee_concessions: [
          {
            concession_type: 'FIXED_AMOUNT',
            concession_value: 100,
            status: 'APPROVED',
          },
        ],
      },
    ])
  })

  it('fetches fee structures and payment data for STUDENT role', async () => {
    mocks.studentFindFirst.mockResolvedValue({ id: 'student-1' })

    const result = await getFeesData('user-1', 'school-1', 'STUDENT')

    expect(mocks.studentFindFirst).toHaveBeenCalledWith({
      where: { user_id: 'user-1', school_id: 'school-1' },
    })
    expect(result.fee_details).toHaveLength(1)
    expect(result.all_payments).toHaveLength(1)
    expect(result.fee_details[0]).toMatchObject({
      fee_structure_id: 'structure-1',
      category_name: 'Tuition',
      total_paid: 300,
      balance: 600,
      status: 'PARTIAL',
    })
  })

  it('calculates fee summary as total - paid - approved concession', async () => {
    mocks.studentFindFirst.mockResolvedValue({ id: 'student-1' })

    const result = await getFeesData('user-1', 'school-1', 'STUDENT')

    expect(result.fee_summary).toEqual({
      total_fees: 1000,
      total_concessions: 100,
      total_paid: 300,
      total_balance: 600,
    })
  })

  it('scopes database calls by school_id', async () => {
    mocks.studentFindFirst.mockResolvedValue({ id: 'student-1' })

    await getFeesData('user-1', 'school-1', 'STUDENT')

    expect(mocks.structureFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          school_id: 'school-1',
        }),
      })
    )
  })

  it('blocks parent from accessing unlinked child', async () => {
    mocks.parentFindFirst.mockResolvedValue({
      students: [{ student_id: 'student-1' }],
    })

    await expect(getFeesData('parent-user', 'school-1', 'PARENT', 'student-999')).rejects.toThrow(
      'Forbidden: Student not linked to parent'
    )
  })
})
