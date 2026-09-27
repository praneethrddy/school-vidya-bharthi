import { TEST_SCHOOL_ID } from './school'
import { testUsersByRole } from './users'

export interface TestStaffFixture {
  id: string
  school_id: string
  user_id: string
  employee_code: string
  first_name: string
  last_name: string
  gender: 'MALE' | 'FEMALE' | 'OTHER'
  designation: string
  department: string
  date_of_joining: Date
  is_active: boolean
  created_at: Date
  updated_at: Date
  user: {
    id: string
    email: string
    role: string
    is_active: boolean
  }
}

const createdAt = new Date('2025-01-04T00:00:00.000Z')

export const testStaff: TestStaffFixture[] = [
  {
    id: 'staff-principal',
    school_id: TEST_SCHOOL_ID,
    user_id: testUsersByRole.PRINCIPAL.id,
    employee_code: 'EMP-0001',
    first_name: 'Anita',
    last_name: 'Rao',
    gender: 'FEMALE',
    designation: 'Principal',
    department: 'Administration',
    date_of_joining: new Date('2020-06-01T00:00:00.000Z'),
    is_active: true,
    created_at: createdAt,
    updated_at: createdAt,
    user: {
      id: testUsersByRole.PRINCIPAL.id,
      email: testUsersByRole.PRINCIPAL.email,
      role: testUsersByRole.PRINCIPAL.role,
      is_active: true,
    },
  },
  {
    id: 'staff-staff-admin',
    school_id: TEST_SCHOOL_ID,
    user_id: testUsersByRole.STAFF_ADMIN.id,
    employee_code: 'EMP-0002',
    first_name: 'Kiran',
    last_name: 'Das',
    gender: 'MALE',
    designation: 'Staff Admin',
    department: 'Administration',
    date_of_joining: new Date('2021-06-01T00:00:00.000Z'),
    is_active: true,
    created_at: createdAt,
    updated_at: createdAt,
    user: {
      id: testUsersByRole.STAFF_ADMIN.id,
      email: testUsersByRole.STAFF_ADMIN.email,
      role: testUsersByRole.STAFF_ADMIN.role,
      is_active: true,
    },
  },
  {
    id: 'staff-student-admin',
    school_id: TEST_SCHOOL_ID,
    user_id: testUsersByRole.STUDENT_ADMIN.id,
    employee_code: 'EMP-0003',
    first_name: 'Neha',
    last_name: 'Singh',
    gender: 'FEMALE',
    designation: 'Student Admin',
    department: 'Admissions',
    date_of_joining: new Date('2022-06-01T00:00:00.000Z'),
    is_active: true,
    created_at: createdAt,
    updated_at: createdAt,
    user: {
      id: testUsersByRole.STUDENT_ADMIN.id,
      email: testUsersByRole.STUDENT_ADMIN.email,
      role: testUsersByRole.STUDENT_ADMIN.role,
      is_active: true,
    },
  },
  {
    id: 'staff-accountant',
    school_id: TEST_SCHOOL_ID,
    user_id: testUsersByRole.ACCOUNTANT.id,
    employee_code: 'EMP-0004',
    first_name: 'Rahul',
    last_name: 'Verma',
    gender: 'MALE',
    designation: 'Accountant',
    department: 'Finance',
    date_of_joining: new Date('2022-07-01T00:00:00.000Z'),
    is_active: true,
    created_at: createdAt,
    updated_at: createdAt,
    user: {
      id: testUsersByRole.ACCOUNTANT.id,
      email: testUsersByRole.ACCOUNTANT.email,
      role: testUsersByRole.ACCOUNTANT.role,
      is_active: true,
    },
  },
  {
    id: 'staff-teacher',
    school_id: TEST_SCHOOL_ID,
    user_id: testUsersByRole.TEACHER.id,
    employee_code: 'EMP-0005',
    first_name: 'Suresh',
    last_name: 'Iyer',
    gender: 'MALE',
    designation: 'Mathematics Teacher',
    department: 'Academics',
    date_of_joining: new Date('2023-06-01T00:00:00.000Z'),
    is_active: true,
    created_at: createdAt,
    updated_at: createdAt,
    user: {
      id: testUsersByRole.TEACHER.id,
      email: testUsersByRole.TEACHER.email,
      role: testUsersByRole.TEACHER.role,
      is_active: true,
    },
  },
]
