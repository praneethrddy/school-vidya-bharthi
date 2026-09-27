import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'
import {
  errorResponse,
  forbiddenResponse,
  successResponse,
  unauthorizedResponse,
} from '@/lib/api-helpers'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user) {
    return unauthorizedResponse('No valid session')
  }

  const user = session.user as { id?: string; role?: string; schoolId?: string | null }
  const schoolId = user.schoolId ?? null

  if (!schoolId) {
    return errorResponse('SCHOOL_REQUIRED', 'School context is missing')
  }

  if (user.role !== 'PARENT') {
    return forbiddenResponse('Only parents can cancel PTM bookings')
  }

  const body = await request.json()
  if (!body?.booking_id) {
    return errorResponse('INVALID_PARAMS', 'booking_id is required')
  }

  const booking = await prisma.ptmBooking.findFirst({
    where: {
      id: body.booking_id,
      session_id: id,
      school_id: schoolId,
    },
  })

  if (!booking) {
    return errorResponse('NOT_FOUND', 'PTM booking not found', 404)
  }

  await createAuditLog({
    school_id: schoolId,
    user_id: user.id || '',
    action: 'DELETE',
    entity_type: 'ptm_booking',
    entity_id: body.booking_id,
    new_value: { booking_id: body.booking_id },
  })

  return successResponse(null)
}
