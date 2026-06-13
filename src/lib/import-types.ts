export const IMPORT_TYPES = [
  'students',
  'staff',
  'parents',
  'student_parents',
  'fee_payments',
] as const

export type ImportType = (typeof IMPORT_TYPES)[number]

export const STAFF_IMPORT_ACCOUNT_ROLES = [
  'TEACHER',
  'STAFF_ADMIN',
  'STUDENT_ADMIN',
  'ACCOUNTANT',
] as const

export type StaffImportAccountRole = (typeof STAFF_IMPORT_ACCOUNT_ROLES)[number]

export interface ImportFieldDefinition {
  key: string
  label: string
  required?: boolean
  aliases: string[]
  sample: string
  description?: string
}

export interface ImportTypeDefinition {
  label: string
  shortLabel: string
  description: string
  permissions: string[]
  templateFileName: string
  fields: ImportFieldDefinition[]
}

export interface ParsedCsvResult {
  headers: string[]
  rows: Array<Record<string, string>>
  delimiter: ',' | ';' | '\t'
  duplicateHeaders: string[]
  warnings: string[]
}

export interface ImportValidationError {
  row_number: number
  field: string
  value: string
  error: string
}

export interface ImportPreviewRow {
  row_number: number
  data: Record<string, unknown>
}

export interface ImportValidationSummary {
  total_rows: number
  valid_rows: number
  error_rows: number
  errors: ImportValidationError[]
  preview: ImportPreviewRow[]
  warnings: string[]
  missing_required_fields: string[]
}

export interface ImportProcessFailedRow {
  row_number: number
  error: string
  data?: Record<string, unknown>
}

export interface ImportProcessResult {
  status: 'COMPLETED' | 'PARTIAL' | 'FAILED'
  total_processed: number
  successful: number
  failed: number
  failed_rows: ImportProcessFailedRow[]
  import_id: string
  created_accounts: number
}

export interface ImportUploadResponse {
  upload_id: string
  detected_columns: string[]
  preview: Array<Record<string, string>>
  warnings: string[]
  suggested_mapping: Record<string, string | null>
}

export const IMPORT_BATCH_SIZE = 50

