import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/permissions'
import { createAuditLog } from '@/lib/audit'
import {
  errorResponse,
  forbiddenResponse,
  successResponse,
  unauthorizedResponse,
} from '@/lib/api-helpers'

const upsertFeeStructureSchema = z.object({
  academic_year_id: z.string().uuid(),
  class_id: z.string().uuid(),
  fee_category_id: z.string().uuid(),
  amount: z.number().positive('Amount must be greater than 0'),
  due_date: z.string().date().optional().nullable(),
  frequency: z.enum(['ONE_TIME', 'MONTHLY', 'QUARTERLY', 'ANNUALLY']),
})

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) return unauthorizedResponse('Not logged in')

  const user = session.user as { id: string; role: string; schoolId: string | null }
  if (!user.schoolId) return errorResponse('SCHOOL_REQUIRED', 'No school context')

  const allowed = await hasPermission(user.schoolId, user.role, 'FEES.view_structure')
  if (!allowed) {
    return forbiddenResponse('Missing FEES.view_structure permission')
  }

  const { searchParams } = new URL(request.url)
  const academicYearId = searchParams.get('academic_year_id')
  const classId = searchParams.get('class_id')
  const feeCategoryId = searchParams.get('fee_category_id')

  const structures = await prisma.feeStructure.findMany({
    where: {
      school_id: user.schoolId,
      ...(academicYearId ? { academic_year_id: academicYearId } : {}),
      ...(classId ? { class_id: classId } : {}),
      ...(feeCategoryId ? { fee_category_id: feeCategoryId } : {}),
    },
    include: {
      class: {
        select: {
          id: true,
          name: true,
          section: true,
        },
      },
      category: {
        select: {
          id: true,
          name: true,
        },
      },
      academic_year: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: [
      { academic_year: { start_date: 'desc' } },
      { class: { name: 'asc' } },
      { category: { name: 'asc' } },
    ],
  })

  return successResponse(
    structures.map((structure) => ({
      id: structure.id,
      academic_year_id: structure.academic_year_id,
      academic_year_name: structure.academic_year.name,
      class_id: structure.class_id,
      class_name: `${structure.class.name} ${structure.class.section || ''}`.trim(),
      fee_category_id: structure.fee_category_id,
      category_name: structure.category.name,
      amount: Number(structure.amount),
      due_date: structure.due_date ? structure.due_date.toISOString().split('T')[0] : null,
      frequency: structure.frequency,
      created_at: structure.created_at,
      updated_at: structure.updated_at,
    }))
  )
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) return unauthorizedResponse('Not logged in')

  const user = session.user as { id: string; role: string; schoolId: string | null }
  if (!user.schoolId) return errorResponse('SCHOOL_REQUIRED', 'No school context')

  const allowed = await hasPermission(user.schoolId, user.role, 'FEES.configure_structure')
  if (!allowed) {
    return forbiddenResponse('Missing FEES.configure_structure permission')
  }

  if (user.role !== 'PRINCIPAL' && user.role !== 'SUPER_ADMIN') {
    return forbiddenResponse('Only PRINCIPAL can configure fee structures')
  }

  const payload = await request.json().catch(() => null)
  const parsed = upsertFeeStructureSchema.safeParse(payload)
  if (!parsed.success) {
    return errorResponse('VALIDATION_ERROR', parsed.error.issues[0]?.message || 'Invalid payload')
  }

  const input = parsed.data

  const [academicYear, schoolClass, category] = await Promise.all([
    prisma.academicYear.findFirst({
      where: { id: input.academic_year_id, school_id: user.schoolId },
      select: { id: true },
    }),
    prisma.class.findFirst({
      where: { id: input.class_id, school_id: user.schoolId, academic_year_id: input.academic_year_id },
      select: { id: true },
    }),
    prisma.feeCategory.findFirst({
      where: { id: input.fee_category_id, school_id: user.schoolId },
      select: { id: true },
    }),
  ])

  if (!academicYear) {
    return errorResponse('INVALID_ACADEMIC_YEAR', 'Academic year not found', 404)
  }
  if (!schoolClass) {
    return errorResponse('INVALID_CLASS', 'Class not found for this academic year', 404)
  }
  if (!category) {
    return errorResponse('INVALID_FEE_CATEGORY', 'Fee category not found', 404)
  }

  const existing = await prisma.feeStructure.findFirst({
    where: {
      school_id: user.schoolId,
      academic_year_id: input.academic_year_id,
      class_id: input.class_id,
      fee_category_id: input.fee_category_id,
    },
  })

  const saved = await prisma.feeStructure.upsert({
    where: {
      school_id_academic_year_id_class_id_fee_category_id: {
        school_id: user.schoolId,
        academic_year_id: input.academic_year_id,
        class_id: input.class_id,
        fee_category_id: input.fee_category_id,
      },
    },
    create: {
      school_id: user.schoolId,
      academic_year_id: input.academic_year_id,
      class_id: input.class_id,
      fee_category_id: input.fee_category_id,
      amount: input.amount,
      due_date: input.due_date ? new Date(input.due_date) : null,
      frequency: input.frequency,
    },
    update: {
      amount: input.amount,
      due_date: input.due_date ? new Date(input.due_date) : null,
      frequency: input.frequency,
      updated_at: new Date(),
    },
  })

  await createAuditLog({
    school_id: user.schoolId,
    user_id: user.id,
    action: existing ? 'UPDATE' : 'CREATE',
    entity_type: 'fee_structure',
    entity_id: saved.id,
    old_value: existing as unknown as Record<string, unknown>,
    new_value: saved as unknown as Record<string, unknown>,
    ip_address:
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || undefined,
    user_agent: request.headers.get('user-agent') || undefined,
  })

  return NextResponse.json(
    {
      success: true,
      data: {
        id: saved.id,
        academic_year_id: saved.academic_year_id,
        class_id: saved.class_id,
        fee_category_id: saved.fee_category_id,
        amount: Number(saved.amount),
        due_date: saved.due_date ? saved.due_date.toISOString().split('T')[0] : null,
        frequency: saved.frequency,
      },
    },
    { status: existing ? 200 : 201 }
  )
}
