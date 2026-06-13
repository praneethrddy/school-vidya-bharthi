import bcrypt from 'bcryptjs'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'
import { generatePassword } from '@/lib/utils'
import { parseCsv } from '@/lib/csv-parser'
import {
  createUploadSession,
  deleteUploadSession,
  getUploadSession,
  saveValidationResult,
  type PreparedImportRow,
} from '@/lib/import-session-store'
import {
  buildTemplateCsv,
  getImportDefinition,
  IMPORT_BATCH_SIZE,
  isImportType,
  STAFF_IMPORT_ACCOUNT_ROLES,
  suggestColumnMapping,
  type ImportProcessResult,
  type ImportType,
  type ImportUploadResponse,
  type StaffImportAccountRole,
} from '@/lib/import-types'
import { validateImportData } from '@/lib/import-validator'

const MAX_IMPORT_FILE_SIZE = 10 * 1024 * 1024
const ALLOWED_MIME_TYPES = new Set([
  'text/csv',
  'application/vnd.ms-excel',
  'application/csv',
  'text/plain',
])

function chunk<T>(items: T[], size: number): T[][] {
  const batches: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size))
  }
  return batches
}

function getSyntheticEmail(input: {
  identifier: string
  schoolSlug: string
  namespace: 'students' | 'staff' | 'parents'
}): string {
  const identifier = input.identifier.toLowerCase().replace(/[^a-z0-9]/g, '')
  return `${identifier || 'user'}@${input.namespace}.${input.schoolSlug}.local`
}

function normalizeErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message
  }
  return 'Unknown import error'
}

async function resolveSchoolSlug(schoolId: string): Promise<string> {
  const school = await prisma.school.findFirst({
    where: { id: schoolId },
    select: { slug: true },
  })

  return school?.slug || 'school'
}

async function createUserAccount(input: {
  schoolId: string
  email: string
  role: 'STUDENT' | 'PARENT' | StaffImportAccountRole
  defaultPassword?: string
}) {
  const existingUser = await prisma.user.findFirst({
    where: {
      school_id: input.schoolId,
      email: input.email,
    },
    select: { id: true },
  })

  if (existingUser) {
    throw new Error(`User account already exists for ${input.email}`)
  }

  const password = input.defaultPassword || generatePassword(12)

  const user = await prisma.user.create({
    data: {
      school_id: input.schoolId,
      email: input.email,
      password_hash: await bcrypt.hash(password, 12),
      role: input.role,
      is_active: true,
    },
    select: {
      id: true,
    },
  })

  return user.id
}

async function processStudentRow(input: {
  schoolId: string
  row: PreparedImportRow
  createUserAccounts: boolean
  defaultPassword?: string
  schoolSlug: string
}) {
  const data = input.row.data as {
    admission_number: string
    first_name: string
    last_name: string
    gender: 'MALE' | 'FEMALE' | 'OTHER' | null
    date_of_birth: Date
    blood_group: string | null
    phone: string | null
    address: string | null
    emergency_contact_name: string | null
    emergency_contact_phone: string | null
    class_id: string
    academic_year_id: string
    admission_date: Date | null
    roll_number: string | null
  }

  let userId: string | null = null
  if (input.createUserAccounts) {
    userId = await createUserAccount({
      schoolId: input.schoolId,
      email: getSyntheticEmail({
        identifier: data.admission_number,
        schoolSlug: input.schoolSlug,
        namespace: 'students',
      }),
      role: 'STUDENT',
      defaultPassword: input.defaultPassword,
    })
  }

  await prisma.student.create({
    data: {
      school_id: input.schoolId,
      user_id: userId,
      admission_number: data.admission_number,
      first_name: data.first_name,
      last_name: data.last_name,
      gender: data.gender,
      date_of_birth: data.date_of_birth,
      blood_group: data.blood_group,
      phone: data.phone,
      address: data.address,
      emergency_contact_name: data.emergency_contact_name,
      emergency_contact_phone: data.emergency_contact_phone,
      class_id: data.class_id,
      academic_year_id: data.academic_year_id,
      admission_date: data.admission_date ?? new Date(),
      roll_number: data.roll_number,
      is_active: true,
    },
  })

  return {
    createdAccount: Boolean(userId),
  }
}

