import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  schoolFindFirst: vi.fn(),
  userFindFirst: vi.fn(),
  userCreate: vi.fn(),
  studentCreate: vi.fn(),
  staffFindFirst: vi.fn(),
  staffCreate: vi.fn(),
  parentCreate: vi.fn(),
  studentParentCreate: vi.fn(),
  studentParentUpdateMany: vi.fn(),
  feePaymentCreate: vi.fn(),
  createAuditLog: vi.fn(),
  hash: vi.fn(),
  generatePassword: vi.fn(),
}))

vi.mock('bcryptjs', () => ({
  default: {
    hash: mocks.hash,
  },
}))

vi.mock('@/lib/utils', () => ({
  generatePassword: mocks.generatePassword,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    school: { findFirst: mocks.schoolFindFirst },
    user: { findFirst: mocks.userFindFirst, create: mocks.userCreate },
    student: { create: mocks.studentCreate },
    staff: { findFirst: mocks.staffFindFirst, create: mocks.staffCreate },
    parent: { create: mocks.parentCreate },
    studentParent: { create: mocks.studentParentCreate, updateMany: mocks.studentParentUpdateMany },
    feePayment: { create: mocks.feePaymentCreate },
  },
}))

vi.mock('@/lib/audit', () => ({
  createAuditLog: mocks.createAuditLog,
}))

import { createUploadSession, saveValidationResult } from '@/lib/import-session-store'
import { processImportUpload } from '@/lib/import-tools'

function makeSession(importType: 'students' | 'staff' | 'parents' | 'fee_payments', preparedRows: any[], errorRows = 0) {
  const session = createUploadSession({
    fileName: `${importType}.csv`,
    fileSize: 200,
    parsed: {
      headers: ['col1'],
      rows: [{ col1: 'value' }],
      delimiter: ',',
      duplicateHeaders: [],
      warnings: [],
    },
  })

  saveValidationResult(session.id, {
    importType,
    columnMapping: {},
    summary: {
      total_rows: preparedRows.length + errorRows,
      valid_rows: preparedRows.length,
      error_rows: errorRows,
      errors:
        errorRows > 0
          ? [{ row_number: 99, field: 'row', value: '', error: 'Invalid row in validation' }]
          : [],
      preview: [],
      warnings: [],
      missing_required_fields: [],
    },
    preparedRows,
  })

  return session
}

