import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import {
  successResponse,
  unauthorizedResponse,
  forbiddenResponse,
  errorResponse,
} from '@/lib/api-helpers'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return unauthorizedResponse('No valid session')
  }

  const user = session.user as { role?: string; schoolId?: string | null }
  const schoolId = user.schoolId ?? null

  if (!schoolId) {
    return errorResponse('SCHOOL_REQUIRED', 'School context is missing')
  }

  if (user.role !== 'STUDENT' && user.role !== 'PARENT') {
    return forbiddenResponse('Only portal users can access homework')
  }

  return successResponse({
    homework: [],
    pagination: { total: 0, page: 1, limit: 20, total_pages: 0 },
  })
}
