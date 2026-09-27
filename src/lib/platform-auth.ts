import { auth } from '@/lib/auth'
import { forbiddenResponse, unauthorizedResponse } from '@/lib/api-helpers'

export interface PlatformUser {
  id: string
  email?: string | null
  role: string
  schoolId: string | null
}

export async function requireSuperAdmin() {
  const session = await auth()
  if (!session?.user) {
    return {
      error: unauthorizedResponse('No valid session'),
      user: null,
    }
  }

  if (session.user.role !== 'SUPER_ADMIN') {
    return {
      error: forbiddenResponse('Only SUPER_ADMIN can access this route'),
      user: null,
    }
  }

  return {
    error: null,
    user: session.user as PlatformUser,
  }
}
