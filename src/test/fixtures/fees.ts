import { testAcademicYears, testClasses } from './academic'
import { TEST_SCHOOL_ID } from './school'
import { testStaff } from './staff'
import { testStudents } from './students'

export interface TestFeeCategoryFixture {
  id: string
  school_id: string
  name: string
  description: string
  created_at: Date
  updated_at: Date
}

export interface TestFeeStructureFixture {
  id: string
  school_id: string
  academic_year_id: string
  class_id: string
  fee_category_id: string
  amount: number
  due_date: Date
  frequency: 'ONE_TIME' | 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY'
  created_at: Date
  updated_at: Date
}

export interface TestFeePaymentFixture {
  id: string
  school_id: string
  student_id: string
  fee_structure_id: string
  amount_paid: number
  payment_date: Date
  payment_mode: 'CASH' | 'CHEQUE' | 'DD' | 'BANK_TRANSFER' | 'OTHER'
  receipt_number: string
  collected_by: string
  remarks: string | null
  receipt_url: string | null
  created_at: Date
  updated_at: Date
}

const createdAt = new Date('2025-01-06T00:00:00.000Z')
const currentYear = testAcademicYears[0]
const class6A = testClasses[0]
const tuitionCategoryId = 'fee-category-tuition'

export const testFeeCategories: TestFeeCategoryFixture[] = [
  {
    id: tuitionCategoryId,
    school_id: TEST_SCHOOL_ID,
    name: 'Tuition Fee',
    description: 'Regular tuition fee',
    created_at: createdAt,
    updated_at: createdAt,
  },
]

export const testFeeStructures: TestFeeStructureFixture[] = [
  {
    id: 'fee-structure-001',
    school_id: TEST_SCHOOL_ID,
    academic_year_id: currentYear.id,
    class_id: class6A.id,
    fee_category_id: tuitionCategoryId,
    amount: 15000,
    due_date: new Date('2025-07-10T00:00:00.000Z'),
    frequency: 'QUARTERLY',
    created_at: createdAt,
    updated_at: createdAt,
  },
]

export const testFeePayments: TestFeePaymentFixture[] = [
  {
    id: 'fee-payment-001',
    school_id: TEST_SCHOOL_ID,
    student_id: testStudents[0].id,
    fee_structure_id: testFeeStructures[0].id,
    amount_paid: 15000,
    payment_date: new Date('2025-07-01T00:00:00.000Z'),
    payment_mode: 'CASH',
    receipt_number: 'RCP-2025-0001',
    collected_by: testStaff.find((staff) => staff.designation === 'Accountant')!.id,
    remarks: null,
    receipt_url: 'https://mock.r2.local/test-bucket/receipts/RCP-2025-0001.pdf',
    created_at: createdAt,
    updated_at: createdAt,
  },
]
