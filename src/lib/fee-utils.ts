export type FeeConcessionInput = {
  type?: 'PERCENTAGE' | 'FIXED_AMOUNT'
  concession_type?: 'PERCENTAGE' | 'FIXED_AMOUNT'
  value?: number
  concession_value?: number
  status?: string
}

function toNumber(value: unknown): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0
  }

  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }

  if (value && typeof value === 'object' && 'toNumber' in value) {
    const maybeDecimal = value as { toNumber?: () => number }
    if (typeof maybeDecimal.toNumber === 'function') {
      const parsed = maybeDecimal.toNumber()
      return Number.isFinite(parsed) ? parsed : 0
    }
  }

  return 0
}

function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export function computeConcessionDeduction(
  feeAmount: number,
  concessionType: 'PERCENTAGE' | 'FIXED_AMOUNT',
  concessionValue: number
): number {
  const safeAmount = Math.max(0, toNumber(feeAmount))
  const safeValue = Math.max(0, toNumber(concessionValue))

  if (concessionType === 'PERCENTAGE') {
    return roundCurrency(safeAmount * (safeValue / 100))
  }

  return roundCurrency(safeValue)
}

export function calculateBalance(
  feeAmount: number,
  payments: Array<{ amount_paid: number }>,
  concession?: FeeConcessionInput | null
): number {
  const safeFeeAmount = Math.max(0, toNumber(feeAmount))

  let concessionDeduction = 0
  if (concession && concession.status === 'APPROVED') {
    const concessionType = concession.type ?? concession.concession_type
    const concessionValue = concession.value ?? concession.concession_value

    if (concessionType && concessionValue !== undefined) {
      concessionDeduction = computeConcessionDeduction(safeFeeAmount, concessionType, concessionValue)
    }
  }

  const totalPaid = payments.reduce((sum, payment) => sum + toNumber(payment.amount_paid), 0)

  return roundCurrency(safeFeeAmount - concessionDeduction - totalPaid)
}

export function getPaymentStatus(balance: number): 'PAID' | 'OUTSTANDING' | 'OVERPAID' {
  if (balance < 0) return 'OVERPAID'
  if (balance === 0) return 'PAID'
  return 'OUTSTANDING'
}

export function getFeeStatus(
  feeAmount: number,
  balance: number,
  concessionDeduction = 0
): 'PAID' | 'OUTSTANDING' | 'PARTIAL' | 'OVERPAID' {
  if (balance < 0) return 'OVERPAID'
  if (balance === 0) return 'PAID'

  const expectedTotal = Math.max(0, roundCurrency(toNumber(feeAmount) - toNumber(concessionDeduction)))
  if (balance < expectedTotal && expectedTotal > 0) return 'PARTIAL'

  return 'OUTSTANDING'
}

export function computeFeeBalanceSnapshot(params: {
  amount: number
  concessionType?: 'PERCENTAGE' | 'FIXED_AMOUNT' | null
  concessionValue?: number | null
  concessionStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | string | null
  paidAmountTotal?: number
}) {
  const amount = Math.max(0, toNumber(params.amount))
  const paidAmountTotal = Math.max(0, toNumber(params.paidAmountTotal ?? 0))

  const concessionAmount =
    params.concessionStatus === 'APPROVED' && params.concessionType && params.concessionValue !== null
      ? computeConcessionDeduction(amount, params.concessionType, toNumber(params.concessionValue ?? 0))
      : 0

  const balanceDue = roundCurrency(amount - concessionAmount - paidAmountTotal)

  return {
    total_amount: amount,
    concession_amount: concessionAmount,
    total_paid: paidAmountTotal,
    balance_due: balanceDue,
    status: getPaymentStatus(balanceDue),
  }
}

export function isOverpayment(amountPaid: number, balanceDue: number): boolean {
  return toNumber(amountPaid) > toNumber(balanceDue)
}

export function normalizeReceiptPrefix(prefix?: string | null): string {
  const normalized = (prefix || 'VBHS').trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
  return normalized || 'VBHS'
}

export function formatReceiptSequence(sequence: number): string {
  return String(Math.max(0, Math.floor(toNumber(sequence)))).padStart(6, '0')
}

export function formatReceiptNumber(
  prefix: string,
  paymentDate: Date | string,
  sequenceValue: number
): string {
  const date = paymentDate instanceof Date ? paymentDate : new Date(paymentDate)
  const year = Number.isNaN(date.getTime()) ? new Date().getUTCFullYear() : date.getUTCFullYear()

  return `${normalizeReceiptPrefix(prefix)}-${year}-${formatReceiptSequence(sequenceValue)}`
}

export function getFeeBalanceCacheKey(schoolId: string, studentId: string): string {
  return `fee:balance:${schoolId}:${studentId}`
}

export function buildReceiptStorageKey(params: {
  schoolSlug: string
  academicYear: string
  receiptNumber: string
}): string {
  const slug = params.schoolSlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-') || 'school'
  const academicYear = params.academicYear.trim().replace(/[^0-9-]/g, '') || 'unknown-year'
  const receipt = params.receiptNumber.trim().replace(/[^A-Z0-9-]/gi, '_')

  return `receipts/${slug}/${academicYear}/${receipt}.pdf`
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(toNumber(amount))
}
