import { Prisma } from '@prisma/client'
import { renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { createAuditLog } from '@/lib/audit'
import { cacheDel } from '@/lib/cache'
import {
  errorResponse,
  forbiddenResponse,
  successResponse,
  unauthorizedResponse,
} from '@/lib/api-helpers'
import {
  buildReceiptStorageKey,
  computeConcessionDeduction,
  formatReceiptNumber,
  getFeeBalanceCacheKey,
  isOverpayment,
  normalizeReceiptPrefix,
} from '@/lib/fee-utils'
import { hasPermission } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { uploadFile } from '@/lib/r2'
import { FeeReceiptTemplate } from '@/components/admin/fee-receipt-template'

const createPaymentSchema = z.object({
  student_id: z.string().uuid(),
  fee_structure_id: z.string().uuid(),
  amount_paid: z.number().positive('Amount paid must be greater than 0'),
  payment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Payment date must be YYYY-MM-DD'),
  payment_mode: z.enum(['CASH', 'CHEQUE', 'DD', 'BANK_TRANSFER', 'OTHER']),
  reference_number: z.string().max(100).optional().nullable(),
  remarks: z.string().max(1500).optional().nullable(),
})

function toNumber(value: Prisma.Decimal | number): number {
  return typeof value === 'number' ? value : value.toNumber()
}

function sanitizeSequenceName(schoolSlug: string): string {
  const slug = schoolSlug.toLowerCase().replace(/[^a-z0-9]/g, '_')
  return `seq_receipt_${slug}`
}

async function getNextSequenceValue(
  tx: Prisma.TransactionClient,
  sequenceName: string
): Promise<number> {
  const safe = sequenceName.replace(/[^a-z0-9_]/gi, '')
  const rows = await tx.$queryRawUnsafe<Array<{ nextval: number | bigint | string }>>(
    `SELECT nextval('${safe}') AS nextval`
  )
  const raw = rows[0]?.nextval
  if (raw === undefined || raw === null) {
    throw new Error('Failed to generate receipt number sequence value')
  }

  return Number(raw)
}

function getClientIp(request: NextRequest): string | undefined {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    undefined
  )
}

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) return unauthorizedResponse('Not logged in')

  const user = session.user as { role: string; schoolId: string | null }
  if (!user.schoolId) return errorResponse('SCHOOL_REQUIRED', 'No school context')
  const schoolId = user.schoolId

  const allowed = await hasPermission(schoolId, user.role, 'FEES.view_reports')
  if (!allowed) return forbiddenResponse('Missing FEES.view_reports permission')

  const { searchParams } = new URL(request.url)

  const studentId = searchParams.get('student_id')
  const classId = searchParams.get('class_id')
  const dateFrom = searchParams.get('date_from')
  const dateTo = searchParams.get('date_to')
  const page = Math.max(1, Number(searchParams.get('page') || 1))
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || 20)))

  const where: Prisma.FeePaymentWhereInput = {
    school_id: schoolId,
    ...(studentId ? { student_id: studentId } : {}),
    ...(classId
      ? {
          student: {
            class_id: classId,
          },
        }
      : {}),
    ...((dateFrom || dateTo)
      ? {
          payment_date: {
            ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
            ...(dateTo ? { lte: new Date(dateTo) } : {}),
          },
        }
      : {}),
  }

  const [total, records] = await Promise.all([
    prisma.feePayment.count({ where }),
    prisma.feePayment.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        student: {
          include: {
            class: {
              select: {
                name: true,
                section: true,
              },
            },
          },
        },
        structure: {
          include: {
            category: {
              select: {
                name: true,
              },
            },
          },
        },
        collector: {
          select: {
            first_name: true,
            last_name: true,
          },
        },
      },
      orderBy: [{ payment_date: 'desc' }, { created_at: 'desc' }],
    }),
  ])

  const totalPages = Math.ceil(total / limit)

  return successResponse({
    payments: records.map((payment) => ({
      id: payment.id,
      student_id: payment.student_id,
      student_name: `${payment.student.first_name} ${payment.student.last_name}`.trim(),
      class_name: `${payment.student.class?.name || 'N/A'} ${payment.student.class?.section || ''}`.trim(),
      category_name: payment.structure.category.name,
      amount_paid: toNumber(payment.amount_paid),
      payment_date: payment.payment_date.toISOString().split('T')[0],
      payment_mode: payment.payment_mode,
      receipt_number: payment.receipt_number,
      receipt_url: payment.receipt_url,
      collected_by: `${payment.collector.first_name} ${payment.collector.last_name}`.trim(),
      reference_number: payment.reference_number,
      remarks: payment.remarks,
    })),
    pagination: {
      total,
      page,
      limit,
      total_pages: totalPages,
    },
  })
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) return unauthorizedResponse('Not logged in')

  const user = session.user as { id: string; role: string; schoolId: string | null }
  if (!user.schoolId) return errorResponse('SCHOOL_REQUIRED', 'No school context')
  const schoolId = user.schoolId

  const allowed = await hasPermission(schoolId, user.role, 'FEES.record_payment')
  if (!allowed) return forbiddenResponse('Missing FEES.record_payment permission')

  const payload = await request.json().catch(() => null)
  const parsed = createPaymentSchema.safeParse(payload)
  if (!parsed.success) {
    return errorResponse('VALIDATION_ERROR', parsed.error.issues[0]?.message || 'Invalid payload')
  }

  const input = parsed.data

  const [staff, school, receiptPrefixSetting, student, structure, payments, concessions] = await Promise.all([
    prisma.staff.findFirst({
      where: { school_id: schoolId, user_id: user.id },
      select: { id: true, first_name: true, last_name: true },
    }),
    prisma.school.findFirst({
      where: { id: schoolId },
      select: { id: true, name: true, slug: true, address: true, phone: true },
    }),
    prisma.schoolSetting.findFirst({
      where: { school_id: schoolId, setting_key: 'receipt_prefix' },
      select: { setting_value: true },
    }),
    prisma.student.findFirst({
      where: { id: input.student_id, school_id: schoolId },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        admission_number: true,
        class_id: true,
      },
    }),
    prisma.feeStructure.findFirst({
      where: { id: input.fee_structure_id, school_id: schoolId },
      include: {
        category: {
          select: {
            name: true,
          },
        },
        class: {
          select: {
            id: true,
            name: true,
            section: true,
          },
        },
        academic_year: {
          select: {
            name: true,
          },
        },
      },
    }),
    prisma.feePayment.findMany({
      where: {
        school_id: schoolId,
        student_id: input.student_id,
        fee_structure_id: input.fee_structure_id,
      },
      select: {
        amount_paid: true,
      },
    }),
    prisma.feeConcession.findMany({
      where: {
        school_id: schoolId,
        student_id: input.student_id,
        fee_structure_id: input.fee_structure_id,
        status: 'APPROVED',
      },
      select: {
        concession_type: true,
        concession_value: true,
      },
    }),
  ])

  if (!staff) {
    return errorResponse('STAFF_NOT_FOUND', 'No staff profile found for current user', 404)
  }

  if (!school) {
    return errorResponse('SCHOOL_NOT_FOUND', 'School record not found', 404)
  }

  if (!student) {
    return errorResponse('STUDENT_NOT_FOUND', 'Student not found', 404)
  }

  if (!structure) {
    return errorResponse('FEE_STRUCTURE_NOT_FOUND', 'Fee structure not found', 404)
  }

  if (!student.class_id || student.class_id !== structure.class_id) {
    return errorResponse('INVALID_STUDENT_STRUCTURE', 'Selected fee structure does not belong to student class', 400)
  }

  const feeAmount = toNumber(structure.amount)
  const totalPaidBefore = payments.reduce((sum, item) => sum + toNumber(item.amount_paid), 0)
  const concessionAmount = concessions.reduce(
    (sum, concession) =>
      sum +
      computeConcessionDeduction(
        feeAmount,
        concession.concession_type,
        toNumber(concession.concession_value)
      ),
    0
  )

  const balanceBeforePayment = Number((feeAmount - concessionAmount - totalPaidBefore).toFixed(2))
  const overpayment = isOverpayment(input.amount_paid, balanceBeforePayment)

  const receiptPrefix = normalizeReceiptPrefix(receiptPrefixSetting?.setting_value)
  const sequenceName = sanitizeSequenceName(school.slug)

  let paymentRecord: any = null
  let receiptNumber = ''

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const created = await prisma.$transaction(async (tx) => {
        const sequenceValue = await getNextSequenceValue(tx, sequenceName)
        const formatted = formatReceiptNumber(receiptPrefix, input.payment_date, sequenceValue)

        const payment = await tx.feePayment.create({
          data: {
            school_id: schoolId,
            student_id: input.student_id,
            fee_structure_id: input.fee_structure_id,
            amount_paid: input.amount_paid,
            payment_date: new Date(input.payment_date),
            payment_mode: input.payment_mode,
            receipt_number: formatted,
            reference_number: input.reference_number?.trim() || null,
            remarks: input.remarks?.trim() || null,
            collected_by: staff.id,
          },
          include: {
            structure: {
              include: {
                category: true,
                class: true,
                academic_year: true,
              },
            },
            student: true,
            collector: true,
          },
        })

        return { payment, formatted }
      })

      paymentRecord = created.payment
      receiptNumber = created.formatted
      break
    } catch (error) {
      const prismaError = error as Prisma.PrismaClientKnownRequestError
      if (prismaError.code === 'P2002' && attempt < 1) {
        continue
      }
      throw error
    }
  }

  if (!paymentRecord) {
    return errorResponse('PAYMENT_CREATE_FAILED', 'Failed to create payment record', 500)
  }

  const newBalance = Number((balanceBeforePayment - input.amount_paid).toFixed(2))

  let receiptUrl: string | null = null
  try {
    const pdfBuffer = await renderToBuffer(
      createElement(FeeReceiptTemplate, {
        data: {
          schoolName: school.name,
          schoolAddress: school.address,
          schoolPhone: school.phone,
          receiptNumber,
          paymentDate: input.payment_date,
          studentName: `${student.first_name} ${student.last_name}`.trim(),
          className: `${structure.class.name} ${structure.class.section || ''}`.trim(),
          admissionNumber: student.admission_number,
          categoryName: structure.category.name,
          amountPaid: input.amount_paid,
          paymentMode: input.payment_mode,
          referenceNumber: input.reference_number,
          balanceRemaining: newBalance,
          collectedBy: `${staff.first_name} ${staff.last_name}`.trim(),
          remarks: input.remarks,
        },
      }) as any
    )

    const storageKey = buildReceiptStorageKey({
      schoolSlug: school.slug,
      academicYear: structure.academic_year.name,
      receiptNumber,
    })

    receiptUrl = await uploadFile(storageKey, pdfBuffer, 'application/pdf')

    paymentRecord = await prisma.feePayment.update({
      where: { id: paymentRecord.id, school_id: schoolId },
      data: {
        receipt_url: receiptUrl,
        updated_at: new Date(),
      },
      include: {
        structure: {
          include: {
            category: true,
            class: true,
            academic_year: true,
          },
        },
        student: true,
        collector: true,
      },
    })
  } catch {
    // If receipt generation/upload fails, payment is already committed.
    receiptUrl = paymentRecord.receipt_url
  }

  await cacheDel(getFeeBalanceCacheKey(schoolId, student.id))

  await createAuditLog({
    school_id: schoolId,
    user_id: user.id,
    action: 'CREATE',
    entity_type: 'fee_payment',
    entity_id: paymentRecord.id,
    new_value: paymentRecord as unknown as Record<string, unknown>,
    ip_address: getClientIp(request),
    user_agent: request.headers.get('user-agent') || undefined,
  })

  return NextResponse.json(
    {
      success: true,
      data: {
        id: paymentRecord.id,
        student_id: paymentRecord.student_id,
        fee_structure_id: paymentRecord.fee_structure_id,
        amount_paid: toNumber(paymentRecord.amount_paid),
        payment_date: paymentRecord.payment_date.toISOString().split('T')[0],
        payment_mode: paymentRecord.payment_mode,
        receipt_number: paymentRecord.receipt_number,
        receipt_url: receiptUrl,
        balance_before_payment: balanceBeforePayment,
        balance_after_payment: newBalance,
        overpayment_warning: overpayment,
      },
      ...(overpayment
        ? {
            warning:
              'Payment amount exceeds current balance. This payment has been recorded as overpayment.',
          }
        : {}),
    },
    { status: overpayment ? 200 : 201 }
  )
}
