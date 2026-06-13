export const TEST_SCHOOL_ID = 'test-school-id'
export const TEST_SCHOOL_SLUG = 'test-school'

export interface TestSchoolFixture {
  id: string
  name: string
  slug: string
  logo_url: string | null
  address: string
  city: string
  state: string
  phone: string
  email: string
  website: string
  board: string
  established_year: number
  is_active: boolean
  created_at: Date
  updated_at: Date
}

export const testSchool: TestSchoolFixture = {
  id: TEST_SCHOOL_ID,
  name: 'Vidhya Bharthi High School',
  slug: TEST_SCHOOL_SLUG,
  logo_url: null,
  address: '12 Knowledge Road, Hyderabad',
  city: 'Hyderabad',
  state: 'Telangana',
  phone: '+91-9000000000',
  email: 'office@testschool.local',
  website: 'https://testschool.local',
  board: 'CBSE',
  established_year: 1998,
  is_active: true,
  created_at: new Date('2025-01-01T00:00:00.000Z'),
  updated_at: new Date('2025-01-01T00:00:00.000Z'),
}

export function buildTestSchool(overrides: Partial<TestSchoolFixture> = {}): TestSchoolFixture {
  return {
    ...testSchool,
    ...overrides,
  }
}
