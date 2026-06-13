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
    return forbiddenResponse('Only parents can book PTM slots')
  }

  const body = await request.json()
  if (!body?.slot_id) {
    return errorResponse('INVALID_PARAMS', 'slot_id is required')
  }

  const existingBooking = await prisma.ptmBooking.findFirst({
    where: {
      school_id: schoolId,
      session_id: id,
      notes: `slot:${body.slot_id}`,
    },
  })

  if (existingBooking) {
    return errorResponse('DUPLICATE_BOOKING', 'This PTM slot is already booked', 409)
  }

  await createAuditLog({
    school_id: schoolId,
    user_id: user.id || '',
    action: 'CREATE',
    entity_type: 'ptm_booking',
    entity_id: id,
    new_value: { slot_id: body.slot_id },
  })

  return successResponse(null)
}
