import { describe, expect, it } from 'vitest'
import {
  buildTemplateCsv,
  escapeCsvValue,
  getImportDefinition,
  IMPORT_TYPES,
  isImportType,
  normalizeImportKey,
  suggestColumnMapping,
} from '@/lib/import-types'

describe('import-types helpers', () => {
  it('validates known import types and rejects unknown values (TEST-ITYPE-001)', () => {
    for (const importType of IMPORT_TYPES) {
      expect(isImportType(importType)).toBe(true)
    }
    expect(isImportType('teachers')).toBe(false)
  })

  it('returns the expected definition and fields (TEST-ITYPE-002)', () => {
    const definition = getImportDefinition('students')

    expect(definition.templateFileName).toBe('students-import-template.csv')
    expect(definition.fields.some((field) => field.key === 'admission_number')).toBe(true)
  })

  it('normalizes keys by lowercasing and removing symbols (TEST-ITYPE-003)', () => {
    expect(normalizeImportKey(' Admission Number ')).toBe('admissionnumber')
    expect(normalizeImportKey('Parent-Phone#1')).toBe('parentphone1')
  })

  it('suggests mapping from header aliases and labels (TEST-ITYPE-004)', () => {
    const mapping = suggestColumnMapping('students', [
      'Admission Number',
      'Student First Name',
      'Birth Date',
      'Grade',
      'Division',
    ])

    expect(mapping.admission_number).toBe('Admission Number')
    expect(mapping.first_name).toBe('Student First Name')
    expect(mapping.date_of_birth).toBe('Birth Date')
    expect(mapping.class_name).toBe('Grade')
    expect(mapping.section).toBe('Division')
  })

  it('builds template CSV with header and sample row (TEST-ITYPE-005)', () => {
    const template = buildTemplateCsv('fee_payments')
    const lines = template.trimEnd().split('\n')

    expect(lines).toHaveLength(2)
    expect(lines[0]).toContain('student_admission_number')
    expect(lines[0]).toContain('amount_paid')
    expect(lines[1]).toContain('2500')
  })

  it('escapes CSV values with quotes, commas, and newlines (TEST-ITYPE-006)', () => {
    expect(escapeCsvValue('Simple')).toBe('Simple')
    expect(escapeCsvValue('Hello, world')).toBe('"Hello, world"')
    expect(escapeCsvValue('A "quoted" value')).toBe('"A ""quoted"" value"')
    expect(escapeCsvValue('Line1\nLine2')).toBe('"Line1\nLine2"')
  })
})
