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
  academicYearFindMany: vi.fn(),
  classFindMany: vi.fn(),
  studentFindMany: vi.fn(),
  staffFindMany: vi.fn(),
  parentFindMany: vi.fn(),
  feeStructureFindMany: vi.fn(),
  feePaymentFindMany: vi.fn(),
  studentParentFindMany: vi.fn(),
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
    student: { create: mocks.studentCreate, findMany: mocks.studentFindMany },
    staff: { findFirst: mocks.staffFindFirst, create: mocks.staffCreate, findMany: mocks.staffFindMany },
    parent: { create: mocks.parentCreate, findMany: mocks.parentFindMany },
    studentParent: { create: mocks.studentParentCreate, updateMany: mocks.studentParentUpdateMany, findMany: mocks.studentParentFindMany },
    feePayment: { create: mocks.feePaymentCreate, findMany: mocks.feePaymentFindMany },
    academicYear: { findMany: mocks.academicYearFindMany },
    class: { findMany: mocks.classFindMany },
    feeStructure: { findMany: mocks.feeStructureFindMany },
  },
}))

vi.mock('@/lib/audit', () => ({
  createAuditLog: mocks.createAuditLog,
}))

import { parseCsv } from '@/lib/csv-parser'
import { validateImportData } from '@/lib/import-validator'
import {
  processImportUpload,
  validateImportUpload,
  getImportTemplate,
} from '@/lib/import-tools'
import {
  createUploadSession,
  saveValidationResult,
} from '@/lib/import-session-store'
import { suggestColumnMapping } from '@/lib/import-types'

