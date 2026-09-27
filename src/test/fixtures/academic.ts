import { TEST_SCHOOL_ID } from './school'

export interface TestAcademicYearFixture {
  id: string
  school_id: string
  name: string
  start_date: Date
  end_date: Date
  is_current: boolean
  created_at: Date
  updated_at: Date
}

export interface TestTermFixture {
  id: string
  school_id: string
  academic_year_id: string
  name: string
  start_date: Date
  end_date: Date
  created_at: Date
  updated_at: Date
}

export interface TestClassFixture {
  id: string
  school_id: string
  academic_year_id: string
  name: string
  section: string
  class_teacher_id: string | null
  room_number: string | null
  max_students: number
  created_at: Date
  updated_at: Date
}

const createdAt = new Date('2025-01-03T00:00:00.000Z')

export const testAcademicYears: TestAcademicYearFixture[] = [
  {
    id: 'academic-year-2025',
    school_id: TEST_SCHOOL_ID,
    name: '2025-2026',
    start_date: new Date('2025-06-01T00:00:00.000Z'),
    end_date: new Date('2026-03-31T00:00:00.000Z'),
    is_current: true,
    created_at: createdAt,
    updated_at: createdAt,
  },
  {
    id: 'academic-year-2024',
    school_id: TEST_SCHOOL_ID,
    name: '2024-2025',
    start_date: new Date('2024-06-01T00:00:00.000Z'),
    end_date: new Date('2025-03-31T00:00:00.000Z'),
    is_current: false,
    created_at: createdAt,
    updated_at: createdAt,
  },
]

export const testTerms: TestTermFixture[] = [
  {
    id: 'term-1',
    school_id: TEST_SCHOOL_ID,
    academic_year_id: 'academic-year-2025',
    name: 'Term 1',
    start_date: new Date('2025-06-01T00:00:00.000Z'),
    end_date: new Date('2025-10-31T00:00:00.000Z'),
    created_at: createdAt,
    updated_at: createdAt,
  },
  {
    id: 'term-2',
    school_id: TEST_SCHOOL_ID,
    academic_year_id: 'academic-year-2025',
    name: 'Term 2',
    start_date: new Date('2025-11-01T00:00:00.000Z'),
    end_date: new Date('2026-03-31T00:00:00.000Z'),
    created_at: createdAt,
    updated_at: createdAt,
  },
]

export const testClasses: TestClassFixture[] = [
  {
    id: 'class-grade-6-a',
    school_id: TEST_SCHOOL_ID,
    academic_year_id: 'academic-year-2025',
    name: 'Grade 6',
    section: 'A',
    class_teacher_id: null,
    room_number: 'A-06',
    max_students: 40,
    created_at: createdAt,
    updated_at: createdAt,
  },
  {
    id: 'class-grade-7-a',
    school_id: TEST_SCHOOL_ID,
    academic_year_id: 'academic-year-2025',
    name: 'Grade 7',
    section: 'A',
    class_teacher_id: null,
    room_number: 'A-07',
    max_students: 40,
    created_at: createdAt,
    updated_at: createdAt,
  },
]
