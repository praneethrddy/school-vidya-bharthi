import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { cacheGet, cacheSet } from '@/lib/cache'
import {
  errorResponse,
  forbiddenResponse,
  successResponse,
  unauthorizedResponse,
} from '@/lib/api-helpers'
import {
  computeFeeBalanceSnapshot,
  getFeeBalanceCacheKey,
  getPaymentStatus,
} from '@/lib/fee-utils'
import { hasPermission } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

interface FeeBalanceResponse {
  student: {
    id: string
    name: string
    class_name: string
  }
  balances: Array<{
    fee_structure_id: string
    category_name: string
    total_amount: number
    concession_amount: number
    total_paid: number
    balance_due: number
    status: 'PAID' | 'OUTSTANDING' | 'OVERPAID'
    due_date: string | null
    payments: Array<{
      id: string
      receipt_number: string
      amount: number
      date: string
      mode: string
      receipt_url: string | null
    }>
  }>
  total_due: number
  total_paid: number
  total_balance: number
}

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) return unauthorizedResponse('Not logged in')

  const user = session.user as { role: string; schoolId: string | null }
  if (!user.schoolId) return errorResponse('SCHOOL_REQUIRED', 'No school context')

  const allowed = await hasPermission(user.schoolId, user.role, 'FEES.view_reports')
  if (!allowed) return forbiddenResponse('Missing FEES.view_reports permission')

  const { searchParams } = new URL(request.url)
  const studentId = searchParams.get('student_id')
  const forceRefresh = searchParams.get('force_refresh') === 'true'

  if (!studentId) {
    return errorResponse('VALIDATION_ERROR', 'student_id is required')
  }

  const cacheKey = getFeeBalanceCacheKey(user.schoolId, studentId)
  if (!forceRefresh) {
    const cached = await cacheGet<FeeBalanceResponse>(cacheKey)
    if (cached) {
      return successResponse(cached)
    }
  }

  const student = await prisma.student.findFirst({
    where: { id: studentId, school_id: user.schoolId },
    include: {
      class: {
        select: {
          id: true,
          name: true,
          section: true,
        },
      },
      academic_year: {
        select: {
          id: true,
        },
      },
    },
  })

  if (!student || !student.class_id) {
    return errorResponse('STUDENT_NOT_FOUND', 'Student not found or class is not assigned', 404)
  }

  let academicYearId = student.academic_year_id
  if (!academicYearId) {
    const currentYear = await prisma.academicYear.findFirst({
      where: { school_id: user.schoolId, is_current: true },
      select: { id: true },
    })
    academicYearId = currentYear?.id || null
  }

  if (!academicYearId) {
    return errorResponse('ACADEMIC_YEAR_NOT_FOUND', 'Academic year not configured for student', 404)
  }

  const structures = await prisma.feeStructure.findMany({
    where: {
      school_id: user.schoolId,
      academic_year_id: academicYearId,
      class_id: student.class_id,
    },
    include: {
      category: {
        select: {
          name: true,
        },
      },
      fee_payments: {
        where: {
          school_id: user.schoolId,
          student_id: student.id,
        },
        orderBy: [{ payment_date: 'asc' }, { created_at: 'asc' }],
        select: {
          id: true,
          amount_paid: true,
          payment_date: true,
          payment_mode: true,
          receipt_number: true,
          receipt_url: true,
        },
      },
      fee_concessions: {
        where: {
          school_id: user.schoolId,
          student_id: student.id,
          status: 'APPROVED',
        },
        orderBy: { created_at: 'desc' },
        select: {
          concession_type: true,
          concession_value: true,
        },
      },
    },
    orderBy: [{ category: { name: 'asc' } }],
  })

  let totalDue = 0
  let totalPaid = 0
  let totalBalance = 0

  const balances = structures.map((structure) => {
    const amount = structure.amount.toNumber()
    const paid = structure.fee_payments.reduce((sum, payment) => sum + payment.amount_paid.toNumber(), 0)

    const concession = structure.fee_concessions[0]
    const balanceSnapshot = computeFeeBalanceSnapshot({
      amount,
      concessionStatus: concession ? 'APPROVED' : 'PENDING',
      concessionType: concession?.concession_type,
      concessionValue: concession?.concession_value.toNumber(),
      paidAmountTotal: paid,
    })

    totalDue += balanceSnapshot.total_amount - balanceSnapshot.concession_amount
    totalPaid += balanceSnapshot.total_paid
    totalBalance += balanceSnapshot.balance_due

    return {
      fee_structure_id: structure.id,
      category_name: structure.category.name,
      total_amount: balanceSnapshot.total_amount,
      concession_amount: balanceSnapshot.concession_amount,
      total_paid: balanceSnapshot.total_paid,
      balance_due: balanceSnapshot.balance_due,
      status: getPaymentStatus(balanceSnapshot.balance_due),
      due_date: structure.due_date ? structure.due_date.toISOString().split('T')[0] : null,
      payments: structure.fee_payments.map((payment) => ({
        id: payment.id,
        receipt_number: payment.receipt_number,
        amount: payment.amount_paid.toNumber(),
        date: payment.payment_date.toISOString().split('T')[0],
        mode: payment.payment_mode,
        receipt_url: payment.receipt_url,
      })),
    }
  })

  const responsePayload: FeeBalanceResponse = {
    student: {
      id: student.id,
      name: `${student.first_name} ${student.last_name}`.trim(),
      class_name: `${student.class?.name || 'N/A'} ${student.class?.section || ''}`.trim(),
    },
    balances,
    total_due: Number(totalDue.toFixed(2)),
    total_paid: Number(totalPaid.toFixed(2)),
    total_balance: Number(totalBalance.toFixed(2)),
  }

  await cacheSet(cacheKey, responsePayload, 60 * 60)

  return successResponse(responsePayload)
}
