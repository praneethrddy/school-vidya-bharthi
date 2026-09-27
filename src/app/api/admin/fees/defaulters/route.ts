import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import {
  errorResponse,
  forbiddenResponse,
  successResponse,
  unauthorizedResponse,
} from '@/lib/api-helpers'
import { computeConcessionDeduction } from '@/lib/fee-utils'
import { hasPermission } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) return unauthorizedResponse('Not logged in')

  const user = session.user as { role: string; schoolId: string | null }
  if (!user.schoolId) return errorResponse('SCHOOL_REQUIRED', 'No school context')

  const allowed = await hasPermission(user.schoolId, user.role, 'FEES.view_defaulters')
  if (!allowed) {
    return forbiddenResponse('Missing FEES.view_defaulters permission')
  }

  const { searchParams } = new URL(request.url)
  const classId = searchParams.get('class_id')
  const dueDateBefore = searchParams.get('due_date_before')
  const minBalance = Math.max(0, Number(searchParams.get('min_balance') || 0))
  const page = Math.max(1, Number(searchParams.get('page') || 1))
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || 20)))

  const currentYear = await prisma.academicYear.findFirst({
    where: {
      school_id: user.schoolId,
      is_current: true,
    },
    select: {
      id: true,
    },
  })

  if (!currentYear) {
    return successResponse({
      defaulters: [],
      pagination: { total: 0, page, limit, total_pages: 0 },
      total_outstanding: 0,
    })
  }

  const students = await prisma.student.findMany({
    where: {
      school_id: user.schoolId,
      academic_year_id: currentYear.id,
      is_active: true,
      ...(classId ? { class_id: classId } : {}),
    },
    include: {
      class: {
        select: {
          id: true,
          name: true,
          section: true,
        },
      },
      parents: {
        include: {
          parent: {
            select: {
              first_name: true,
              last_name: true,
              phone: true,
            },
          },
        },
      },
    },
    orderBy: [{ first_name: 'asc' }, { last_name: 'asc' }],
  })

  if (!students.length) {
    return successResponse({
      defaulters: [],
      pagination: { total: 0, page, limit, total_pages: 0 },
      total_outstanding: 0,
    })
  }

  const classIds = Array.from(new Set(students.map((student) => student.class_id).filter(Boolean))) as string[]

  const structures = await prisma.feeStructure.findMany({
    where: {
      school_id: user.schoolId,
      academic_year_id: currentYear.id,
      class_id: {
        in: classIds,
      },
      ...(dueDateBefore
        ? {
            due_date: {
              lte: new Date(dueDateBefore),
            },
          }
        : {}),
    },
    include: {
      category: {
        select: {
          name: true,
        },
      },
    },
  })

  if (!structures.length) {
    return successResponse({
      defaulters: [],
      pagination: { total: 0, page, limit, total_pages: 0 },
      total_outstanding: 0,
    })
  }

  const structureIds = structures.map((structure) => structure.id)
  const studentIds = students.map((student) => student.id)

  const [payments, concessions] = await Promise.all([
    prisma.feePayment.findMany({
      where: {
        school_id: user.schoolId,
        student_id: {
          in: studentIds,
        },
        fee_structure_id: {
          in: structureIds,
        },
      },
      select: {
        student_id: true,
        fee_structure_id: true,
        amount_paid: true,
      },
    }),
    prisma.feeConcession.findMany({
      where: {
        school_id: user.schoolId,
        student_id: {
          in: studentIds,
        },
        fee_structure_id: {
          in: structureIds,
        },
        status: 'APPROVED',
      },
      select: {
        student_id: true,
        fee_structure_id: true,
        concession_type: true,
        concession_value: true,
      },
    }),
  ])

  const structureMap = new Map(structures.map((structure) => [structure.id, structure]))
  const structuresByClass = new Map<string, typeof structures>()

  for (const structure of structures) {
    const list = structuresByClass.get(structure.class_id) || []
    list.push(structure)
    structuresByClass.set(structure.class_id, list)
  }

  const paidByStudentStructure = new Map<string, number>()
  for (const payment of payments) {
    const key = `${payment.student_id}:${payment.fee_structure_id}`
    const current = paidByStudentStructure.get(key) || 0
    paidByStudentStructure.set(key, current + payment.amount_paid.toNumber())
  }

  const concessionByStudentStructure = new Map<string, number>()
  for (const concession of concessions) {
    const structure = structureMap.get(concession.fee_structure_id)
    if (!structure) continue

    const deduction = computeConcessionDeduction(
      structure.amount.toNumber(),
      concession.concession_type,
      concession.concession_value.toNumber()
    )

    const key = `${concession.student_id}:${concession.fee_structure_id}`
    const current = concessionByStudentStructure.get(key) || 0
    concessionByStudentStructure.set(key, current + deduction)
  }

  const defaulters = students
    .map((student) => {
      const classStructures = student.class_id ? structuresByClass.get(student.class_id) || [] : []

      let totalDue = 0
      let totalPaid = 0
      let totalBalance = 0
      const overdueCategories: string[] = []

      for (const structure of classStructures) {
        const amount = structure.amount.toNumber()
        const key = `${student.id}:${structure.id}`
        const paid = paidByStudentStructure.get(key) || 0
        const concession = concessionByStudentStructure.get(key) || 0
        const netDue = amount - concession
        const balance = netDue - paid

        totalDue += netDue
        totalPaid += paid
        totalBalance += balance

        if (balance > 0) {
          overdueCategories.push(structure.category.name)
        }
      }

      const primaryParentLink =
        student.parents.find((link) => link.is_primary) ||
        student.parents[0]

      return {
        student_id: student.id,
        student_name: `${student.first_name} ${student.last_name}`.trim(),
        class_name: `${student.class?.name || 'N/A'} ${student.class?.section || ''}`.trim(),
        parent_name: primaryParentLink
          ? `${primaryParentLink.parent.first_name} ${primaryParentLink.parent.last_name}`.trim()
          : null,
        parent_phone: primaryParentLink?.parent.phone || null,
        total_due: Number(totalDue.toFixed(2)),
        total_paid: Number(totalPaid.toFixed(2)),
        balance: Number(totalBalance.toFixed(2)),
        overdue_categories: Array.from(new Set(overdueCategories)),
      }
    })
    .filter((item) => item.balance >= minBalance && item.balance > 0)
    .sort((a, b) => b.balance - a.balance)

  const total = defaulters.length
  const totalPages = Math.ceil(total / limit)
  const paginated = defaulters.slice((page - 1) * limit, (page - 1) * limit + limit)
  const totalOutstanding = defaulters.reduce((sum, item) => sum + item.balance, 0)

  return successResponse({
    defaulters: paginated,
    pagination: {
      total,
      page,
      limit,
      total_pages: totalPages,
    },
    total_outstanding: Number(totalOutstanding.toFixed(2)),
  })
}
