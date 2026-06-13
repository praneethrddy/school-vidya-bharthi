import { Gender, ParentRelation, PaymentMode } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import type { PreparedImportRow } from '@/lib/import-session-store'
import {
  getImportDefinition,
  isImportType,
  normalizeImportKey,
  suggestColumnMapping,
  type ImportPreviewRow,
  type ImportType,
  type ImportValidationError,
  type ImportValidationSummary,
} from '@/lib/import-types'

const PHONE_REGEX = /^[0-9+\-() ]{6,20}$/
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface ValidateImportDataInput {
  schoolId: string
  importType: ImportType
  rows: Array<Record<string, string>>
  columnMapping: Record<string, string | null>
}

type ValidationContext = Awaited<ReturnType<typeof loadValidationContext>>

function normalizeValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function parseDate(value: string): Date | null {
  if (!value) return null

  const trimmed = value.trim()
  const direct = new Date(trimmed)
  if (!Number.isNaN(direct.getTime())) {
    return direct
  }

  const ddMmYyyy = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (ddMmYyyy) {
    const [, day, month, year] = ddMmYyyy
    const parsed = new Date(`${year}-${month}-${day}`)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  return null
}

function parseGender(value: string): Gender | null {
  const normalized = value.trim().toUpperCase()
  if (!normalized) return null
  if (normalized === 'M') return Gender.MALE
  if (normalized === 'F') return Gender.FEMALE
  if (normalized === 'O') return Gender.OTHER
  if (normalized in Gender) {
    return Gender[normalized as keyof typeof Gender]
  }
  return null
}

function parseParentRelation(value: string): ParentRelation | null {
  const normalized = value.trim().toUpperCase()
  if (!normalized) return null
  if (normalized in ParentRelation) {
    return ParentRelation[normalized as keyof typeof ParentRelation]
  }
  return null
}

function parsePaymentMode(value: string): PaymentMode | null {
  const normalized = value.trim().toUpperCase().replace(/\s+/g, '_')
  if (!normalized) return null
  if (normalized === 'BANKTRANSFER') return PaymentMode.BANK_TRANSFER
  if (normalized in PaymentMode) {
    return PaymentMode[normalized as keyof typeof PaymentMode]
  }
  return null
}

function parseBoolean(value: string): boolean {
  const normalized = value.trim().toLowerCase()
  return normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'y'
}

function makePreviewRows(rows: PreparedImportRow[]): ImportPreviewRow[] {
  return rows.slice(0, 5).map((row) => ({
    row_number: row.row_number,
    data: row.data,
  }))
}

function mapRowsWithMapping(
  importType: ImportType,
  rows: Array<Record<string, string>>,
  columnMapping: Record<string, string | null>
): Array<{ rowNumber: number; raw: Record<string, string>; mapped: Record<string, string> }> {
  const definition = getImportDefinition(importType)

  return rows.map((raw, index) => {
    const mapped = Object.fromEntries(
      definition.fields.map((field) => [
        field.key,
        normalizeValue(raw[columnMapping[field.key] || '']),
      ])
    )

    return {
      rowNumber: index + 2,
      raw,
      mapped,
    }
  })
}

async function loadValidationContext(schoolId: string) {
  const [academicYears, classes, students, staff, parents, feeStructures, feePayments] =
    await Promise.all([
      prisma.academicYear.findMany({
        where: { school_id: schoolId },
        select: {
          id: true,
          name: true,
          is_current: true,
          start_date: true,
        },
        orderBy: [{ start_date: 'desc' }],
      }),
      prisma.class.findMany({
        where: { school_id: schoolId },
        select: {
          id: true,
          name: true,
          section: true,
          academic_year_id: true,
        },
      }),
      prisma.student.findMany({
        where: { school_id: schoolId },
        select: {
          id: true,
          admission_number: true,
          class_id: true,
          academic_year_id: true,
        },
      }),
      prisma.staff.findMany({
        where: { school_id: schoolId },
        select: {
          id: true,
          employee_code: true,
        },
      }),
      prisma.parent.findMany({
        where: { school_id: schoolId },
        select: {
          id: true,
          first_name: true,
          last_name: true,
          phone: true,
        },
      }),
      prisma.feeStructure.findMany({
        where: { school_id: schoolId },
        select: {
          id: true,
          class_id: true,
          academic_year_id: true,
          category: {
            select: {
              name: true,
            },
          },
        },
      }),
      prisma.feePayment.findMany({
        where: { school_id: schoolId },
        select: {
          receipt_number: true,
        },
      }),
    ])

  const currentAcademicYear =
    academicYears.find((year) => year.is_current) ?? academicYears[0] ?? null

  return {
    currentAcademicYear,
    classesByLookup: new Map(
      classes.map((schoolClass) => [
        `${normalizeImportKey(schoolClass.name)}::${normalizeImportKey(schoolClass.section ?? '')}::${schoolClass.academic_year_id}`,
        schoolClass,
      ])
    ),
    studentsByAdmission: new Map(
      students.map((student) => [normalizeImportKey(student.admission_number), student])
    ),
    staffByEmployeeCode: new Map(
      staff
        .filter((member) => member.employee_code)
        .map((member) => [normalizeImportKey(member.employee_code ?? ''), member])
    ),
    parentsByPhone: new Map(parents.map((parent) => [normalizeImportKey(parent.phone), parent])),
    feeStructureByLookup: new Map(
      feeStructures.map((structure) => [
        `${structure.class_id}::${structure.academic_year_id}::${normalizeImportKey(structure.category.name)}`,
        structure,
      ])
    ),
    existingReceiptNumbers: new Set(
      feePayments.map((payment) => normalizeImportKey(payment.receipt_number))
    ),
    existingLinks: new Set(
      (
        await prisma.studentParent.findMany({
          where: { school_id: schoolId },
          select: {
            student_id: true,
            parent_id: true,
          },
        })
      ).map((link) => `${link.student_id}::${link.parent_id}`)
    ),
  }
}

function getMissingRequiredFields(
  importType: ImportType,
  columnMapping: Record<string, string | null>
): string[] {
  return getImportDefinition(importType)
    .fields.filter((field) => field.required && !columnMapping[field.key])
    .map((field) => field.key)
}

function pushError(
  collection: ImportValidationError[],
  rowNumber: number,
  field: string,
  value: string,
  error: string
) {
  collection.push({
    row_number: rowNumber,
    field,
    value,
    error,
  })
}

function getClassForStudentRow(
  context: ValidationContext,
  mapped: Record<string, string>
): { id: string; academic_year_id: string } | null {
  const academicYearId = context.currentAcademicYear?.id
  if (!academicYearId) return null

  const key = `${normalizeImportKey(mapped.class_name)}::${normalizeImportKey(mapped.section)}::${academicYearId}`
  const schoolClass = context.classesByLookup.get(key)
  return schoolClass
    ? {
        id: schoolClass.id,
        academic_year_id: schoolClass.academic_year_id,
      }
    : null
}

function validateStudents(
  mappedRows: ReturnType<typeof mapRowsWithMapping>,
  context: ValidationContext,
  errors: ImportValidationError[]
): PreparedImportRow[] {
  const preparedRows: PreparedImportRow[] = []
  const seenAdmissionNumbers = new Set<string>()

  for (const row of mappedRows) {
    const admissionKey = normalizeImportKey(row.mapped.admission_number)
    const classRecord = getClassForStudentRow(context, row.mapped)
    const dateOfBirth = parseDate(row.mapped.date_of_birth)
    const admissionDate = parseDate(row.mapped.admission_date)
    const gender = parseGender(row.mapped.gender)

    if (!admissionKey) {
      pushError(
        errors,
        row.rowNumber,
        'admission_number',
        row.mapped.admission_number,
        'Admission number is required'
      )
    } else if (context.studentsByAdmission.has(admissionKey)) {
      pushError(
        errors,
        row.rowNumber,
        'admission_number',
        row.mapped.admission_number,
        'Admission number already exists'
      )
    } else if (seenAdmissionNumbers.has(admissionKey)) {
      pushError(
        errors,
        row.rowNumber,
        'admission_number',
        row.mapped.admission_number,
        'Duplicate admission number in upload'
      )
    } else {
      seenAdmissionNumbers.add(admissionKey)
    }

    if (!dateOfBirth) {
      pushError(
        errors,
        row.rowNumber,
        'date_of_birth',
        row.mapped.date_of_birth,
        'Invalid date of birth'
      )
    }

    if (row.mapped.gender && !gender) {
      pushError(
        errors,
        row.rowNumber,
        'gender',
        row.mapped.gender,
        'Gender must be MALE, FEMALE, or OTHER'
      )
    }

    if (!classRecord) {
      pushError(
        errors,
        row.rowNumber,
        'class_name',
        row.mapped.class_name,
        'Class could not be matched in the current academic year'
      )
    }

    if (row.mapped.phone && !PHONE_REGEX.test(row.mapped.phone)) {
      pushError(errors, row.rowNumber, 'phone', row.mapped.phone, 'Invalid phone format')
    }

    if (
      row.mapped.emergency_contact_phone &&
      !PHONE_REGEX.test(row.mapped.emergency_contact_phone)
    ) {
      pushError(
        errors,
        row.rowNumber,
        'emergency_contact_phone',
        row.mapped.emergency_contact_phone,
        'Invalid emergency contact phone format'
      )
    }

    if (errors.some((error) => error.row_number === row.rowNumber)) {
      continue
    }

    preparedRows.push({
      row_number: row.rowNumber,
      raw: row.raw,
      data: {
        admission_number: row.mapped.admission_number,
        first_name: row.mapped.first_name,
        last_name: row.mapped.last_name,
        gender,
        date_of_birth: dateOfBirth,
        blood_group: row.mapped.blood_group || null,
        phone: row.mapped.phone || null,
        address: row.mapped.address || null,
        emergency_contact_name: row.mapped.emergency_contact_name || null,
        emergency_contact_phone: row.mapped.emergency_contact_phone || null,
        class_id: classRecord?.id,
        academic_year_id: classRecord?.academic_year_id,
        admission_date: admissionDate,
        roll_number: row.mapped.roll_number || null,
      },
    })
  }

  return preparedRows
}

function validateStaff(
  mappedRows: ReturnType<typeof mapRowsWithMapping>,
  context: ValidationContext,
  errors: ImportValidationError[]
): PreparedImportRow[] {
  const preparedRows: PreparedImportRow[] = []
  const seenEmployeeCodes = new Set<string>()

  for (const row of mappedRows) {
    const employeeKey = normalizeImportKey(row.mapped.employee_code)
    const dateOfBirth = parseDate(row.mapped.date_of_birth)
    const joinedOn = parseDate(row.mapped.date_of_joining)
    const gender = parseGender(row.mapped.gender)

    if (!employeeKey) {
      pushError(
        errors,
        row.rowNumber,
        'employee_code',
        row.mapped.employee_code,
        'Employee code is required'
      )
    } else if (context.staffByEmployeeCode.has(employeeKey)) {
      pushError(
        errors,
        row.rowNumber,
        'employee_code',
        row.mapped.employee_code,
        'Employee code already exists'
      )
    } else if (seenEmployeeCodes.has(employeeKey)) {
      pushError(
        errors,
        row.rowNumber,
        'employee_code',
        row.mapped.employee_code,
        'Duplicate employee code in upload'
      )
    } else {
      seenEmployeeCodes.add(employeeKey)
    }

    if (row.mapped.gender && !gender) {
      pushError(
        errors,
        row.rowNumber,
        'gender',
        row.mapped.gender,
        'Gender must be MALE, FEMALE, or OTHER'
      )
    }

    if (row.mapped.date_of_birth && !dateOfBirth) {
      pushError(
        errors,
        row.rowNumber,
        'date_of_birth',
        row.mapped.date_of_birth,
        'Invalid date of birth'
      )
    }

    if (row.mapped.date_of_joining && !joinedOn) {
      pushError(
        errors,
        row.rowNumber,
        'date_of_joining',
        row.mapped.date_of_joining,
        'Invalid joining date'
      )
    }

    if (row.mapped.phone && !PHONE_REGEX.test(row.mapped.phone)) {
      pushError(errors, row.rowNumber, 'phone', row.mapped.phone, 'Invalid phone format')
    }

    if (errors.some((error) => error.row_number === row.rowNumber)) {
      continue
    }

    preparedRows.push({
      row_number: row.rowNumber,
      raw: row.raw,
      data: {
        employee_code: row.mapped.employee_code,
        first_name: row.mapped.first_name,
        last_name: row.mapped.last_name,
        gender,
        date_of_birth: dateOfBirth,
        phone: row.mapped.phone || null,
        address: row.mapped.address || null,
        designation: row.mapped.designation || null,
        department: row.mapped.department || null,
        date_of_joining: joinedOn,
        qualification: row.mapped.qualification || null,
      },
    })
  }

  return preparedRows
}

function validateParents(
  mappedRows: ReturnType<typeof mapRowsWithMapping>,
  context: ValidationContext,
  errors: ImportValidationError[]
): PreparedImportRow[] {
  const preparedRows: PreparedImportRow[] = []

  for (const row of mappedRows) {
    const relation = parseParentRelation(row.mapped.relation)
    const student = row.mapped.student_admission_number
      ? context.studentsByAdmission.get(normalizeImportKey(row.mapped.student_admission_number))
      : null

    if (row.mapped.phone && !PHONE_REGEX.test(row.mapped.phone)) {
      pushError(errors, row.rowNumber, 'phone', row.mapped.phone, 'Invalid phone format')
    }

    if (row.mapped.alternate_phone && !PHONE_REGEX.test(row.mapped.alternate_phone)) {
      pushError(
        errors,
        row.rowNumber,
        'alternate_phone',
        row.mapped.alternate_phone,
        'Invalid alternate phone format'
      )
    }

    if (row.mapped.email && !EMAIL_REGEX.test(row.mapped.email)) {
      pushError(errors, row.rowNumber, 'email', row.mapped.email, 'Invalid email format')
    }

    if (row.mapped.relation && !relation) {
      pushError(
        errors,
        row.rowNumber,
        'relation',
        row.mapped.relation,
        'Relation must be FATHER, MOTHER, or GUARDIAN'
      )
    }

    if (row.mapped.student_admission_number && !student) {
      pushError(
        errors,
        row.rowNumber,
        'student_admission_number',
        row.mapped.student_admission_number,
        'Student could not be found for auto-linkage'
      )
    }

    if (errors.some((error) => error.row_number === row.rowNumber)) {
      continue
    }

    preparedRows.push({
      row_number: row.rowNumber,
      raw: row.raw,
      data: {
        first_name: row.mapped.first_name,
        last_name: row.mapped.last_name,
        relation,
        phone: row.mapped.phone,
        alternate_phone: row.mapped.alternate_phone || null,
        email: row.mapped.email || null,
        occupation: row.mapped.occupation || null,
        address: row.mapped.address || null,
        auto_link_student_id: student?.id ?? null,
      },
    })
  }

  return preparedRows
}

function validateStudentParents(
  mappedRows: ReturnType<typeof mapRowsWithMapping>,
  context: ValidationContext,
  errors: ImportValidationError[]
): PreparedImportRow[] {
  const preparedRows: PreparedImportRow[] = []
  const seenLinks = new Set<string>()

  for (const row of mappedRows) {
    const student = context.studentsByAdmission.get(
      normalizeImportKey(row.mapped.student_admission_number)
    )
    const parent = context.parentsByPhone.get(normalizeImportKey(row.mapped.parent_phone))

    if (!student) {
      pushError(
        errors,
        row.rowNumber,
        'student_admission_number',
        row.mapped.student_admission_number,
        'Student could not be found'
      )
    }

    if (!parent) {
      pushError(
        errors,
        row.rowNumber,
        'parent_phone',
        row.mapped.parent_phone,
        'Parent could not be found'
      )
    }

    const linkKey = student && parent ? `${student.id}::${parent.id}` : null
    if (linkKey && context.existingLinks.has(linkKey)) {
      pushError(
        errors,
        row.rowNumber,
        'parent_phone',
        row.mapped.parent_phone,
        'Student-parent link already exists'
      )
    }
    if (linkKey && seenLinks.has(linkKey)) {
      pushError(
        errors,
        row.rowNumber,
        'parent_phone',
        row.mapped.parent_phone,
        'Duplicate student-parent link in upload'
      )
    }

    if (linkKey) {
      seenLinks.add(linkKey)
    }

    if (errors.some((error) => error.row_number === row.rowNumber)) {
      continue
    }

    preparedRows.push({
      row_number: row.rowNumber,
      raw: row.raw,
      data: {
        student_id: student?.id,
        parent_id: parent?.id,
        is_primary: parseBoolean(row.mapped.is_primary),
      },
    })
  }

  return preparedRows
}

function validateFeePayments(
  mappedRows: ReturnType<typeof mapRowsWithMapping>,
  context: ValidationContext,
  errors: ImportValidationError[]
): PreparedImportRow[] {
  const preparedRows: PreparedImportRow[] = []
  const seenReceipts = new Set<string>()

  for (const row of mappedRows) {
    const student = context.studentsByAdmission.get(
      normalizeImportKey(row.mapped.student_admission_number)
    )
    const amount = Number(row.mapped.amount_paid)
    const paymentDate = parseDate(row.mapped.payment_date)
    const paymentMode = parsePaymentMode(row.mapped.payment_mode)
    const receiptKey = normalizeImportKey(row.mapped.receipt_number)
    const academicYearId = student?.academic_year_id ?? context.currentAcademicYear?.id ?? null
    const structureKey =
      student && student.class_id && academicYearId
        ? `${student.class_id}::${academicYearId}::${normalizeImportKey(row.mapped.fee_category_name)}`
        : null
    const feeStructure = structureKey ? context.feeStructureByLookup.get(structureKey) : null

    if (!student) {
      pushError(
        errors,
        row.rowNumber,
        'student_admission_number',
        row.mapped.student_admission_number,
        'Student could not be found'
      )
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      pushError(
        errors,
        row.rowNumber,
        'amount_paid',
        row.mapped.amount_paid,
        'Amount paid must be greater than 0'
      )
    }

    if (!paymentDate) {
      pushError(
        errors,
        row.rowNumber,
        'payment_date',
        row.mapped.payment_date,
        'Invalid payment date'
      )
    }

    if (!paymentMode) {
      pushError(
        errors,
        row.rowNumber,
        'payment_mode',
        row.mapped.payment_mode,
        'Payment mode is invalid'
      )
    }

    if (!feeStructure) {
      pushError(
        errors,
        row.rowNumber,
        'fee_category_name',
        row.mapped.fee_category_name,
        'Fee structure could not be matched for the student class and academic year'
      )
    }

    if (!receiptKey) {
      pushError(
        errors,
        row.rowNumber,
        'receipt_number',
        row.mapped.receipt_number,
        'Receipt number is required'
      )
    } else if (context.existingReceiptNumbers.has(receiptKey)) {
      pushError(
        errors,
        row.rowNumber,
        'receipt_number',
        row.mapped.receipt_number,
        'Receipt number already exists'
      )
    } else if (seenReceipts.has(receiptKey)) {
      pushError(
        errors,
        row.rowNumber,
        'receipt_number',
        row.mapped.receipt_number,
        'Duplicate receipt number in upload'
      )
    } else {
      seenReceipts.add(receiptKey)
    }

    if (errors.some((error) => error.row_number === row.rowNumber)) {
      continue
    }

    preparedRows.push({
      row_number: row.rowNumber,
      raw: row.raw,
      data: {
        student_id: student?.id,
        fee_structure_id: feeStructure?.id,
        amount_paid: amount,
        payment_date: paymentDate,
        payment_mode: paymentMode,
        receipt_number: row.mapped.receipt_number,
        reference_number: row.mapped.reference_number || null,
        remarks: row.mapped.remarks || null,
      },
    })
  }

  return preparedRows
}

export async function validateImportData(
  input: ValidateImportDataInput
): Promise<{ summary: ImportValidationSummary; preparedRows: PreparedImportRow[] }> {
  if (!isImportType(input.importType)) {
    throw new Error('Unsupported import type')
  }

  const columnMapping =
    Object.keys(input.columnMapping).length > 0
      ? input.columnMapping
      : suggestColumnMapping(
          input.importType,
          input.rows.length > 0 ? Object.keys(input.rows[0]) : []
        )

  const missingRequiredFields = getMissingRequiredFields(input.importType, columnMapping)
  const context = await loadValidationContext(input.schoolId)
  const errors: ImportValidationError[] = []
  const mappedRows = mapRowsWithMapping(input.importType, input.rows, columnMapping)
  let preparedRows: PreparedImportRow[] = []

  for (const row of mappedRows) {
    const definition = getImportDefinition(input.importType)
    for (const field of definition.fields) {
      if (field.required && !row.mapped[field.key]) {
        pushError(
          errors,
          row.rowNumber,
          field.key,
          row.mapped[field.key],
          `${field.label} is required`
        )
      }
    }
  }

  if (missingRequiredFields.length === 0) {
    if (input.importType === 'students') {
      preparedRows = validateStudents(mappedRows, context, errors)
    } else if (input.importType === 'staff') {
      preparedRows = validateStaff(mappedRows, context, errors)
    } else if (input.importType === 'parents') {
      preparedRows = validateParents(mappedRows, context, errors)
    } else if (input.importType === 'student_parents') {
      preparedRows = validateStudentParents(mappedRows, context, errors)
    } else if (input.importType === 'fee_payments') {
      preparedRows = validateFeePayments(mappedRows, context, errors)
    }
  }

  const invalidRowNumbers = new Set(errors.map((error) => error.row_number))
  const preview = makePreviewRows(
    preparedRows.filter((row) => !invalidRowNumbers.has(row.row_number))
  )

  const summary: ImportValidationSummary = {
    total_rows: input.rows.length,
    valid_rows: preparedRows.length,
    error_rows: new Set(errors.map((error) => error.row_number)).size,
    errors,
    preview,
    warnings: [],
    missing_required_fields: missingRequiredFields,
  }

  return {
    summary,
    preparedRows,
  }
}