describe('import-tools processing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(globalThis as any).__vbImportSessions = new Map()

    mocks.schoolFindFirst.mockResolvedValue({ slug: 'vbhs' })
    mocks.userFindFirst.mockResolvedValue(null)
    mocks.userCreate.mockResolvedValue({ id: 'user-1' })
    mocks.studentCreate.mockResolvedValue({ id: 'student-new' })
    mocks.staffCreate.mockResolvedValue({ id: 'staff-new' })
    mocks.parentCreate.mockResolvedValue({ id: 'parent-new' })
    mocks.studentParentCreate.mockResolvedValue({ id: 'link-1' })
    mocks.studentParentUpdateMany.mockResolvedValue({ count: 0 })
    mocks.feePaymentCreate.mockResolvedValue({ id: 'fee-1' })
    mocks.staffFindFirst.mockResolvedValue({ id: 'staff-collector' })
    mocks.createAuditLog.mockResolvedValue(undefined)
    mocks.hash.mockResolvedValue('hash')
    mocks.generatePassword.mockReturnValue('Generated@123')
  })

  it('processes student rows and creates students (TEST-IT-001)', async () => {
    const session = makeSession('students', [
      {
        row_number: 2,
        raw: { admission_number: 'ADM-1001' },
        data: {
          admission_number: 'ADM-1001',
          first_name: 'Asha',
          last_name: 'Patel',
          gender: null,
          date_of_birth: new Date('2012-05-10'),
          blood_group: null,
          phone: null,
          address: null,
          emergency_contact_name: null,
          emergency_contact_phone: null,
          class_id: 'class-1',
          academic_year_id: 'year-1',
          admission_date: new Date('2025-06-01'),
          roll_number: null,
        },
      },
    ])

    const result = await processImportUpload({
      schoolId: 'school-1',
      userId: 'user-1',
      uploadId: session.id,
      importType: 'students',
      skipErrors: true,
    })

    expect(result.status).toBe('COMPLETED')
    expect(result.successful).toBe(1)
    expect(mocks.studentCreate).toHaveBeenCalledTimes(1)
    expect(mocks.studentCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          school_id: 'school-1',
          class_id: 'class-1',
          academic_year_id: 'year-1',
        }),
      })
    )
    expect(mocks.createAuditLog).toHaveBeenCalledTimes(1)
  })

  it('processes staff rows and creates staff records (TEST-IT-002)', async () => {
    const session = makeSession('staff', [
      {
        row_number: 2,
        raw: { employee_code: 'STF-1001' },
        data: {
          employee_code: 'STF-1001',
          first_name: 'Rohan',
          last_name: 'Sharma',
          gender: null,
          date_of_birth: null,
          phone: null,
          address: null,
          designation: 'Teacher',
          department: 'Academics',
          date_of_joining: null,
          qualification: null,
        },
      },
    ])

    const result = await processImportUpload({
      schoolId: 'school-1',
      userId: 'user-1',
      uploadId: session.id,
      importType: 'staff',
      skipErrors: true,
    })

    expect(result.status).toBe('COMPLETED')
    expect(mocks.staffCreate).toHaveBeenCalledTimes(1)
    expect(mocks.staffCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          school_id: 'school-1',
          employee_code: 'STF-1001',
        }),
      })
    )
    expect(mocks.createAuditLog).toHaveBeenCalledTimes(1)
  })

  it('processes parent rows and auto-links parent/student when requested (TEST-IT-003)', async () => {
    const session = makeSession('parents', [
      {
        row_number: 2,
        raw: { phone: '9999999999' },
        data: {
          first_name: 'Rita',
          last_name: 'Patel',
          relation: 'MOTHER',
          phone: '9999999999',
          alternate_phone: null,
          email: null,
          occupation: null,
          address: null,
          auto_link_student_id: 'student-1',
        },
      },
    ])

    const result = await processImportUpload({
      schoolId: 'school-1',
      userId: 'user-1',
      uploadId: session.id,
      importType: 'parents',
      skipErrors: true,
    })

    expect(result.status).toBe('COMPLETED')
    expect(mocks.parentCreate).toHaveBeenCalledTimes(1)
    expect(mocks.studentParentCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          school_id: 'school-1',
          student_id: 'student-1',
          parent_id: 'parent-new',
        }),
      })
    )
    expect(mocks.createAuditLog).toHaveBeenCalledTimes(1)
  })

  it('processes fee payment rows (TEST-IT-004)', async () => {
    const session = makeSession('fee_payments', [
      {
        row_number: 2,
        raw: { receipt_number: 'REC-1001' },
        data: {
          student_id: 'student-1',
          fee_structure_id: 'structure-1',
          amount_paid: 2500,
          payment_date: new Date('2025-07-10'),
          payment_mode: 'CASH',
          receipt_number: 'REC-1001',
          reference_number: null,
          remarks: null,
        },
      },
    ])

    const result = await processImportUpload({
      schoolId: 'school-1',
      userId: 'user-1',
      uploadId: session.id,
      importType: 'fee_payments',
      skipErrors: true,
    })

    expect(result.status).toBe('COMPLETED')
    expect(mocks.staffFindFirst).toHaveBeenCalledTimes(1)
    expect(mocks.feePaymentCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          school_id: 'school-1',
          collected_by: 'staff-collector',
          receipt_number: 'REC-1001',
        }),
      })
    )
    expect(mocks.createAuditLog).toHaveBeenCalledTimes(1)
  })

  it('processes rows in batches of 50 without dropping rows (TEST-IT-005)', async () => {
    const rows = Array.from({ length: 51 }, (_, index) => ({
      row_number: index + 2,
      raw: { admission_number: `ADM-${index + 1000}` },
      data: {
        admission_number: `ADM-${index + 1000}`,
        first_name: 'Asha',
        last_name: 'Patel',
        gender: null,
        date_of_birth: new Date('2012-05-10'),
        blood_group: null,
        phone: null,
        address: null,
        emergency_contact_name: null,
        emergency_contact_phone: null,
        class_id: 'class-1',
        academic_year_id: 'year-1',
        admission_date: new Date('2025-06-01'),
        roll_number: null,
      },
    }))

    const session = makeSession('students', rows)

    const result = await processImportUpload({
      schoolId: 'school-1',
      userId: 'user-1',
      uploadId: session.id,
      importType: 'students',
      skipErrors: true,
    })

    expect(result.successful).toBe(51)
    expect(result.failed).toBe(0)
    expect(mocks.studentCreate).toHaveBeenCalledTimes(51)
    expect(mocks.createAuditLog).toHaveBeenCalledTimes(1)
  })

  it('returns partial result when validation has errors but valid rows are processed', async () => {
    const session = makeSession(
      'students',
      [
        {
          row_number: 2,
          raw: { admission_number: 'ADM-1001' },
          data: {
            admission_number: 'ADM-1001',
            first_name: 'Asha',
            last_name: 'Patel',
            gender: null,
            date_of_birth: new Date('2012-05-10'),
            blood_group: null,
            phone: null,
            address: null,
            emergency_contact_name: null,
            emergency_contact_phone: null,
            class_id: 'class-1',
            academic_year_id: 'year-1',
            admission_date: new Date('2025-06-01'),
            roll_number: null,
          },
        },
      ],
      1
    )

    const result = await processImportUpload({
      schoolId: 'school-1',
      userId: 'user-1',
      uploadId: session.id,
      importType: 'students',
      skipErrors: true,
    })

    expect(result.status).toBe('PARTIAL')
    expect(result.successful).toBe(1)
    expect(result.failed).toBe(1)
    expect(result.failed_rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          row_number: 99,
          error: 'row: Invalid row in validation',
        }),
      ])
    )
    expect(mocks.createAuditLog).toHaveBeenCalledTimes(1)
  })
})