async function processStaffRow(input: {
  schoolId: string
  row: PreparedImportRow
  createUserAccounts: boolean
  defaultPassword?: string
  staffRole: StaffImportAccountRole
  schoolSlug: string
}) {
  const data = input.row.data as {
    employee_code: string
    first_name: string
    last_name: string
    gender: 'MALE' | 'FEMALE' | 'OTHER' | null
    date_of_birth: Date | null
    phone: string | null
    address: string | null
    designation: string | null
    department: string | null
    date_of_joining: Date | null
    qualification: string | null
  }

  let userId: string | null = null
  if (input.createUserAccounts) {
    userId = await createUserAccount({
      schoolId: input.schoolId,
      email: getSyntheticEmail({
        identifier: data.employee_code,
        schoolSlug: input.schoolSlug,
        namespace: 'staff',
      }),
      role: input.staffRole,
      defaultPassword: input.defaultPassword,
    })
  }

  await prisma.staff.create({
    data: {
      school_id: input.schoolId,
      user_id: userId,
      employee_code: data.employee_code,
      first_name: data.first_name,
      last_name: data.last_name,
      gender: data.gender,
      date_of_birth: data.date_of_birth,
      phone: data.phone,
      address: data.address,
      designation: data.designation,
      department: data.department,
      date_of_joining: data.date_of_joining,
      qualification: data.qualification,
      is_active: true,
    },
  })

  return {
    createdAccount: Boolean(userId),
  }
}

async function processParentRow(input: {
  schoolId: string
  row: PreparedImportRow
  createUserAccounts: boolean
  defaultPassword?: string
  schoolSlug: string
}) {
  const data = input.row.data as {
    first_name: string
    last_name: string
    relation: 'FATHER' | 'MOTHER' | 'GUARDIAN' | null
    phone: string
    alternate_phone: string | null
    email: string | null
    occupation: string | null
    address: string | null
    auto_link_student_id: string | null
  }

  let userId: string | null = null
  if (input.createUserAccounts) {
    userId = await createUserAccount({
      schoolId: input.schoolId,
      email:
        data.email ||
        getSyntheticEmail({
          identifier: data.phone,
          schoolSlug: input.schoolSlug,
          namespace: 'parents',
        }),
      role: 'PARENT',
      defaultPassword: input.defaultPassword,
    })
  }

  const parent = await prisma.parent.create({
    data: {
      school_id: input.schoolId,
      user_id: userId,
      first_name: data.first_name,
      last_name: data.last_name,
      relation: data.relation,
      phone: data.phone,
      alternate_phone: data.alternate_phone,
      email: data.email,
      occupation: data.occupation,
      address: data.address,
    },
    select: {
      id: true,
    },
  })

  if (data.auto_link_student_id) {
    await prisma.studentParent.create({
      data: {
        school_id: input.schoolId,
        student_id: data.auto_link_student_id,
        parent_id: parent.id,
        is_primary: false,
      },
    })
  }

  return {
    createdAccount: Boolean(userId),
  }
}

async function processStudentParentRow(input: { schoolId: string; row: PreparedImportRow }) {
  const data = input.row.data as {
    student_id: string
    parent_id: string
    is_primary: boolean
  }

  if (data.is_primary) {
    await prisma.studentParent.updateMany({
      where: {
        school_id: input.schoolId,
        student_id: data.student_id,
      },
      data: {
        is_primary: false,
      },
    })
  }

  await prisma.studentParent.create({
    data: {
      school_id: input.schoolId,
      student_id: data.student_id,
      parent_id: data.parent_id,
      is_primary: data.is_primary,
    },
  })

  return {
    createdAccount: false,
  }
}

