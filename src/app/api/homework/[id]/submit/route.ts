import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { createAuditLog } from '@/lib/audit'
import {
  successResponse,
  unauthorizedResponse,
  forbiddenResponse,
  errorResponse,
} from '@/lib/api-helpers'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const session = await auth()
  if (!session?.user) {
    return unauthorizedResponse('No valid session')
  }

  const user = session.user as { id: string; role?: string; schoolId?: string | null }
  const schoolId = user.schoolId ?? null

  if (!schoolId) {
    return errorResponse('SCHOOL_REQUIRED', 'School context is missing')
  }

  if (user.role !== 'STUDENT') {
    return forbiddenResponse('Only students can submit homework')
  }

  await createAuditLog({
    school_id: schoolId,
    user_id: user.id,
    action: 'CREATE',
    entity_type: 'homework_submission',
    entity_id: id,
    new_value: { homework_id: id }
  })

  return successResponse(null)
}
