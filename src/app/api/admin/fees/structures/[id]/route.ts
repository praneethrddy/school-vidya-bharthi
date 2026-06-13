import { NextRequest } from 'next/server'
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

function getClientIp(request: NextRequest): string | undefined {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    undefined
  )
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return unauthorizedResponse('Not logged in')

  const user = session.user as { id: string; role: string; schoolId: string | null }
  if (!user.schoolId) return errorResponse('SCHOOL_REQUIRED', 'No school context')

  const allowed = await hasPermission(user.schoolId, user.role, 'FEES.configure_structure')
  if (!allowed) return forbiddenResponse('Missing FEES.configure_structure permission')

  if (user.role !== 'PRINCIPAL' && user.role !== 'SUPER_ADMIN') {
    return forbiddenResponse('Only PRINCIPAL can delete fee structures')
  }

  const { id } = await params

  const existing = await prisma.feeStructure.findFirst({
    where: {
      id,
      school_id: user.schoolId,
    },
  })

  if (!existing) {
    return errorResponse('NOT_FOUND', 'Fee structure not found', 404)
  }

  const linkedPayments = await prisma.feePayment.count({
    where: {
      school_id: user.schoolId,
      fee_structure_id: id,
    },
  })

  if (linkedPayments > 0) {
    return errorResponse(
      'FEE_STRUCTURE_HAS_PAYMENTS',
      'Cannot delete fee structure with recorded payments',
      409
    )
  }

  await prisma.feeStructure.deleteMany({
    where: { id, school_id: user.schoolId },
  })

  await createAuditLog({
    school_id: user.schoolId,
    user_id: user.id,
    action: 'DELETE',
    entity_type: 'fee_structure',
    entity_id: id,
    old_value: existing as unknown as Record<string, unknown>,
    ip_address: getClientIp(request),
    user_agent: request.headers.get('user-agent') || undefined,
  })

  return successResponse({ message: 'Fee structure deleted successfully' })
}
