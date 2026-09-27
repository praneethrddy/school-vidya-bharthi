import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { createAuditLog } from '@/lib/audit'
import {
  errorResponse,
  forbiddenResponse,
  successResponse,
  unauthorizedResponse,
} from '@/lib/api-helpers'
import { hasPermission } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { createBulkNotifications } from '@/lib/notification-service'

const createConcessionSchema = z.object({
  student_id: z.string().uuid(),
  fee_structure_id: z.string().uuid(),
  concession_type: z.enum(['PERCENTAGE', 'FIXED_AMOUNT']),
  concession_value: z.number().positive('Concession value must be greater than 0'),
  reason: z.string().min(5, 'Reason must be at least 5 characters').max(1500),
})

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

  const [canRequest, canApprove] = await Promise.all([
    hasPermission(user.schoolId, user.role, 'FEES.create_concession_request'),
    hasPermission(user.schoolId, user.role, 'FEES.approve_concession'),
  ])

  if (!canRequest && !canApprove) {
    return forbiddenResponse('Missing concession permissions')
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const studentId = searchParams.get('student_id')
  const classId = searchParams.get('class_id')

  const concessions = await prisma.feeConcession.findMany({
    where: {
      school_id: user.schoolId,
      ...(status ? { status: status as 'PENDING' | 'APPROVED' | 'REJECTED' } : {}),
      ...(studentId ? { student_id: studentId } : {}),
      ...(classId
        ? {
            student: {
              class_id: classId,
            },
          }
        : {}),
    },
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
      requester: {
        select: {
          id: true,
          email: true,
          role: true,
        },
      },
      approver: {
        select: {
          id: true,
          email: true,
          role: true,
        },
      },
    },
    orderBy: [{ created_at: 'desc' }],
  })

  return successResponse(
    concessions.map((concession) => ({
      id: concession.id,
      student_id: concession.student_id,
      student_name: `${concession.student.first_name} ${concession.student.last_name}`.trim(),
      class_name: `${concession.student.class?.name || 'N/A'} ${concession.student.class?.section || ''}`.trim(),
      fee_structure_id: concession.fee_structure_id,
      category_name: concession.structure.category.name,
      concession_type: concession.concession_type,
      concession_value: concession.concession_value.toNumber(),
      reason: concession.reason,
      status: concession.status,
      requested_by: concession.requested_by,
      requested_by_email: concession.requester.email,
      approved_by: concession.approved_by,
      approved_by_email: concession.approver?.email || null,
      approved_at: concession.approved_at,
      created_at: concession.created_at,
      updated_at: concession.updated_at,
    }))
  )
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) return unauthorizedResponse('Not logged in')

  const user = session.user as { id: string; role: string; schoolId: string | null }
  if (!user.schoolId) return errorResponse('SCHOOL_REQUIRED', 'No school context')

  const allowed = await hasPermission(user.schoolId, user.role, 'FEES.create_concession_request')
  if (!allowed) {
    return forbiddenResponse('Missing FEES.create_concession_request permission')
  }

  const payload = await request.json().catch(() => null)
  const parsed = createConcessionSchema.safeParse(payload)
  if (!parsed.success) {
    return errorResponse('VALIDATION_ERROR', parsed.error.issues[0]?.message || 'Invalid payload')
  }

  const input = parsed.data

  const [student, structure] = await Promise.all([
    prisma.student.findFirst({
      where: {
        id: input.student_id,
        school_id: user.schoolId,
      },
      select: {
        id: true,
        class_id: true,
      },
    }),
    prisma.feeStructure.findFirst({
      where: {
        id: input.fee_structure_id,
        school_id: user.schoolId,
      },
      select: {
        id: true,
        class_id: true,
        academic_year_id: true,
        amount: true,
      },
    }),
  ])

  if (!student) {
    return errorResponse('STUDENT_NOT_FOUND', 'Student not found', 404)
  }

  if (!structure) {
    return errorResponse('FEE_STRUCTURE_NOT_FOUND', 'Fee structure not found', 404)
  }

  if (!student.class_id || student.class_id !== structure.class_id) {
    return errorResponse('INVALID_REQUEST', 'Student does not belong to selected fee structure class', 400)
  }

  if (
    input.concession_type === 'PERCENTAGE' &&
    (input.concession_value <= 0 || input.concession_value > 100)
  ) {
    return errorResponse('VALIDATION_ERROR', 'Percentage concession must be between 0 and 100')
  }

  const created = await prisma.feeConcession.create({
    data: {
      school_id: user.schoolId,
      student_id: input.student_id,
      fee_structure_id: input.fee_structure_id,
      concession_type: input.concession_type,
      concession_value: input.concession_value,
      reason: input.reason.trim(),
      requested_by: user.id,
      academic_year_id: structure.academic_year_id,
      status: 'PENDING',
    },
  })

  await createAuditLog({
    school_id: user.schoolId,
    user_id: user.id,
    action: 'CREATE',
    entity_type: 'fee_concession',
    entity_id: created.id,
    new_value: created as unknown as Record<string, unknown>,
    ip_address: getClientIp(request),
    user_agent: request.headers.get('user-agent') || undefined,
  })

  const principals = await prisma.user.findMany({
    where: {
      school_id: user.schoolId,
      role: 'PRINCIPAL',
      is_active: true,
    },
    select: {
      id: true,
    },
  })

  await createBulkNotifications(
    principals.map((principal) => ({
      school_id: user.schoolId as string,
      user_id: principal.id,
      title: 'New fee concession request',
      message: 'A fee concession request is waiting for your review.',
      type: 'FEE' as const,
      link: '/admin/fees?tab=concessions',
    }))
  )

  return NextResponse.json(
    {
      success: true,
      data: {
        id: created.id,
        status: created.status,
      },
    },
    { status: 201 }
  )
}
