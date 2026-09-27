import { describe, expect, it } from 'vitest'
import {
  buildReceiptStorageKey,
  calculateBalance,
  computeConcessionDeduction,
  computeFeeBalanceSnapshot,
  formatReceiptSequence,
  getFeeBalanceCacheKey,
  formatReceiptNumber,
  getPaymentStatus,
  isOverpayment,
  normalizeReceiptPrefix,
} from '../fee-utils'

describe('fee-utils balance helpers', () => {
  it('computes dynamic balance as amount - concession - paid', () => {
    const balance = calculateBalance(
      1000,
      [{ amount_paid: 200 }, { amount_paid: 150 }],
      { status: 'APPROVED', type: 'FIXED_AMOUNT', value: 100 }
    )

    expect(balance).toBe(550)
  })

  it('computes concession deduction for percentage and fixed value', () => {
    expect(computeConcessionDeduction(1000, 'PERCENTAGE', 10)).toBe(100)
    expect(computeConcessionDeduction(1000, 'FIXED_AMOUNT', 250)).toBe(250)
  })

  it('supports snapshot response for API calculations', () => {
    const result = computeFeeBalanceSnapshot({
      amount: 2000,
      concessionStatus: 'APPROVED',
      concessionType: 'PERCENTAGE',
      concessionValue: 10,
      paidAmountTotal: 1200,
    })

    expect(result.total_amount).toBe(2000)
    expect(result.concession_amount).toBe(200)
    expect(result.total_paid).toBe(1200)
    expect(result.balance_due).toBe(600)
    expect(result.status).toBe('OUTSTANDING')
  })

  it('flags overpayment and status correctly', () => {
    expect(isOverpayment(1200, 1000)).toBe(true)
    expect(isOverpayment(500, 1000)).toBe(false)
    expect(getPaymentStatus(-20)).toBe('OVERPAID')
    expect(getPaymentStatus(0)).toBe('PAID')
    expect(getPaymentStatus(1)).toBe('OUTSTANDING')
  })
})

describe('receipt number formatting', () => {
  it('formats receipt numbers as PREFIX-YEAR-PADDED_SEQUENCE', () => {
    const receipt = formatReceiptNumber('vbhs', '2025-07-12', 1234)
    expect(receipt).toBe('VBHS-2025-001234')
  })

  it('normalizes prefixes and pads sequence values', () => {
    expect(normalizeReceiptPrefix(' vb hs-01 ')).toBe('VBHS01')
    expect(normalizeReceiptPrefix('')).toBe('VBHS')
    expect(formatReceiptSequence(9)).toBe('000009')
  })

  it('builds deterministic cache and storage keys', () => {
    expect(getFeeBalanceCacheKey('school-1', 'student-1')).toBe('fee:balance:school-1:student-1')
    expect(
      buildReceiptStorageKey({
        schoolSlug: 'Vidhya Bharathi',
        academicYear: '2025-26',
        receiptNumber: 'VBHS-2025-000001',
      })
    ).toBe('receipts/vidhya-bharathi/2025-26/VBHS-2025-000001.pdf')
  })
})
