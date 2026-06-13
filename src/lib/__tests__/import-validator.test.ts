import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  academicYearFindMany: vi.fn(),
  classFindMany: vi.fn(),
  studentFindMany: vi.fn(),
  staffFindMany: vi.fn(),
  parentFindMany: vi.fn(),
  feeStructureFindMany: vi.fn(),
  feePaymentFindMany: vi.fn(),
  studentParentFindMany: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    academicYear: { findMany: mocks.academicYearFindMany },
    class: { findMany: mocks.classFindMany },
    student: { findMany: mocks.studentFindMany },
    staff: { findMany: mocks.staffFindMany },
    parent: { findMany: mocks.parentFindMany },
    feeStructure: { findMany: mocks.feeStructureFindMany },
    feePayment: { findMany: mocks.feePaymentFindMany },
    studentParent: { findMany: mocks.studentParentFindMany },
  },
}))

import { validateImportData } from '@/lib/import-validator'

describe('import-validator', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mocks.academicYearFindMany.mockResolvedValue([
      {
        id: 'year-1',
        name: '2025-2026',
        is_current: true,
        start_date: new Date('2025-06-01'),
      },
    ])

    mocks.classFindMany.mockResolvedValue([
      {
        id: 'class-1',
        name: 'Grade 6',
        section: 'A',
        academic_year_id: 'year-1',
      },
    ])

    mocks.studentFindMany.mockResolvedValue([
      {
        id: 'student-existing',
        admission_number: 'ADM-EXISTING',
        class_id: 'class-1',
        academic_year_id: 'year-1',
      },
      {
        id: 'student-1',
        admission_number: 'ADM-2001',
        class_id: 'class-1',
        academic_year_id: 'year-1',
      },
    ])

    mocks.staffFindMany.mockResolvedValue([{ id: 'staff-1', employee_code: 'STF-EXISTING' }])
    mocks.parentFindMany.mockResolvedValue([
      { id: 'parent-1', first_name: 'Rita', last_name: 'Patel', phone: '9999999999' },
    ])
    mocks.feeStructureFindMany.mockResolvedValue([
      {
        id: 'structure-1',
        class_id: 'class-1',
        academic_year_id: 'year-1',
        category: { name: 'Tuition' },
      },
    ])
    mocks.feePaymentFindMany.mockResolvedValue([])
    mocks.studentParentFindMany.mockResolvedValue([])
  })

  it('validates required fields for student import (TEST-IV-001)', async () => {
    const result = await validateImportData({
      schoolId: 'school-1',
      importType: 'students',
      rows: [
        {
          admission_number: 'ADM-3001',
          first_name: '',
          last_name: 'Patel',
          date_of_birth: '2012-05-10',
          class_name: 'Grade 6',
          section: 'A',
        },
      ],
      columnMapping: {
        admission_number: 'admission_number',
        first_name: 'first_name',
        last_name: 'last_name',
        date_of_birth: 'date_of_birth',
        class_name: 'class_name',
        section: 'section',
      },
    })

    expect(result.summary.error_rows).toBe(1)
    expect(result.summary.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'first_name', error: 'First Name is required' }),
      ])
    )
  })

  it('validates required fields for staff import (TEST-IV-002)', async () => {
    const result = await validateImportData({
      schoolId: 'school-1',
      importType: 'staff',
      rows: [
        {
          employee_code: '',
          first_name: 'Rohan',
          last_name: 'Sharma',
        },
      ],
      columnMapping: {
        employee_code: 'employee_code',
        first_name: 'first_name',
        last_name: 'last_name',
      },
    })

    expect(result.summary.error_rows).toBe(1)
    expect(result.summary.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'employee_code', error: 'Employee Code is required' }),
      ])
    )
  })

  it('requires phone for parent import (TEST-IV-003)', async () => {
    const result = await validateImportData({
      schoolId: 'school-1',
      importType: 'parents',
      rows: [
        {
          first_name: 'Rita',
          last_name: 'Patel',
          phone: '',
        },
      ],
      columnMapping: {
        first_name: 'first_name',
        last_name: 'last_name',
        phone: 'phone',
      },
    })

    expect(result.summary.error_rows).toBe(1)
    expect(result.summary.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'phone', error: 'Phone is required' }),
      ])
    )
  })

  it('validates student-parent links (TEST-IV-004)', async () => {
    const result = await validateImportData({
      schoolId: 'school-1',
      importType: 'student_parents',
      rows: [
        {
          student_admission_number: 'ADM-UNKNOWN',
          parent_phone: '8888888888',
          is_primary: 'true',
        },
      ],
      columnMapping: {
        student_admission_number: 'student_admission_number',
        parent_phone: 'parent_phone',
        is_primary: 'is_primary',
      },
    })

    expect(result.summary.error_rows).toBe(1)
    expect(result.summary.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'student_admission_number', error: 'Student could not be found' }),
        expect.objectContaining({ field: 'parent_phone', error: 'Parent could not be found' }),
      ])
    )
  })

  it('validates fee payment amount, date, and mode (TEST-IV-005)', async () => {
    const result = await validateImportData({
      schoolId: 'school-1',
      importType: 'fee_payments',
      rows: [
        {
          student_admission_number: 'ADM-2001',
          fee_category_name: 'Tuition',
          amount_paid: '-10',
          payment_date: 'no-date',
          payment_mode: 'CARD',
          receipt_number: 'REC-1',
        },
      ],
      columnMapping: {
        student_admission_number: 'student_admission_number',
        fee_category_name: 'fee_category_name',
        amount_paid: 'amount_paid',
        payment_date: 'payment_date',
        payment_mode: 'payment_mode',
        receipt_number: 'receipt_number',
      },
    })

    expect(result.summary.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'amount_paid', error: 'Amount paid must be greater than 0' }),
        expect.objectContaining({ field: 'payment_date', error: 'Invalid payment date' }),
        expect.objectContaining({ field: 'payment_mode', error: 'Payment mode is invalid' }),
      ])
    )
  })

  it('flags invalid date formats (TEST-IV-006)', async () => {
    const result = await validateImportData({
      schoolId: 'school-1',
      importType: 'students',
      rows: [
        {
          admission_number: 'ADM-3002',
          first_name: 'Asha',
          last_name: 'Patel',
          date_of_birth: '31-31-2030',
          class_name: 'Grade 6',
          section: 'A',
        },
      ],
      columnMapping: {
        admission_number: 'admission_number',
        first_name: 'first_name',
        last_name: 'last_name',
        date_of_birth: 'date_of_birth',
        class_name: 'class_name',
        section: 'section',
      },
    })

    expect(result.summary.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'date_of_birth', error: 'Invalid date of birth' }),
      ])
    )
  })

  it('flags invalid gender values (TEST-IV-007)', async () => {
    const result = await validateImportData({
      schoolId: 'school-1',
      importType: 'staff',
      rows: [
        {
          employee_code: 'STF-3001',
          first_name: 'Rohan',
          last_name: 'Sharma',
          gender: 'ALIEN',
        },
      ],
      columnMapping: {
        employee_code: 'employee_code',
        first_name: 'first_name',
        last_name: 'last_name',
        gender: 'gender',
      },
    })

    expect(result.summary.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'gender', error: 'Gender must be MALE, FEMALE, or OTHER' }),
      ])
    )
  })
})
