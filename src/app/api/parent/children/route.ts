import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import {
  forbiddenResponse,
  successResponse,
  unauthorizedResponse,
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

  if (user.role !== 'PARENT') {
    return forbiddenResponse('Only parents can access linked children')
  }

  return successResponse({ children: [] })
}
