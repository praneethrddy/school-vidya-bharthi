import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { createAuditLog } from '@/lib/audit'
import { cacheDel } from '@/lib/cache'
import {
  errorResponse,
  forbiddenResponse,
  notFoundResponse,
  unauthorizedResponse,
} from '@/lib/api-helpers'
import { getFeeBalanceCacheKey } from '@/lib/fee-utils'
import { createNotification } from '@/lib/notification-service'
import { hasPermission } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

const approveConcessionSchema = z.object({
  action: z.enum(['APPROVED', 'REJECTED']),
  reason: z.string().max(1000).optional().nullable(),
})

function getClientIp(request: NextRequest): string | undefined {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    undefined
  )
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return unauthorizedResponse('Not logged in')

  const user = session.user as { id: string; role: string; schoolId: string | null }
  if (!user.schoolId) return errorResponse('SCHOOL_REQUIRED', 'No school context')

  const allowed = await hasPermission(user.schoolId, user.role, 'FEES.approve_concession')
  if (!allowed) return forbiddenResponse('Missing FEES.approve_concession permission')

  if (user.role !== 'PRINCIPAL' && user.role !== 'SUPER_ADMIN') {
    return forbiddenResponse('Only PRINCIPAL can approve or reject concessions')
  }

  const { id } = await params

  const payload = await request.json().catch(() => null)
  const parsed = approveConcessionSchema.safeParse(payload)
  if (!parsed.success) {
    return errorResponse('VALIDATION_ERROR', parsed.error.issues[0]?.message || 'Invalid payload')
  }

  const concession = await prisma.feeConcession.findFirst({
    where: { id, school_id: user.schoolId },
    include: {
      requester: {
        select: {
          id: true,
        },
      },
    },
  })

  if (!concession) {
    return notFoundResponse('Concession request not found')
  }

  if (concession.status !== 'PENDING') {
    return errorResponse('INVALID_STATE', 'Only pending requests can be reviewed', 409)
  }

  const decisionNote = parsed.data.reason?.trim()
  const mergedReason = decisionNote
    ? `${concession.reason}\n\nDecision Note: ${decisionNote}`
    : concession.reason

  const updated = await prisma.feeConcession.update({
    where: { id: concession.id, school_id: user.schoolId },
    data: {
      status: parsed.data.action,
      approved_by: user.id,
      approved_at: new Date(),
      reason: mergedReason,
      updated_at: new Date(),
    },
  })

  if (parsed.data.action === 'APPROVED') {
    await cacheDel(getFeeBalanceCacheKey(user.schoolId, concession.student_id))
  }

  await createAuditLog({
    school_id: user.schoolId,
    user_id: user.id,
    action: 'UPDATE',
    entity_type: 'fee_concession',
    entity_id: concession.id,
    old_value: concession as unknown as Record<string, unknown>,
    new_value: updated as unknown as Record<string, unknown>,
    ip_address: getClientIp(request),
    user_agent: request.headers.get('user-agent') || undefined,
  })

  await createNotification({
    school_id: user.schoolId,
    user_id: concession.requester.id,
    title: 'Concession request updated',
    message:
      parsed.data.action === 'APPROVED'
        ? 'Your fee concession request has been approved.'
        : 'Your fee concession request has been rejected.',
    type: 'FEE',
    link: '/admin/fees?tab=concessions',
  })

  return NextResponse.json({
    success: true,
    data: {
      id: updated.id,
      status: updated.status,
      approved_at: updated.approved_at,
    },
  })
}