export const IMPORT_TYPE_DEFINITIONS: Record<ImportType, ImportTypeDefinition> = {
  students: {
    label: 'Students',
    shortLabel: 'Students',
    description: 'Bulk create student records with class assignments and admission details.',
    permissions: ['STUDENTS.create'],
    templateFileName: 'students-import-template.csv',
    fields: [
      {
        key: 'admission_number',
        label: 'Admission Number',
        required: true,
        aliases: ['admission number', 'admission no', 'adm no', 'adm number'],
        sample: 'ADM-1001',
      },
      {
        key: 'first_name',
        label: 'First Name',
        required: true,
        aliases: ['firstname', 'student first name', 'given name'],
        sample: 'Asha',
      },
      {
        key: 'last_name',
        label: 'Last Name',
        required: true,
        aliases: ['lastname', 'student last name', 'surname'],
        sample: 'Patel',
      },
      {
        key: 'gender',
        label: 'Gender',
        aliases: ['sex'],
        sample: 'FEMALE',
      },
      {
        key: 'date_of_birth',
        label: 'Date of Birth',
        required: true,
        aliases: ['dob', 'birth date'],
        sample: '2012-05-10',
      },
      {
        key: 'blood_group',
        label: 'Blood Group',
        aliases: ['blood'],
        sample: 'O+',
      },
      {
        key: 'phone',
        label: 'Phone',
        aliases: ['student phone', 'mobile'],
        sample: '9876543210',
      },
      {
        key: 'address',
        label: 'Address',
        aliases: ['residential address'],
        sample: '12 Lake Road',
      },
      {
        key: 'emergency_contact_name',
        label: 'Emergency Contact Name',
        aliases: ['emergency name'],
        sample: 'Rita Patel',
      },
      {
        key: 'emergency_contact_phone',
        label: 'Emergency Contact Phone',
        aliases: ['emergency phone'],
        sample: '9876500000',
      },
      {
        key: 'class_name',
        label: 'Class Name',
        required: true,
        aliases: ['class', 'grade', 'standard'],
        sample: 'Grade 6',
      },
      {
        key: 'section',
        label: 'Section',
        aliases: ['division'],
        sample: 'A',
      },
      {
        key: 'roll_number',
        label: 'Roll Number',
        aliases: ['roll no'],
        sample: '12',
      },
      {
        key: 'admission_date',
        label: 'Admission Date',
        aliases: ['joined on'],
        sample: '2025-06-05',
      },
    ],
  },
  staff: {
    label: 'Staff',
    shortLabel: 'Staff',
    description: 'Import teachers and administrative staff with HR profile details.',
    permissions: ['STAFF.create'],
    templateFileName: 'staff-import-template.csv',
    fields: [
      {
        key: 'employee_code',
        label: 'Employee Code',
        required: true,
        aliases: ['employee id', 'staff code'],
        sample: 'STF-2001',
      },
      {
        key: 'first_name',
        label: 'First Name',
        required: true,
        aliases: ['firstname', 'staff first name'],
        sample: 'Rohan',
      },
      {
        key: 'last_name',
        label: 'Last Name',
        required: true,
        aliases: ['lastname', 'staff last name'],
        sample: 'Sharma',
      },
      {
        key: 'gender',
        label: 'Gender',
        aliases: ['sex'],
        sample: 'MALE',
      },
      {
        key: 'date_of_birth',
        label: 'Date of Birth',
        aliases: ['dob'],
        sample: '1988-03-18',
      },
      {
        key: 'phone',
        label: 'Phone',
        aliases: ['mobile'],
        sample: '9123456789',
      },
      {
        key: 'address',
        label: 'Address',
        aliases: ['residential address'],
        sample: '5 Temple Street',
      },
      {
        key: 'designation',
        label: 'Designation',
        aliases: ['job title'],
        sample: 'Math Teacher',
      },
      {
        key: 'department',
        label: 'Department',
        aliases: ['dept'],
        sample: 'Academics',
      },
      {
        key: 'date_of_joining',
        label: 'Date of Joining',
        aliases: ['joining date', 'joined on'],
        sample: '2024-06-01',
      },
      {
        key: 'qualification',
        label: 'Qualification',
        aliases: ['education'],
        sample: 'B.Ed, M.Sc',
      },
    ],
  },
  parents: {
    label: 'Parents',
    shortLabel: 'Parents',
    description: 'Create parent or guardian contacts and optionally auto-link them to students.',
    permissions: ['STUDENTS.create'],
    templateFileName: 'parents-import-template.csv',
    fields: [
      {
        key: 'first_name',
        label: 'First Name',
        required: true,
        aliases: ['firstname', 'parent first name'],
        sample: 'Rita',
      },
      {
        key: 'last_name',
        label: 'Last Name',
        required: true,
        aliases: ['lastname', 'parent last name'],
        sample: 'Patel',
      },
      {
        key: 'relation',
        label: 'Relation',
        aliases: ['guardian relation'],
        sample: 'MOTHER',
      },
      {
        key: 'phone',
        label: 'Phone',
        required: true,
        aliases: ['mobile', 'parent phone'],
        sample: '9876543210',
      },
      {
        key: 'alternate_phone',
        label: 'Alternate Phone',
        aliases: ['alternate mobile'],
        sample: '9876500000',
      },
      {
        key: 'email',
        label: 'Email',
        aliases: ['mail'],
        sample: 'rita@example.com',
      },
      {
        key: 'occupation',
        label: 'Occupation',
        aliases: ['job'],
        sample: 'Architect',
      },
      {
        key: 'address',
        label: 'Address',
        aliases: ['residential address'],
        sample: '12 Lake Road',
      },
      {
        key: 'student_admission_number',
        label: 'Student Admission Number',
        aliases: ['student admission', 'student id'],
        sample: 'ADM-1001',
      },
    ],
  },
  student_parents: {
    label: 'Student-Parent Links',
    shortLabel: 'Links',
    description: 'Link existing students and parents in bulk, including primary guardian flags.',
    permissions: ['STUDENTS.create'],
    templateFileName: 'student-parent-links-template.csv',
    fields: [
      {
        key: 'student_admission_number',
        label: 'Student Admission Number',
        required: true,
        aliases: ['student admission', 'student id'],
        sample: 'ADM-1001',
      },
      {
        key: 'parent_phone',
        label: 'Parent Phone',
        required: true,
        aliases: ['phone', 'guardian phone'],
        sample: '9876543210',
      },
      {
        key: 'is_primary',
        label: 'Is Primary',
        aliases: ['primary guardian'],
        sample: 'true',
      },
    ],
  },
  fee_payments: {
    label: 'Fee Payment History',
    shortLabel: 'Fees',
    description: 'Bring historical offline fee collection records into the live ledger.',
    permissions: ['FEES.record_payment'],
    templateFileName: 'fee-payments-import-template.csv',
    fields: [
      {
        key: 'student_admission_number',
        label: 'Student Admission Number',
        required: true,
        aliases: ['student admission', 'student id'],
        sample: 'ADM-1001',
      },
      {
        key: 'fee_category_name',
        label: 'Fee Category Name',
        required: true,
        aliases: ['fee category', 'category'],
        sample: 'Tuition',
      },
      {
        key: 'amount_paid',
        label: 'Amount Paid',
        required: true,
        aliases: ['amount', 'paid amount'],
        sample: '2500',
      },
      {
        key: 'payment_date',
        label: 'Payment Date',
        required: true,
        aliases: ['date paid'],
        sample: '2025-07-10',
      },
      {
        key: 'payment_mode',
        label: 'Payment Mode',
        required: true,
        aliases: ['mode'],
        sample: 'CASH',
      },
      {
        key: 'receipt_number',
        label: 'Receipt Number',
        required: true,
        aliases: ['receipt no'],
        sample: 'VBHS-2025-000123',
      },
      {
        key: 'reference_number',
        label: 'Reference Number',
        aliases: ['reference', 'transaction reference'],
        sample: 'CHQ-5531',
      },
      {
        key: 'remarks',
        label: 'Remarks',
        aliases: ['notes'],
        sample: 'Imported from legacy ERP',
      },
    ],
  },
}

