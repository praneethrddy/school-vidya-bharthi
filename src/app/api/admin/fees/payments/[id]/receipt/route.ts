import { renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { buildReceiptStorageKey, computeConcessionDeduction } from '@/lib/fee-utils'
import { uploadFile } from '@/lib/r2'
import {
  errorResponse,
  forbiddenResponse,
  notFoundResponse,
  unauthorizedResponse,
} from '@/lib/api-helpers'
import { FeeReceiptTemplate } from '@/components/admin/fee-receipt-template'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return unauthorizedResponse('Not logged in')

  const user = session.user as { role: string; schoolId: string | null }
  if (!user.schoolId) return errorResponse('SCHOOL_REQUIRED', 'No school context')
  const schoolId = user.schoolId

  const allowed = await hasPermission(schoolId, user.role, 'FEES.generate_receipt')
  if (!allowed) return forbiddenResponse('Missing FEES.generate_receipt permission')

  const { id } = await params

  const payment = await prisma.feePayment.findFirst({
    where: {
      id,
      school_id: schoolId,
    },
    include: {
      school: {
        select: {
          name: true,
          address: true,
          phone: true,
          slug: true,
        },
      },
      student: {
        select: {
          id: true,
          first_name: true,
          last_name: true,
          admission_number: true,
        },
      },
      collector: {
        select: {
          first_name: true,
          last_name: true,
        },
      },
      structure: {
        include: {
          category: {
            select: {
              name: true,
            },
          },
          class: {
            select: {
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
      },
    },
  })

  if (!payment) {
    return notFoundResponse('Payment not found')
  }

  if (payment.receipt_url) {
    return NextResponse.redirect(payment.receipt_url)
  }

  const [allPayments, approvedConcessions] = await Promise.all([
    prisma.feePayment.findMany({
      where: {
        school_id: schoolId,
        student_id: payment.student_id,
        fee_structure_id: payment.fee_structure_id,
      },
      select: {
        amount_paid: true,
      },
    }),
    prisma.feeConcession.findMany({
      where: {
        school_id: schoolId,
        student_id: payment.student_id,
        fee_structure_id: payment.fee_structure_id,
        status: 'APPROVED',
      },
      select: {
        concession_type: true,
        concession_value: true,
      },
    }),
  ])

  const amount = payment.structure.amount.toNumber()
  const paidTotal = allPayments.reduce((sum, item) => sum + item.amount_paid.toNumber(), 0)
  const concessionTotal = approvedConcessions.reduce(
    (sum, concession) =>
      sum + computeConcessionDeduction(amount, concession.concession_type, concession.concession_value.toNumber()),
    0
  )

  const balanceRemaining = Number((amount - concessionTotal - paidTotal).toFixed(2))

  const pdfBuffer = await renderToBuffer(
    createElement(FeeReceiptTemplate, {
      data: {
        schoolName: payment.school.name,
        schoolAddress: payment.school.address,
        schoolPhone: payment.school.phone,
        receiptNumber: payment.receipt_number,
        paymentDate: payment.payment_date.toISOString().split('T')[0],
        studentName: `${payment.student.first_name} ${payment.student.last_name}`.trim(),
        className: `${payment.structure.class.name} ${payment.structure.class.section || ''}`.trim(),
        admissionNumber: payment.student.admission_number,
        categoryName: payment.structure.category.name,
        amountPaid: payment.amount_paid.toNumber(),
        paymentMode: payment.payment_mode,
        referenceNumber: payment.reference_number,
        balanceRemaining,
        collectedBy: `${payment.collector.first_name} ${payment.collector.last_name}`.trim(),
        remarks: payment.remarks,
      },
    }) as any
  )

  const storageKey = buildReceiptStorageKey({
    schoolSlug: payment.school.slug,
    academicYear: payment.structure.academic_year.name,
    receiptNumber: payment.receipt_number,
  })

  const receiptUrl = await uploadFile(storageKey, pdfBuffer, 'application/pdf')

  await prisma.feePayment.update({
    where: { id: payment.id, school_id: schoolId },
    data: {
      receipt_url: receiptUrl,
      updated_at: new Date(),
    },
  })

  return NextResponse.redirect(receiptUrl)
}