describe('CSV Import Regression Suite', () => {
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

    mocks.academicYearFindMany.mockResolvedValue([
      { id: 'year-1', name: '2025-2026', is_current: true, start_date: new Date('2025-06-01') },
    ])
    mocks.classFindMany.mockResolvedValue([
      { id: 'class-1', name: 'Grade 6', section: null, academic_year_id: 'year-1' },
      { id: 'class-2', name: 'Grade 6', section: 'A', academic_year_id: 'year-1' },
    ])
    mocks.studentFindMany.mockResolvedValue([])
    mocks.staffFindMany.mockResolvedValue([])
    mocks.parentFindMany.mockResolvedValue([])
    mocks.feeStructureFindMany.mockResolvedValue([
      { id: 'structure-1', class_id: 'class-1', academic_year_id: 'year-1', category: { name: 'Tuition' } },
    ])
    mocks.feePaymentFindMany.mockResolvedValue([])
    mocks.studentParentFindMany.mockResolvedValue([])
  })

  // 36A — Encoding & Format Edge Cases
  it('TEST-CSV-REG-001: CSV with UTF-8 BOM marker → parsed correctly', () => {
    const csvContent = '\uFEFFadmission_number,first_name,last_name,class_name,date_of_birth\nADM-1001,Asha,Patel,Grade 6,2012-05-10'
    const parsed = parseCsv(csvContent)
    expect(parsed.headers).toEqual(['admission_number', 'first_name', 'last_name', 'class_name', 'date_of_birth'])
    expect(parsed.rows[0].admission_number).toBe('ADM-1001')
  })

  it('TEST-CSV-REG-002: CSV with Windows line endings (CRLF) → parsed correctly', () => {
    const csvContent = 'admission_number,first_name,last_name,class_name,date_of_birth\r\nADM-1001,Asha,Patel,Grade 6,2012-05-10\r\nADM-1002,Rohan,Sharma,Grade 6,2012-06-11\r\n'
    const parsed = parseCsv(csvContent)
    expect(parsed.rows).toHaveLength(2)
    expect(parsed.rows[0].admission_number).toBe('ADM-1001')
    expect(parsed.rows[1].admission_number).toBe('ADM-1002')
  })

  it('TEST-CSV-REG-003: CSV with Unix line endings (LF) → parsed correctly', () => {
    const csvContent = 'admission_number,first_name,last_name,class_name,date_of_birth\nADM-1001,Asha,Patel,Grade 6,2012-05-10\nADM-1002,Rohan,Sharma,Grade 6,2012-06-11\n'
    const parsed = parseCsv(csvContent)
    expect(parsed.rows).toHaveLength(2)
    expect(parsed.rows[0].admission_number).toBe('ADM-1001')
    expect(parsed.rows[1].admission_number).toBe('ADM-1002')
  })

  it('TEST-CSV-REG-004: CSV with mixed line endings → parsed correctly', () => {
    const csvContent = 'admission_number,first_name,last_name,class_name,date_of_birth\r\nADM-1001,Asha,Patel,Grade 6,2012-05-10\nADM-1002,Rohan,Sharma,Grade 6,2012-06-11\rADM-1003,John,Doe,Grade 6,2012-07-12'
    const parsed = parseCsv(csvContent)
    expect(parsed.rows).toHaveLength(3)
    expect(parsed.rows[0].admission_number).toBe('ADM-1001')
    expect(parsed.rows[1].admission_number).toBe('ADM-1002')
    expect(parsed.rows[2].admission_number).toBe('ADM-1003')
  })

  it('TEST-CSV-REG-005: CSV with trailing empty rows → ignored', () => {
    const csvContent = 'admission_number,first_name,last_name,class_name,date_of_birth\nADM-1001,Asha,Patel,Grade 6,2012-05-10\n\n  \n\n'
    const parsed = parseCsv(csvContent)
    expect(parsed.rows).toHaveLength(1)
  })

  it('TEST-CSV-REG-006: CSV with empty header columns → handled (warning or skip)', () => {
    const csvContent = 'admission_number,,last_name,class_name,date_of_birth\nADM-1001,Asha,Patel,Grade 6,2012-05-10'
    const parsed = parseCsv(csvContent)
    expect(parsed.headers).toContain('column_2')
    expect(parsed.rows[0].column_2).toBe('Asha')
  })

  it('TEST-CSV-REG-007: CSV with extra columns not in template → ignored', async () => {
    const csvContent = 'admission_number,first_name,last_name,class_name,date_of_birth,some_extra_column\nADM-1001,Asha,Patel,Grade 6,2012-05-10,random_data'
    const parsed = parseCsv(csvContent)
    const mapping = suggestColumnMapping('students', parsed.headers)
    expect(mapping).not.toHaveProperty('some_extra_column')
    
    const validation = await validateImportData({
      schoolId: 'school-1',
      importType: 'students',
      rows: parsed.rows,
      columnMapping: mapping,
    })
    expect(validation.summary.error_rows).toBe(0)
    expect((validation.preparedRows[0].data as any).some_extra_column).toBeUndefined()
  })

  it('TEST-CSV-REG-008: CSV with missing optional columns → defaults applied', async () => {
    const csvContent = 'admission_number,first_name,last_name,class_name,date_of_birth\nADM-1001,Asha,Patel,Grade 6,2012-05-10'
    const parsed = parseCsv(csvContent)
    const mapping = suggestColumnMapping('students', parsed.headers)
    const validation = await validateImportData({
      schoolId: 'school-1',
      importType: 'students',
      rows: parsed.rows,
      columnMapping: mapping,
    })
    expect(validation.summary.error_rows).toBe(0)
    const preparedRow = validation.preparedRows[0].data as any
    expect(preparedRow.gender).toBeNull()
    expect(preparedRow.blood_group).toBeNull()
    expect(preparedRow.phone).toBeNull()
    expect(preparedRow.address).toBeNull()
  })

  it('TEST-CSV-REG-009: CSV with reordered columns → matched by header name', () => {
    const csvContent = 'date_of_birth,class_name,last_name,first_name,admission_number\n2012-05-10,Grade 6,Patel,Asha,ADM-1001'
    const parsed = parseCsv(csvContent)
    const mapping = suggestColumnMapping('students', parsed.headers)
    expect(mapping.admission_number).toBe('admission_number')
    expect(mapping.first_name).toBe('first_name')
    expect(mapping.last_name).toBe('last_name')
    expect(mapping.class_name).toBe('class_name')
    expect(mapping.date_of_birth).toBe('date_of_birth')
  })

  it('TEST-CSV-REG-010: CSV with Unicode characters in names (हिंदी, తెలుగు) → preserved', async () => {
    const csvContent = 'admission_number,first_name,last_name,class_name,date_of_birth\nADM-1001,ఆశా (आशा),పటేల్ (पटेल),Grade 6,2012-05-10'
    const parsed = parseCsv(csvContent)
    const mapping = suggestColumnMapping('students', parsed.headers)
    const validation = await validateImportData({
      schoolId: 'school-1',
      importType: 'students',
      rows: parsed.rows,
      columnMapping: mapping,
    })
    expect(validation.preparedRows[0].data.first_name).toBe('ఆశా (आशा)')
    expect(validation.preparedRows[0].data.last_name).toBe('పటేల్ (पटेल)')
  })

  // 36B — Data Quality Edge Cases
  it('TEST-CSV-REG-011: Phone numbers with leading zeros → preserved as string', async () => {
    const csvContent = 'admission_number,first_name,last_name,class_name,date_of_birth,phone\nADM-1001,Asha,Patel,Grade 6,2012-05-10,0801234567'
    const parsed = parseCsv(csvContent)
    const mapping = suggestColumnMapping('students', parsed.headers)
    const validation = await validateImportData({
      schoolId: 'school-1',
      importType: 'students',
      rows: parsed.rows,
      columnMapping: mapping,
    })
    expect(validation.summary.error_rows).toBe(0)
    expect(validation.preparedRows[0].data.phone).toBe('0801234567')
  })

  it('TEST-CSV-REG-012: Phone numbers with country code (+91) → accepted', async () => {
    const csvContent = 'admission_number,first_name,last_name,class_name,date_of_birth,phone\nADM-1001,Asha,Patel,Grade 6,2012-05-10,+919876543210'
    const parsed = parseCsv(csvContent)
    const mapping = suggestColumnMapping('students', parsed.headers)
    const validation = await validateImportData({
      schoolId: 'school-1',
      importType: 'students',
      rows: parsed.rows,
      columnMapping: mapping,
    })
    expect(validation.summary.error_rows).toBe(0)
    expect(validation.preparedRows[0].data.phone).toBe('+919876543210')
  })

  it('TEST-CSV-REG-013: Dates in DD/MM/YYYY format → parsed (not confused with MM/DD)', async () => {
    const csvContent = 'admission_number,first_name,last_name,class_name,date_of_birth\nADM-1001,Asha,Patel,Grade 6,15/05/2012'
    const parsed = parseCsv(csvContent)
    const mapping = suggestColumnMapping('students', parsed.headers)
    const validation = await validateImportData({
      schoolId: 'school-1',
      importType: 'students',
      rows: parsed.rows,
      columnMapping: mapping,
    })
    expect(validation.summary.error_rows).toBe(0)
    const dob = validation.preparedRows[0].data.date_of_birth as Date
    expect(dob.getFullYear()).toBe(2012)
    expect(dob.getMonth()).toBe(4) // May (0-indexed)
    expect(dob.getDate()).toBe(15)
  })

  it('TEST-CSV-REG-014: Dates in DD-MMM-YYYY format (10-Jan-2025) → parsed', async () => {
    const csvContent = 'admission_number,first_name,last_name,class_name,date_of_birth\nADM-1001,Asha,Patel,Grade 6,10-Jan-2025'
    const parsed = parseCsv(csvContent)
    const mapping = suggestColumnMapping('students', parsed.headers)
    const validation = await validateImportData({
      schoolId: 'school-1',
      importType: 'students',
      rows: parsed.rows,
      columnMapping: mapping,
    })
    expect(validation.summary.error_rows).toBe(0)
    const dob = validation.preparedRows[0].data.date_of_birth as Date
    expect(dob.getFullYear()).toBe(2025)
    expect(dob.getMonth()).toBe(0) // Jan (0-indexed)
    expect(dob.getDate()).toBe(10)
  })

  it('TEST-CSV-REG-015: Gender values: M/F/Male/Female/MALE/FEMALE → normalized', async () => {
    const genders = ['M', 'F', 'Male', 'Female', 'MALE', 'FEMALE']
    const expected = ['MALE', 'FEMALE', 'MALE', 'FEMALE', 'MALE', 'FEMALE']
    
    for (let i = 0; i < genders.length; i++) {
      const csvContent = `admission_number,first_name,last_name,class_name,date_of_birth,gender\nADM-100${i},Asha,Patel,Grade 6,2012-05-10,${genders[i]}`
      const parsed = parseCsv(csvContent)
      const mapping = suggestColumnMapping('students', parsed.headers)
      const validation = await validateImportData({
        schoolId: 'school-1',
        importType: 'students',
        rows: parsed.rows,
        columnMapping: mapping,
      })
      expect(validation.summary.error_rows).toBe(0)
      expect(validation.preparedRows[0].data.gender).toBe(expected[i])
    }
  })

  it('TEST-CSV-REG-016: Whitespace-only fields → treated as empty/null', async () => {
    const csvContent = 'admission_number,first_name,last_name,class_name,date_of_birth,phone,gender\nADM-1001,Asha,Patel,Grade 6,2012-05-10,   ,   '
    const parsed = parseCsv(csvContent)
    const mapping = suggestColumnMapping('students', parsed.headers)
    const validation = await validateImportData({
      schoolId: 'school-1',
      importType: 'students',
      rows: parsed.rows,
      columnMapping: mapping,
    })
    expect(validation.summary.error_rows).toBe(0)
    expect(validation.preparedRows[0].data.phone).toBeNull()
    expect(validation.preparedRows[0].data.gender).toBeNull()
  })

  it('TEST-CSV-REG-017: Admission numbers with special chars (ADM/2025/001) → accepted', async () => {
    const csvContent = 'admission_number,first_name,last_name,class_name,date_of_birth\nADM/2025/001,Asha,Patel,Grade 6,2012-05-10'
    const parsed = parseCsv(csvContent)
    const mapping = suggestColumnMapping('students', parsed.headers)
    const validation = await validateImportData({
      schoolId: 'school-1',
      importType: 'students',
      rows: parsed.rows,
      columnMapping: mapping,
    })
    expect(validation.summary.error_rows).toBe(0)
    expect(validation.preparedRows[0].data.admission_number).toBe('ADM/2025/001')
  })

  it('TEST-CSV-REG-018: Very long address fields (>500 chars) → accepted or truncated', async () => {
    const longAddress = 'a'.repeat(600)
    const csvContent = `admission_number,first_name,last_name,class_name,date_of_birth,address\nADM-1001,Asha,Patel,Grade 6,2012-05-10,${longAddress}`
    const parsed = parseCsv(csvContent)
    const mapping = suggestColumnMapping('students', parsed.headers)
    const validation = await validateImportData({
      schoolId: 'school-1',
      importType: 'students',
      rows: parsed.rows,
      columnMapping: mapping,
    })
    expect(validation.summary.error_rows).toBe(0)
    expect(validation.preparedRows[0].data.address).toBe(longAddress)
  })

  // 36C — Scale Testing
  it('TEST-CSV-REG-019: Import 100 students → completes successfully', async () => {
    const header = 'admission_number,first_name,last_name,class_name,date_of_birth'
    const rows = Array.from({ length: 100 }, (_, i) => `ADM-${1000 + i},Asha,Patel,Grade 6,2012-05-10`).join('\n')
    const csvContent = `${header}\n${rows}`
    
    const parsed = parseCsv(csvContent)
    const session = createUploadSession({
      fileName: 'students_100.csv',
      fileSize: csvContent.length,
      parsed,
    })
    
    const mapping = suggestColumnMapping('students', parsed.headers)
    const validation = await validateImportUpload({
      schoolId: 'school-1',
      uploadId: session.id,
      importType: 'students',
      columnMapping: mapping,
    })
    expect(validation.valid_rows).toBe(100)
    expect(validation.error_rows).toBe(0)
    
    const processResult = await processImportUpload({
      schoolId: 'school-1',
      userId: 'user-1',
      uploadId: session.id,
      importType: 'students',
      skipErrors: false,
    })
    
    expect(processResult.status).toBe('COMPLETED')
    expect(processResult.successful).toBe(100)
    expect(mocks.studentCreate).toHaveBeenCalledTimes(100)
  })

  it('TEST-CSV-REG-020: Import 1000 students → completes within 30 seconds', async () => {
    const header = 'admission_number,first_name,last_name,class_name,date_of_birth'
    const rows = Array.from({ length: 1000 }, (_, i) => `ADM-${10000 + i},Asha,Patel,Grade 6,2012-05-10`).join('\n')
    const csvContent = `${header}\n${rows}`
    
    const parsed = parseCsv(csvContent)
    const session = createUploadSession({
      fileName: 'students_1000.csv',
      fileSize: csvContent.length,
      parsed,
    })
    
    const mapping = suggestColumnMapping('students', parsed.headers)
    const startTime = Date.now()
    await validateImportUpload({
      schoolId: 'school-1',
      uploadId: session.id,
      importType: 'students',
      columnMapping: mapping,
    })
    
    const processResult = await processImportUpload({
      schoolId: 'school-1',
      userId: 'user-1',
      uploadId: session.id,
      importType: 'students',
      skipErrors: false,
    })
    const durationMs = Date.now() - startTime
    
    expect(durationMs).toBeLessThan(30000)
    expect(processResult.status).toBe('COMPLETED')
    expect(processResult.successful).toBe(1000)
  })

  it('TEST-CSV-REG-021: Import 5000 students → completes within 2 minutes', async () => {
    const header = 'admission_number,first_name,last_name,class_name,date_of_birth'
    const rows = Array.from({ length: 5000 }, (_, i) => `ADM-${20000 + i},Asha,Patel,Grade 6,2012-05-10`).join('\n')
    const csvContent = `${header}\n${rows}`
    
    const parsed = parseCsv(csvContent)
    const session = createUploadSession({
      fileName: 'students_5000.csv',
      fileSize: csvContent.length,
      parsed,
    })
    
    const mapping = suggestColumnMapping('students', parsed.headers)
    const startTime = Date.now()
    await validateImportUpload({
      schoolId: 'school-1',
      uploadId: session.id,
      importType: 'students',
      columnMapping: mapping,
    })
    
    const processResult = await processImportUpload({
      schoolId: 'school-1',
      userId: 'user-1',
      uploadId: session.id,
      importType: 'students',
      skipErrors: false,
    })
    const durationMs = Date.now() - startTime
    
    expect(durationMs).toBeLessThan(120000)
    expect(processResult.status).toBe('COMPLETED')
    expect(processResult.successful).toBe(5000)
  })

  it('TEST-CSV-REG-022: Import with 50% duplicate admission numbers → rejects dupes, imports valid rows, reports failures accurately', async () => {
    const csvContent = [
      'admission_number,first_name,last_name,class_name,date_of_birth',
      'ADM-3001,Asha,Patel,Grade 6,2012-05-10',
      'ADM-3001,Duplicate1,Patel,Grade 6,2012-05-10',
      'ADM-3002,Rohan,Sharma,Grade 6,2012-05-10',
      'ADM-3002,Duplicate2,Sharma,Grade 6,2012-05-10',
      'ADM-3003,John,Doe,Grade 6,2012-05-10',
      'ADM-3003,Duplicate3,Doe,Grade 6,2012-05-10',
      'ADM-3004,Jane,Doe,Grade 6,2012-05-10',
      'ADM-3004,Duplicate4,Doe,Grade 6,2012-05-10',
      'ADM-3005,Bob,Smith,Grade 6,2012-05-10',
      'ADM-3005,Duplicate5,Smith,Grade 6,2012-05-10'
    ].join('\n')
    
    const parsed = parseCsv(csvContent)
    const session = createUploadSession({
      fileName: 'students_dupes.csv',
      fileSize: csvContent.length,
      parsed,
    })
    const mapping = suggestColumnMapping('students', parsed.headers)
    const validation = await validateImportUpload({
      schoolId: 'school-1',
      uploadId: session.id,
      importType: 'students',
      columnMapping: mapping,
    })
    
    expect(validation.total_rows).toBe(10)
    expect(validation.valid_rows).toBe(5)
    expect(validation.error_rows).toBe(5)
    expect(validation.errors).toHaveLength(5)
    expect(validation.errors[0].error).toBe('Duplicate admission number in upload')
    
    const processResult = await processImportUpload({
      schoolId: 'school-1',
      userId: 'user-1',
      uploadId: session.id,
      importType: 'students',
      skipErrors: true,
    })
    
    expect(processResult.status).toBe('PARTIAL')
    expect(processResult.successful).toBe(5)
    expect(processResult.failed).toBe(5)
  })

  it('TEST-CSV-REG-023: Import file with 0 data rows (header only) → appropriate message', () => {
    const csvContent = 'admission_number,first_name,last_name,class_name,date_of_birth\n'
    const parsed = parseCsv(csvContent)
    expect(parsed.rows).toHaveLength(0)
    expect(parsed.warnings).toContain('The uploaded file contains headers but no data rows.')
  })

  // 36D — All 5 Import Types
  it('TEST-CSV-REG-024: Student import end-to-end (template → upload → validate → process)', async () => {
    const csvContent = 'admission_number,first_name,last_name,class_name,date_of_birth\nADM-4001,Asha,Patel,Grade 6,2012-05-10'
    
    const template = getImportTemplate('students')
    expect(template.contents).toContain('admission_number')
    
    const parsed = parseCsv(csvContent)
    const session = createUploadSession({
      fileName: 'students_e2e.csv',
      fileSize: csvContent.length,
      parsed,
    })
    
    const mapping = suggestColumnMapping('students', parsed.headers)
    const validation = await validateImportUpload({
      schoolId: 'school-1',
      uploadId: session.id,
      importType: 'students',
      columnMapping: mapping,
    })
    expect(validation.valid_rows).toBe(1)
    
    const processResult = await processImportUpload({
      schoolId: 'school-1',
      userId: 'user-1',
      uploadId: session.id,
      importType: 'students',
      skipErrors: false,
      createUserAccounts: true,
    })
    
    expect(processResult.status).toBe('COMPLETED')
    expect(processResult.successful).toBe(1)
    expect(mocks.studentCreate).toHaveBeenCalledTimes(1)
    expect(mocks.userCreate).toHaveBeenCalledTimes(1)
    expect(mocks.createAuditLog).toHaveBeenCalledTimes(1)
  })

  it('TEST-CSV-REG-025: Staff import end-to-end', async () => {
    const csvContent = 'employee_code,first_name,last_name,gender,date_of_birth,phone,designation,department,date_of_joining,qualification\nSTF-4001,Rohan,Sharma,MALE,1988-03-18,9123456789,Math Teacher,Academics,2024-06-01,B.Ed'
    const parsed = parseCsv(csvContent)
    const session = createUploadSession({
      fileName: 'staff_e2e.csv',
      fileSize: csvContent.length,
      parsed,
    })
    
    const mapping = suggestColumnMapping('staff', parsed.headers)
    const validation = await validateImportUpload({
      schoolId: 'school-1',
      uploadId: session.id,
      importType: 'staff',
      columnMapping: mapping,
    })
    expect(validation.valid_rows).toBe(1)
    
    const processResult = await processImportUpload({
      schoolId: 'school-1',
      userId: 'user-1',
      uploadId: session.id,
      importType: 'staff',
      skipErrors: false,
      createUserAccounts: true,
      staffRole: 'TEACHER',
    })
    
    expect(processResult.status).toBe('COMPLETED')
    expect(processResult.successful).toBe(1)
    expect(mocks.staffCreate).toHaveBeenCalledTimes(1)
    expect(mocks.userCreate).toHaveBeenCalledTimes(1)
    expect(mocks.createAuditLog).toHaveBeenCalledTimes(1)
  })

  it('TEST-CSV-REG-026: Parent import end-to-end with auto-linking', async () => {
    mocks.studentFindMany.mockResolvedValue([
      { id: 'student-existing-id', admission_number: 'ADM-4001', class_id: 'class-1', academic_year_id: 'year-1' }
    ])
    
    const csvContent = 'first_name,last_name,relation,phone,student_admission_number\nRita,Patel,MOTHER,9876543210,ADM-4001'
    const parsed = parseCsv(csvContent)
    const session = createUploadSession({
      fileName: 'parents_e2e.csv',
      fileSize: csvContent.length,
      parsed,
    })
    
    const mapping = suggestColumnMapping('parents', parsed.headers)
    const validation = await validateImportUpload({
      schoolId: 'school-1',
      uploadId: session.id,
      importType: 'parents',
      columnMapping: mapping,
    })
    expect(validation.valid_rows).toBe(1)
    
    const processResult = await processImportUpload({
      schoolId: 'school-1',
      userId: 'user-1',
      uploadId: session.id,
      importType: 'parents',
      skipErrors: false,
      createUserAccounts: true,
    })
    
    expect(processResult.status).toBe('COMPLETED')
    expect(processResult.successful).toBe(1)
    expect(mocks.parentCreate).toHaveBeenCalledTimes(1)
    expect(mocks.studentParentCreate).toHaveBeenCalledTimes(1)
    expect(mocks.createAuditLog).toHaveBeenCalledTimes(1)
  })

  it('TEST-CSV-REG-027: Student-parent link import end-to-end', async () => {
    mocks.studentFindMany.mockResolvedValue([
      { id: 'student-id-1', admission_number: 'ADM-4001' }
    ])
    mocks.parentFindMany.mockResolvedValue([
      { id: 'parent-id-1', phone: '9876543210' }
    ])
    
    const csvContent = 'student_admission_number,parent_phone,is_primary\nADM-4001,9876543210,true'
    const parsed = parseCsv(csvContent)
    const session = createUploadSession({
      fileName: 'links_e2e.csv',
      fileSize: csvContent.length,
      parsed,
    })
    
    const mapping = suggestColumnMapping('student_parents', parsed.headers)
    const validation = await validateImportUpload({
      schoolId: 'school-1',
      uploadId: session.id,
      importType: 'student_parents',
      columnMapping: mapping,
    })
    expect(validation.valid_rows).toBe(1)
    
    const processResult = await processImportUpload({
      schoolId: 'school-1',
      userId: 'user-1',
      uploadId: session.id,
      importType: 'student_parents',
      skipErrors: false,
    })
    
    expect(processResult.status).toBe('COMPLETED')
    expect(processResult.successful).toBe(1)
    expect(mocks.studentParentCreate).toHaveBeenCalledTimes(1)
    expect(mocks.createAuditLog).toHaveBeenCalledTimes(1)
  })

  it('TEST-CSV-REG-028: Fee payment import end-to-end with receipt numbers', async () => {
    mocks.studentFindMany.mockResolvedValue([
      { id: 'student-id-1', admission_number: 'ADM-4001', class_id: 'class-1', academic_year_id: 'year-1' }
    ])
    mocks.feeStructureFindMany.mockResolvedValue([
      { id: 'structure-1', class_id: 'class-1', academic_year_id: 'year-1', category: { name: 'Tuition' } }
    ])
    mocks.staffFindFirst.mockResolvedValue({ id: 'staff-collector-id' })
    
    const csvContent = 'student_admission_number,fee_category_name,amount_paid,payment_date,payment_mode,receipt_number\nADM-4001,Tuition,2500,2025-07-10,CASH,REC-4001'
    const parsed = parseCsv(csvContent)
    const session = createUploadSession({
      fileName: 'fees_e2e.csv',
      fileSize: csvContent.length,
      parsed,
    })
    
    const mapping = suggestColumnMapping('fee_payments', parsed.headers)
    const validation = await validateImportUpload({
      schoolId: 'school-1',
      uploadId: session.id,
      importType: 'fee_payments',
      columnMapping: mapping,
    })
    expect(validation.valid_rows).toBe(1)
    
    const processResult = await processImportUpload({
      schoolId: 'school-1',
      userId: 'user-1',
      uploadId: session.id,
      importType: 'fee_payments',
      skipErrors: false,
    })
    
    expect(processResult.status).toBe('COMPLETED')
    expect(processResult.successful).toBe(1)
    expect(mocks.feePaymentCreate).toHaveBeenCalledTimes(1)
    expect(mocks.createAuditLog).toHaveBeenCalledTimes(1)
  })
})
