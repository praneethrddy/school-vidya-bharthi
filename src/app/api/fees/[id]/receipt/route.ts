import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { role, schoolId, id: userId } = session.user

    if (!schoolId) {
      return NextResponse.json({ error: 'No school associated' }, { status: 400 })
    }

    if (role !== 'STUDENT' && role !== 'PARENT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    const payment = await prisma.feePayment.findUnique({
      where: { id: id, school_id: schoolId },
      include: {
        student: true,
        structure: {
          include: {
            category: true,
            class: true
          }
        },
        collector: true
      }
    })

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    // Verify ownership
    if (role === 'STUDENT') {
      if (payment.student.user_id !== userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } else if (role === 'PARENT') {
      const parentRecord = await prisma.parent.findFirst({
        where: { user_id: userId, school_id: schoolId },
        include: { students: true }
      })
      if (!parentRecord) {
        return NextResponse.json({ error: 'Parent record not found' }, { status: 404 })
      }
      const linkedStudentIds = parentRecord.students.map((s: any) => s.student_id)
      if (!linkedStudentIds.includes(payment.student_id)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    if (payment.receipt_url) {
      return NextResponse.redirect(payment.receipt_url)
    }

    // In a full implementation we would generate the PDF here and upload it.
    // For now, we return the receipt data so the frontend can generate it with @react-pdf/renderer
    return NextResponse.json({ receiptData: payment })

  } catch (error: any) {
    console.error('Receipt API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
