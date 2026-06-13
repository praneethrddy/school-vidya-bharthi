import { NextRequest, NextResponse } from 'next/server'
import { headers as nextHeaders } from 'next/headers'
import { auth } from '@/lib/auth'
import {
  errorResponse,
  forbiddenResponse,
  unauthorizedResponse,
} from '@/lib/api-helpers'
import { hasPermission } from '@/lib/permissions'

export interface SessionUser {
  id: string
  role: string
  schoolId: string | null
}

export interface SchoolSessionUser extends Omit<SessionUser, 'schoolId'> {
  schoolId: string
}

type AuthResult =
  | { error: NextResponse; user: null }
  | { error: null; user: SchoolSessionUser }

export function isPrincipalRole(role: string): boolean {
  return role === 'PRINCIPAL' || role === 'SUPER_ADMIN'
}

export function getRequestMetadata(request: NextRequest): {
  ip_address?: string
  user_agent?: string
} {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    undefined

  return {
    ip_address: ip,
    user_agent: request.headers.get('user-agent') || undefined,
  }
}

export async function requireSchoolPermission(
  permissionCode: string,
  options?: { principalOnly?: boolean }
): Promise<AuthResult> {
  const session = await auth()
  if (!session?.user) {
    return {
      error: unauthorizedResponse('No valid session'),
      user: null,
    }
  }

  const user = session.user as SessionUser
  if (!user.schoolId) {
    return {
      error: errorResponse(
        'SCHOOL_REQUIRED',
        'School context is missing for this account',
        400
      ),
      user: null,
    }
  }

  const requestHeaders = await nextHeaders()
  const requestSchoolId = requestHeaders.get('x-school-id')
  if (requestSchoolId && requestSchoolId !== user.schoolId && user.role !== 'SUPER_ADMIN') {
    return {
      error: forbiddenResponse('Cross-tenant access detected'),
      user: null,
    }
  }

  const hasRequiredPermission = await hasPermission(
    user.schoolId,
    user.role,
    permissionCode
  )

  if (!hasRequiredPermission) {
    return {
      error: forbiddenResponse(`Missing permission: ${permissionCode}`),
      user: null,
    }
  }

  if (options?.principalOnly && !isPrincipalRole(user.role)) {
    return {
      error: forbiddenResponse('Only Principal can perform this action'),
      user: null,
    }
  }

  return {
    error: null,
    user: {
      id: user.id,
      role: user.role,
      schoolId: user.schoolId,
    },
  }
}
