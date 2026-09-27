import { testAcademicYears, testClasses } from './academic'
import { TEST_SCHOOL_ID } from './school'
import { testUsersByRole } from './users'

export interface TestStudentFixture {
  id: string
  school_id: string
  user_id: string
  admission_number: string
  first_name: string
  last_name: string
  gender: 'MALE' | 'FEMALE' | 'OTHER'
  date_of_birth: Date
  class_id: string
  academic_year_id: string
  admission_date: Date
  is_active: boolean
  created_at: Date
  updated_at: Date
  class: {
    id: string
    name: string
    section: string
  }
  academic_year: {
    id: string
    name: string
    is_current: boolean
  }
}

const createdAt = new Date('2025-01-05T00:00:00.000Z')
const currentYear = testAcademicYears[0]
const class6A = testClasses[0]
const class7A = testClasses[1]

export const testStudents: TestStudentFixture[] = [
  {
    id: 'student-001',
    school_id: TEST_SCHOOL_ID,
    user_id: testUsersByRole.STUDENT.id,
    admission_number: 'ADM-2025-001',
    first_name: 'Arjun',
    last_name: 'Sharma',
    gender: 'MALE',
    date_of_birth: new Date('2012-05-12T00:00:00.000Z'),
    class_id: class6A.id,
    academic_year_id: currentYear.id,
    admission_date: new Date('2025-06-10T00:00:00.000Z'),
    is_active: true,
    created_at: createdAt,
    updated_at: createdAt,
    class: {
      id: class6A.id,
      name: class6A.name,
      section: class6A.section,
    },
    academic_year: {
      id: currentYear.id,
      name: currentYear.name,
      is_current: currentYear.is_current,
    },
  },
  {
    id: 'student-002',
    school_id: TEST_SCHOOL_ID,
    user_id: 'user-student-2',
    admission_number: 'ADM-2025-002',
    first_name: 'Meera',
    last_name: 'Nair',
    gender: 'FEMALE',
    date_of_birth: new Date('2011-09-20T00:00:00.000Z'),
    class_id: class7A.id,
    academic_year_id: currentYear.id,
    admission_date: new Date('2025-06-10T00:00:00.000Z'),
    is_active: true,
    created_at: createdAt,
    updated_at: createdAt,
    class: {
      id: class7A.id,
      name: class7A.name,
      section: class7A.section,
    },
    academic_year: {
      id: currentYear.id,
      name: currentYear.name,
      is_current: currentYear.is_current,
    },
  },
]
