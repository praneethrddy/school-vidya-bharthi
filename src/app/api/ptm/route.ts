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

const ADMIN_ROLES = new Set(['PRINCIPAL', 'SUPER_ADMIN', 'STAFF_ADMIN'])

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return unauthorizedResponse('No valid session')
  }

  const user = session.user as { schoolId?: string | null }
  const schoolId = user.schoolId ?? null

  if (!schoolId) {
    return errorResponse('SCHOOL_REQUIRED', 'School context is missing')
  }

  const sessions = await prisma.ptmSession.findMany({
    where: { school_id: schoolId, is_active: true },
    orderBy: { date: 'asc' },
  })

  return successResponse({ sessions })
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return unauthorizedResponse('No valid session')
  }

  const user = session.user as { id?: string; role?: string; schoolId?: string | null }
  const schoolId = user.schoolId ?? null

  if (!schoolId) {
    return errorResponse('SCHOOL_REQUIRED', 'School context is missing')
  }

  if (!ADMIN_ROLES.has(user.role ?? '')) {
    return forbiddenResponse('Only admin users can create PTM sessions')
  }

  const body = await request.json()
  if (!body?.title) {
    return errorResponse('INVALID_PARAMS', 'title is required')
  }

  const newSession = await prisma.ptmSession.create({
    data: {
      school_id: schoolId,
      title: body.title,
      date: new Date(body.date ?? '1970-01-01'),
      start_time: new Date(body.start_time ?? '1970-01-01T09:00:00.000Z'),
      end_time: new Date(body.end_time ?? '1970-01-01T09:15:00.000Z'),
      slot_duration_mins: body.slot_duration_mins ?? 15,
      class_id: body.class_id ?? null,
    },
  })

  await createAuditLog({
    school_id: schoolId,
    user_id: user.id || '',
    action: 'CREATE',
    entity_type: 'ptm_session',
    entity_id: newSession.id,
    new_value: { title: body.title },
  })

  return successResponse(null)
}
