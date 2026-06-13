import { Role } from '@prisma/client'

export function getRedirectPath(role: Role | string): string {
  switch (role) {
    case 'SUPER_ADMIN':
      return '/super-admin/dashboard'
    case 'PRINCIPAL':
    case 'STAFF_ADMIN':
    case 'STUDENT_ADMIN':
    case 'ACCOUNTANT':
    case 'TEACHER':
      return '/admin/dashboard'
    case 'STUDENT':
    case 'PARENT':
      return '/dashboard'
    default:
      return '/login'
  }
}
