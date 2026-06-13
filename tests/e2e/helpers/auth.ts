import path from 'node:path'

export const AUTH_DIR = path.resolve(process.cwd(), 'tests/e2e/.auth')

export const authFiles = {
  superadmin: path.join(AUTH_DIR, 'superadmin.json'),
  principal: path.join(AUTH_DIR, 'principal.json'),
  staffadmin: path.join(AUTH_DIR, 'staffadmin.json'),
  studentadmin: path.join(AUTH_DIR, 'studentadmin.json'),
  accountant: path.join(AUTH_DIR, 'accountant.json'),
  teacher: path.join(AUTH_DIR, 'teacher.json'),
  student: path.join(AUTH_DIR, 'student.json'),
  parent: path.join(AUTH_DIR, 'parent.json'),
} as const

export type RoleName = keyof typeof authFiles

export const TEST_CREDENTIALS = {
  password: process.env.E2E_PASSWORD || 'Test@1234',
  school: process.env.E2E_SCHOOL_SLUG || 'vbhs',
  users: {
    superadmin: process.env.E2E_SUPER_ADMIN_EMAIL || 'super@vbhs.com',
    principal: process.env.E2E_PRINCIPAL_EMAIL || 'principal@vbhs.com',
    staffadmin: process.env.E2E_STAFF_ADMIN_EMAIL || 'staffadmin@vbhs.com',
    studentadmin: process.env.E2E_STUDENT_ADMIN_EMAIL || 'studentadmin@vbhs.com',
    accountant: process.env.E2E_ACCOUNTANT_EMAIL || 'accountant@vbhs.com',
    teacher: process.env.E2E_TEACHER_EMAIL || 'teacher@vbhs.com',
    student: process.env.E2E_STUDENT_EMAIL || 'student@vbhs.com',
    parent: process.env.E2E_PARENT_EMAIL || 'parent@vbhs.com',
  },
} as const

export const emptyStorageState = {
  cookies: [] as Array<{
    name: string
    value: string
    domain: string
    path: string
    expires: number
    httpOnly: boolean
    secure: boolean
    sameSite: 'Strict' | 'Lax' | 'None'
  }>,
  origins: [] as Array<{
    origin: string
    localStorage: Array<{
      name: string
      value: string
    }>
  }>,
}
