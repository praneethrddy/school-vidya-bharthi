import { prisma } from '@/lib/prisma'
import { calculateBalance, getFeeStatus } from '@/lib/fee-utils'

export async function getFeesData(userId: string, schoolId: string, role: string, queryStudentId: string | null = null, queryAcademicYearId: string | null = null) {
  let targetStudentId = queryStudentId

  if (role === 'STUDENT') {
    const studentRecord = await prisma.student.findFirst({
      where: { user_id: userId, school_id: schoolId }
    })
    if (!studentRecord) {
      throw new Error('Student record not found')
    }
    if (queryStudentId && queryStudentId !== studentRecord.id) {
      throw new Error('Forbidden: Cannot access other student fees')
    }
    targetStudentId = studentRecord.id
  } else if (role === 'PARENT') {
    const parentRecord = await prisma.parent.findFirst({
      where: { user_id: userId, school_id: schoolId },
      include: { students: true }
    })
    if (!parentRecord) {
      throw new Error('Parent record not found')
    }
    const linkedStudentIds = parentRecord.students.map((s: any) => s.student_id)
    
    if (!targetStudentId) {
      targetStudentId = linkedStudentIds[0] // default to first child
    }
    if (!targetStudentId || !linkedStudentIds.includes(targetStudentId)) {
      throw new Error('Forbidden: Student not linked to parent')
    }
  }

  if (!targetStudentId) {
     throw new Error('Student ID required')
  }

  const student = await prisma.student.findUnique({
    where: { id: targetStudentId, school_id: schoolId },
    include: { class: true }
  })

  if (!student || !student.class_id) {
    throw new Error('Student or class not found')
  }

  // Determine academic year
  let academicYearId = queryAcademicYearId
  if (!academicYearId) {
    const currentYear = await prisma.academicYear.findFirst({
      where: { school_id: schoolId, is_current: true }
    })
    academicYearId = currentYear?.id || null
  }

  if (!academicYearId) {
    throw new Error('Academic year not found')
  }

  // Fetch fee structures for the student's class and academic year
  const feeStructures = await prisma.feeStructure.findMany({
    where: {
      school_id: schoolId,
      class_id: student.class_id,
      academic_year_id: academicYearId
    },
    include: {
      category: true,
      fee_payments: {
        where: { student_id: targetStudentId, school_id: schoolId }
      },
      fee_concessions: {
        where: { student_id: targetStudentId, school_id: schoolId, status: 'APPROVED' }
      }
    }
  })

  let total_fees = 0
  let total_concessions = 0
  let total_paid = 0
  let total_balance = 0

  const allPayments: any[] = []

  const fee_details = feeStructures.map((structure: any) => {
    const amount = Number(structure.amount)

    let mappedConcession = null
    let concessionDeduction = 0

    if (structure.fee_concessions.length > 0) {
      const c = structure.fee_concessions[0]
      mappedConcession = {
        type: c.concession_type,
        value: Number(c.concession_value),
        status: c.status
      }
    }

    const paymentsForCalc = structure.fee_payments.map((p: any) => ({ amount_paid: Number(p.amount_paid) }))
    
    const balance = calculateBalance(amount, paymentsForCalc, mappedConcession)
    
    if (mappedConcession && mappedConcession.status === 'APPROVED') {
        concessionDeduction = mappedConcession.type === 'PERCENTAGE' ? amount * (mappedConcession.value / 100) : mappedConcession.value
    }

    const totalPaidAmount = paymentsForCalc.reduce((sum: number, p: any) => sum + p.amount_paid, 0)
    
    total_fees += amount
    total_concessions += concessionDeduction
    total_paid += totalPaidAmount
    total_balance += Math.max(0, balance)

    const mappedPayments = structure.fee_payments.map((p: any) => {
      const paymentObj = {
        id: p.id,
        amount_paid: Number(p.amount_paid),
        payment_date: p.payment_date.toISOString(),
        payment_mode: p.payment_mode,
        receipt_number: p.receipt_number,
        receipt_url: p.receipt_url,
        category_name: structure.category.name
      }
      allPayments.push({ ...paymentObj, fee_structure_id: structure.id })
      return paymentObj
    })

    return {
      fee_structure_id: structure.id,
      category_name: structure.category.name,
      amount,
      frequency: structure.frequency,
      due_date: structure.due_date ? structure.due_date.toISOString() : null,
      concession: mappedConcession ? { ...mappedConcession, deduction: concessionDeduction } : null,
      total_paid: totalPaidAmount,
      balance,
      status: getFeeStatus(amount, balance, concessionDeduction),
      payments: mappedPayments
    }
  })

  return {
    fee_summary: {
      total_fees,
      total_concessions,
      total_paid,
      total_balance
    },
    fee_details,
    all_payments: allPayments
  }
}