async function processFeePaymentRow(input: {
  schoolId: string
  row: PreparedImportRow
  collectedBy: string
}) {
  const data = input.row.data as {
    student_id: string
    fee_structure_id: string
    amount_paid: number
    payment_date: Date
    payment_mode: 'CASH' | 'CHEQUE' | 'DD' | 'BANK_TRANSFER' | 'OTHER'
    receipt_number: string
    reference_number: string | null
    remarks: string | null
  }

  await prisma.feePayment.create({
    data: {
      school_id: input.schoolId,
      student_id: data.student_id,
      fee_structure_id: data.fee_structure_id,
      amount_paid: data.amount_paid,
      payment_date: data.payment_date,
      payment_mode: data.payment_mode,
      receipt_number: data.receipt_number,
      reference_number: data.reference_number,
      remarks: data.remarks,
      collected_by: input.collectedBy,
    },
  })

  return {
    createdAccount: false,
  }
}

export async function uploadImportFile(input: {
  file: File
  importType: ImportType
}): Promise<ImportUploadResponse> {
  if (!ALLOWED_MIME_TYPES.has(input.file.type) && !input.file.name.toLowerCase().endsWith('.csv')) {
    throw new Error('Please upload a CSV file')
  }

  if (input.file.size > MAX_IMPORT_FILE_SIZE) {
    throw new Error('Maximum file size is 10MB')
  }

  const text = await input.file.text()
  if (text.includes('\ufffd')) {
    throw new Error('CSV must be UTF-8 encoded')
  }

  const parsed = parseCsv(text)
  if (parsed.rows.length === 0) {
    throw new Error('The uploaded file contains no data rows')
  }

  const session = createUploadSession({
    fileName: input.file.name,
    fileSize: input.file.size,
    parsed,
  })

  return {
    upload_id: session.id,
    detected_columns: parsed.headers,
    preview: parsed.rows.slice(0, 10),
    warnings: parsed.warnings,
    suggested_mapping: suggestColumnMapping(input.importType, parsed.headers),
  }
}

export async function validateImportUpload(input: {
  schoolId: string
  uploadId: string
  importType: ImportType
  columnMapping: Record<string, string | null>
}) {
  const session = getUploadSession(input.uploadId)
  if (!session) {
    throw new Error('Upload session not found or expired')
  }

  const validation = await validateImportData({
    schoolId: input.schoolId,
    importType: input.importType,
    rows: session.parsed.rows,
    columnMapping: input.columnMapping,
  })

  saveValidationResult(input.uploadId, {
    importType: input.importType,
    columnMapping: input.columnMapping,
    summary: validation.summary,
    preparedRows: validation.preparedRows,
  })

  return validation.summary
}

