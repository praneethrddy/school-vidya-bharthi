import { Role } from '@/types/auth'
import { TEST_SCHOOL_ID } from './school'

export interface TestUserFixture {
  id: string
  school_id: string | null
  email: string
  role: Role
  name: string
  password_hash: string
  is_active: boolean
  created_at: Date
  updated_at: Date
}

const createdAt = new Date('2025-01-02T00:00:00.000Z')

export const testUsersByRole: Record<Role, TestUserFixture> = {
  [Role.SUPER_ADMIN]: {
    id: 'user-super-admin',
    school_id: null,
    email: 'super-admin@test.local',
    role: Role.SUPER_ADMIN,
    name: 'Super Admin',
    password_hash: 'hash-super-admin',
    is_active: true,
    created_at: createdAt,
    updated_at: createdAt,
  },
  [Role.PRINCIPAL]: {
    id: 'user-principal',
    school_id: TEST_SCHOOL_ID,
    email: 'principal@test.local',
    role: Role.PRINCIPAL,
    name: 'Principal User',
    password_hash: 'hash-principal',
    is_active: true,
    created_at: createdAt,
    updated_at: createdAt,
  },
  [Role.STAFF_ADMIN]: {
    id: 'user-staff-admin',
    school_id: TEST_SCHOOL_ID,
    email: 'staff-admin@test.local',
    role: Role.STAFF_ADMIN,
    name: 'Staff Admin User',
    password_hash: 'hash-staff-admin',
    is_active: true,
    created_at: createdAt,
    updated_at: createdAt,
  },
  [Role.STUDENT_ADMIN]: {
    id: 'user-student-admin',
    school_id: TEST_SCHOOL_ID,
    email: 'student-admin@test.local',
    role: Role.STUDENT_ADMIN,
    name: 'Student Admin User',
    password_hash: 'hash-student-admin',
    is_active: true,
    created_at: createdAt,
    updated_at: createdAt,
  },
  [Role.ACCOUNTANT]: {
    id: 'user-accountant',
    school_id: TEST_SCHOOL_ID,
    email: 'accountant@test.local',
    role: Role.ACCOUNTANT,
    name: 'Accountant User',
    password_hash: 'hash-accountant',
    is_active: true,
    created_at: createdAt,
    updated_at: createdAt,
  },
  [Role.TEACHER]: {
    id: 'user-teacher',
    school_id: TEST_SCHOOL_ID,
    email: 'teacher@test.local',
    role: Role.TEACHER,
    name: 'Teacher User',
    password_hash: 'hash-teacher',
    is_active: true,
    created_at: createdAt,
    updated_at: createdAt,
  },
  [Role.STUDENT]: {
    id: 'user-student',
    school_id: TEST_SCHOOL_ID,
    email: 'student@test.local',
    role: Role.STUDENT,
    name: 'Student User',
    password_hash: 'hash-student',
    is_active: true,
    created_at: createdAt,
    updated_at: createdAt,
  },
  [Role.PARENT]: {
    id: 'user-parent',
    school_id: TEST_SCHOOL_ID,
    email: 'parent@test.local',
    role: Role.PARENT,
    name: 'Parent User',
    password_hash: 'hash-parent',
    is_active: true,
    created_at: createdAt,
    updated_at: createdAt,
  },
}

export const testUsers: TestUserFixture[] = Object.values(testUsersByRole)

export function buildTestUser(
  role: Role,
  overrides: Partial<TestUserFixture> = {}
): TestUserFixture {
  return {
    ...testUsersByRole[role],
    ...overrides,
  }
}
