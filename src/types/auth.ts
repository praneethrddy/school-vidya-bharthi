export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  PRINCIPAL = 'PRINCIPAL',
  STAFF_ADMIN = 'STAFF_ADMIN',
  STUDENT_ADMIN = 'STUDENT_ADMIN',
  ACCOUNTANT = 'ACCOUNTANT',
  TEACHER = 'TEACHER',
  STUDENT = 'STUDENT',
  PARENT = 'PARENT',
}

export interface SessionUser {
  id: string
  email: string
  name: string | null
  role: Role
  schoolId: string | null
}

export interface AuthSession {
  user: SessionUser
  expires: string
}