export async function processImportUpload(input: {
  schoolId: string
  userId: string
  uploadId: string
  importType: ImportType
  skipErrors: boolean
  createUserAccounts?: boolean
  defaultPassword?: string
  staffRole?: StaffImportAccountRole
  request?: NextRequest
}): Promise<ImportProcessResult> {
  const session = getUploadSession(input.uploadId)
  if (!session) {
    throw new Error('Upload session not found or expired')
  }

  if (!session.validation || session.validation.importType !== input.importType) {
    throw new Error('Please validate the upload before processing it')
  }

  if (
    input.staffRole &&
    !STAFF_IMPORT_ACCOUNT_ROLES.includes(input.staffRole as StaffImportAccountRole)
  ) {
    throw new Error('Invalid staff account role')
  }

  const validation = session.validation
  const hasBlockingErrors = validation.summary.error_rows > 0 && !input.skipErrors
  const rowsToProcess = hasBlockingErrors ? [] : validation.preparedRows
  const schoolSlug = await resolveSchoolSlug(input.schoolId)

  let collectedBy: string | null = null
  if (input.importType === 'fee_payments') {
    const staffMember = await prisma.staff.findFirst({
      where: {
        school_id: input.schoolId,
        user_id: input.userId,
      },
      select: {
        id: true,
      },
    })

    if (!staffMember) {
      throw new Error('A staff profile is required to import fee payments')
    }

    collectedBy = staffMember.id
  }

  const failedRows: ImportProcessResult['failed_rows'] = validation.summary.errors.map((error) => ({
    row_number: error.row_number,
    error: `${error.field}: ${error.error}`,
  }))

  let successful = 0
  let createdAccounts = 0

  if (rowsToProcess.length > 0) {
    const batches = chunk(rowsToProcess, IMPORT_BATCH_SIZE)

    for (const batch of batches) {
      for (const row of batch) {
        try {
          let outcome: { createdAccount: boolean }

          if (input.importType === 'students') {
            outcome = await processStudentRow({
              schoolId: input.schoolId,
              row,
              createUserAccounts: input.createUserAccounts === true,
              defaultPassword: input.defaultPassword,
              schoolSlug,
            })
          } else if (input.importType === 'staff') {
            outcome = await processStaffRow({
              schoolId: input.schoolId,
              row,
              createUserAccounts: input.createUserAccounts === true,
              defaultPassword: input.defaultPassword,
              staffRole: input.staffRole || 'TEACHER',
              schoolSlug,
            })
          } else if (input.importType === 'parents') {
            outcome = await processParentRow({
              schoolId: input.schoolId,
              row,
              createUserAccounts: input.createUserAccounts === true,
              defaultPassword: input.defaultPassword,
              schoolSlug,
            })
          } else if (input.importType === 'student_parents') {
            outcome = await processStudentParentRow({
              schoolId: input.schoolId,
              row,
            })
          } else {
            outcome = await processFeePaymentRow({
              schoolId: input.schoolId,
              row,
              collectedBy: collectedBy as string,
            })
          }

          successful += 1
          if (outcome.createdAccount) {
            createdAccounts += 1
          }
        } catch (error) {
          failedRows.push({
            row_number: row.row_number,
            error: normalizeErrorMessage(error),
            data: row.data,
          })
        }
      }
    }
  }

  const totalProcessed = rowsToProcess.length
  const failed = failedRows.length
  const importId = `import_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const status: ImportProcessResult['status'] =
    successful === 0 ? 'FAILED' : failed > 0 ? 'PARTIAL' : 'COMPLETED'

  await createAuditLog({
    school_id: input.schoolId,
    user_id: input.userId,
    action: 'IMPORT',
    entity_type: input.importType,
    entity_id: importId,
    new_value: {
      upload_id: input.uploadId,
      total_rows: validation.summary.total_rows,
      processed_rows: totalProcessed,
      successful,
      failed,
      created_accounts: createdAccounts,
      skipped_invalid_rows: input.skipErrors,
    },
    ip_address:
      input.request?.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      input.request?.headers.get('x-real-ip') ||
      undefined,
    user_agent: input.request?.headers.get('user-agent') || undefined,
  })

  deleteUploadSession(input.uploadId)

  return {
    status,
    total_processed: totalProcessed,
    successful,
    failed,
    failed_rows: failedRows,
    import_id: importId,
    created_accounts: createdAccounts,
  }
}

export function getImportTemplate(importType: ImportType): {
  fileName: string
  contents: string
} {
  const definition = getImportDefinition(importType)
  return {
    fileName: definition.templateFileName,
    contents: buildTemplateCsv(importType),
  }
}

export function getImportPermissions(importType: ImportType): string[] {
  return getImportDefinition(importType).permissions
}

export function parseRequestedImportType(value: string | null | undefined): ImportType {
  if (!value || !isImportType(value)) {
    throw new Error('Invalid import type')
  }

  return value
}
