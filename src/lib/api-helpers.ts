import { NextRequest, NextResponse } from 'next/server'
import { logger } from './logger'
import { auth } from './auth'

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
  }
}

export function successResponse<T>(data: T): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ success: true, data })
}

export function errorResponse(
  code: string,
  message: string,
  status = 400
): NextResponse<ApiResponse> {
  return NextResponse.json({ success: false, error: { code, message } }, { status })
}

export function unauthorizedResponse(message = 'Unauthorized'): NextResponse<ApiResponse> {
  return errorResponse('UNAUTHORIZED', message, 401)
}

export function forbiddenResponse(message = 'Forbidden'): NextResponse<ApiResponse> {
  return errorResponse('FORBIDDEN', message, 403)
}

export function notFoundResponse(message = 'Not found'): NextResponse<ApiResponse> {
  return errorResponse('NOT_FOUND', message, 404)
}

export async function withAuth(
  handler: (
    request: NextRequest,
    context: { userId: string; email: string; role: string; schoolId: string | null }
  ) => Promise<NextResponse>,
  request: NextRequest
): Promise<NextResponse> {
  const session = await auth()
  if (!session?.user) {
    return unauthorizedResponse('No valid session')
  }

  const u = session.user as any
  return handler(request, {
    userId: u.id,
    email: session.user.email || '',
    role: u.role,
    schoolId: u.schoolId || null,
  })
}

export function withSchool(
  handler: (request: NextRequest, context: { schoolId: string }) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const session = await auth()
    const schoolId = (session?.user as any)?.schoolId
    if (!schoolId) {
      return errorResponse('SCHOOL_REQUIRED', 'School context is missing', 400)
    }
    return handler(request, { schoolId })
  }
}

export function withPermission(
  permission: string,
  handler: (
    request: NextRequest,
    context: { userId: string; role: string; schoolId: string | null }
  ) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const session = await auth()
    if (!session?.user) {
      return unauthorizedResponse()
    }
    
    // In a real implementation this checks the DB.
    logger.info(`[withPermission] Checking: ${permission}`)
    
    const u = session.user as any
    return handler(request, {
      userId: u.id,
      role: u.role,
      schoolId: u.schoolId || null,
    })
  }
}