export function isImportType(value: string): value is ImportType {
  return IMPORT_TYPES.includes(value as ImportType)
}

export function getImportDefinition(importType: ImportType): ImportTypeDefinition {
  return IMPORT_TYPE_DEFINITIONS[importType]
}

export function normalizeImportKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

export function suggestColumnMapping(
  importType: ImportType,
  headers: string[]
): Record<string, string | null> {
  const definition = getImportDefinition(importType)
  const normalizedHeaders = new Map<string, string>()

  for (const header of headers) {
    normalizedHeaders.set(normalizeImportKey(header), header)
  }

  return Object.fromEntries(
    definition.fields.map((field) => {
      const candidates = [field.key, field.label, ...field.aliases].map(normalizeImportKey)
      const match = candidates.find((candidate) => normalizedHeaders.has(candidate))
      return [field.key, match ? (normalizedHeaders.get(match) ?? null) : null]
    })
  )
}

export function buildTemplateCsv(importType: ImportType): string {
  const definition = getImportDefinition(importType)
  const headers = definition.fields.map((field) => field.key)
  const sampleRow = definition.fields.map((field) => escapeCsvValue(field.sample))

  return `${headers.join(',')}\n${sampleRow.join(',')}\n`
}

export function escapeCsvValue(value: string | number | boolean | null | undefined): string {
  const normalized = value === null || value === undefined ? '' : String(value)
  if (/[",\n;]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`
  }
  return normalized
}
