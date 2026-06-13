import { Role } from '@/types/auth'

export interface MockSessionUser {
  id: string
  email: string
  role: Role
  schoolId: string | null
  name: string
}

export interface MockSession {
  user: MockSessionUser
  expires: string
}

const TEST_SCHOOL_ID = 'test-school-id'
const ACTIVE_SESSION_EXPIRES = '2099-12-31T23:59:59.000Z'
const EXPIRED_SESSION_EXPIRES = '2000-01-01T00:00:00.000Z'

export const mockSessionUsersByRole: Record<Role, MockSessionUser> = {
  [Role.SUPER_ADMIN]: {
    id: 'session-super-admin',
    email: 'super-admin@test.local',
    role: Role.SUPER_ADMIN,
    schoolId: null,
    name: 'Super Admin',
  },
  [Role.PRINCIPAL]: {
    id: 'session-principal',
    email: 'principal@test.local',
    role: Role.PRINCIPAL,
    schoolId: TEST_SCHOOL_ID,
    name: 'Principal User',
  },
  [Role.STAFF_ADMIN]: {
    id: 'session-staff-admin',
    email: 'staff-admin@test.local',
    role: Role.STAFF_ADMIN,
    schoolId: TEST_SCHOOL_ID,
    name: 'Staff Admin User',
  },
  [Role.STUDENT_ADMIN]: {
    id: 'session-student-admin',
    email: 'student-admin@test.local',
    role: Role.STUDENT_ADMIN,
    schoolId: TEST_SCHOOL_ID,
    name: 'Student Admin User',
  },
  [Role.ACCOUNTANT]: {
    id: 'session-accountant',
    email: 'accountant@test.local',
    role: Role.ACCOUNTANT,
    schoolId: TEST_SCHOOL_ID,
    name: 'Accountant User',
  },
  [Role.TEACHER]: {
    id: 'session-teacher',
    email: 'teacher@test.local',
    role: Role.TEACHER,
    schoolId: TEST_SCHOOL_ID,
    name: 'Teacher User',
  },
  [Role.STUDENT]: {
    id: 'session-student',
    email: 'student@test.local',
    role: Role.STUDENT,
    schoolId: TEST_SCHOOL_ID,
    name: 'Student User',
  },
  [Role.PARENT]: {
    id: 'session-parent',
    email: 'parent@test.local',
    role: Role.PARENT,
    schoolId: TEST_SCHOOL_ID,
    name: 'Parent User',
  },
}

export function mockSession(
  role: Role,
  overrides: Partial<MockSessionUser> = {},
  expires: string = ACTIVE_SESSION_EXPIRES
): MockSession {
  return {
    user: {
      ...mockSessionUsersByRole[role],
      ...overrides,
    },
    expires,
  }
}

export function mockNoSession(): null {
  return null
}

export function mockExpiredSession(
  role: Role = Role.TEACHER,
  overrides: Partial<MockSessionUser> = {}
): MockSession {
  return mockSession(role, overrides, EXPIRED_SESSION_EXPIRES)
}
