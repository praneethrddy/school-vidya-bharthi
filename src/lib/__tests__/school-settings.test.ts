import { describe, expect, it } from 'vitest'
import {
  buildDefaultTerms,
  copyClassesSchema,
  createAcademicYearSchema,
  createClassSchema,
  createTermSchema,
  executePromotionSchema,
  filterPrincipalOnlyPermissionIds,
  findRetainTargetClass,
  generalSettingsPatchSchema,
  isDateRangeValid,
  normalizeNullableText,
  parseDateOnly,
  parseWorkingDays,
  rangesOverlap,
  schoolProfilePatchSchema,
  updateClassSchema,
  validateSettingValue,
} from '@/lib/school-settings'

const UUID_1 = '11111111-1111-1111-1111-111111111111'
const UUID_2 = '22222222-2222-2222-2222-222222222222'

describe('school-settings schemas', () => {
  it('TEST-SS-001: createAcademicYearSchema validation', () => {
    expect(
      createAcademicYearSchema.safeParse({
        name: '2026-2027',
        start_date: '2026-06-01',
        end_date: '2027-03-31',
      }).success
    ).toBe(true)

    expect(
      createAcademicYearSchema.safeParse({
        name: '',
        start_date: '2026-06-01',
        end_date: '2027-03-31',
      }).success
    ).toBe(false)
  })

  it('TEST-SS-002: createTermSchema validation', () => {
    expect(
      createTermSchema.safeParse({
        name: 'Term 1',
        start_date: '2026-06-01',
        end_date: '2026-08-31',
      }).success
    ).toBe(true)

    expect(
      createTermSchema.safeParse({
        name: '',
        start_date: '2026-06-01',
        end_date: '2026-08-31',
      }).success
    ).toBe(false)
  })

  it('TEST-SS-003: createClassSchema validation with default max_students', () => {
    const parsed = createClassSchema.safeParse({
      academic_year_id: UUID_1,
      name: 'Grade 6',
    })

    expect(parsed.success).toBe(true)
    expect(parsed.success && parsed.data.max_students).toBe(40)
  })

  it('TEST-SS-004: copyClassesSchema validation', () => {
    expect(
      copyClassesSchema.safeParse({
        academic_year_id: UUID_1,
        copy_from_academic_year_id: UUID_2,
      }).success
    ).toBe(true)

    expect(
      copyClassesSchema.safeParse({
        academic_year_id: 'bad-id',
        copy_from_academic_year_id: UUID_2,
      }).success
    ).toBe(false)
  })

  it('TEST-SS-005: updateClassSchema requires at least one field', () => {
    expect(updateClassSchema.safeParse({}).success).toBe(false)
    expect(updateClassSchema.safeParse({ name: 'Grade 7' }).success).toBe(true)
  })

  it('TEST-SS-006: executePromotionSchema validation', () => {
    expect(
      executePromotionSchema.safeParse({
        from_academic_year_id: UUID_1,
        to_academic_year_id: UUID_2,
        promotions: [{ student_id: UUID_1, action: 'PROMOTE', target_class_id: UUID_2 }],
      }).success
    ).toBe(true)

    expect(
      executePromotionSchema.safeParse({
        from_academic_year_id: UUID_1,
        to_academic_year_id: UUID_2,
        promotions: [],
      }).success
    ).toBe(false)
  })

  it('TEST-SS-007: schoolProfilePatchSchema hex color validation', () => {
    expect(
      schoolProfilePatchSchema.safeParse({
        name: 'VBHS',
        brand_primary: '#1d4ed8',
        brand_accent: '#f59e0b',
      }).success
    ).toBe(true)

    expect(
      schoolProfilePatchSchema.safeParse({
        name: 'VBHS',
        brand_primary: 'blue',
      }).success
    ).toBe(false)
  })

  it('TEST-SS-008: generalSettingsPatchSchema requires at least one setting', () => {
    expect(
      generalSettingsPatchSchema.safeParse({
        settings: [{ setting_key: 'grading_scheme', setting_value: 'GRADE' }],
      }).success
    ).toBe(true)

    expect(generalSettingsPatchSchema.safeParse({ settings: [] }).success).toBe(false)
  })
})

describe('school-settings utilities', () => {
  it('TEST-SS-009: normalizeNullableText handles undefined/null/empty/valid', () => {
    expect(normalizeNullableText(undefined)).toBeUndefined()
    expect(normalizeNullableText(null)).toBeNull()
    expect(normalizeNullableText('')).toBeNull()
    expect(normalizeNullableText('   ')).toBeNull()
    expect(normalizeNullableText('  Room 12 ')).toBe('Room 12')
  })

  it('TEST-SS-010: parseDateOnly validates strict YYYY-MM-DD', () => {
    expect(parseDateOnly('2026-06-01')?.toISOString().slice(0, 10)).toBe('2026-06-01')
    expect(parseDateOnly('2026-02-30')).toBeNull()
    expect(parseDateOnly('06-01-2026')).toBeNull()
  })

  it('TEST-SS-011: isDateRangeValid checks start before end', () => {
    const start = new Date('2026-06-01T00:00:00.000Z')
    const end = new Date('2027-03-31T00:00:00.000Z')
    const sameDay = new Date('2026-06-01T00:00:00.000Z')

    expect(isDateRangeValid(start, end)).toBe(true)
    expect(isDateRangeValid(start, sameDay)).toBe(false)
  })

  it('TEST-SS-012: rangesOverlap detects overlap and non-overlap', () => {
    const aStart = new Date('2026-06-01T00:00:00.000Z')
    const aEnd = new Date('2026-09-01T00:00:00.000Z')
    const bStart = new Date('2026-08-15T00:00:00.000Z')
    const bEnd = new Date('2026-12-01T00:00:00.000Z')
    const cStart = new Date('2026-09-02T00:00:00.000Z')
    const cEnd = new Date('2026-11-01T00:00:00.000Z')

    expect(rangesOverlap(aStart, aEnd, bStart, bEnd)).toBe(true)
    expect(rangesOverlap(aStart, aEnd, cStart, cEnd)).toBe(false)
  })

  it('TEST-SS-013: parseWorkingDays converts comma-separated values', () => {
    expect(parseWorkingDays(' MON, tue ,WED ')).toEqual(['MON', 'TUE', 'WED'])
  })

  it('TEST-SS-014: buildDefaultTerms creates 3 terms spanning full range', () => {
    const start = new Date('2026-06-01T00:00:00.000Z')
    const end = new Date('2027-03-31T00:00:00.000Z')
    const terms = buildDefaultTerms(start, end)

    expect(terms).toHaveLength(3)
    expect(terms[0].name).toBe('Term 1')
    expect(terms[0].start_date.toISOString()).toBe(start.toISOString())
    expect(terms[2].end_date.toISOString()).toBe(end.toISOString())
  })

  it('TEST-SS-015: findRetainTargetClass matches name + section case-insensitively', () => {
    const retained = findRetainTargetClass(
      { name: 'Grade 7', section: ' a ' },
      [
        { id: 'class-1', name: 'Grade 7', section: 'B' },
        { id: 'class-2', name: ' grade 7 ', section: 'A' },
      ]
    )

    expect(retained?.id).toBe('class-2')
    expect(
      findRetainTargetClass(
        { name: 'Grade 8', section: 'A' },
        [{ id: 'class-3', name: 'Grade 9', section: 'A' }]
      )
    ).toBeNull()
  })

  it('TEST-SS-016: filterPrincipalOnlyPermissionIds separates allowed and blocked', () => {
    const result = filterPrincipalOnlyPermissionIds(
      ['perm-1', 'perm-2', 'perm-3'],
      [
        { id: 'perm-1', is_principal_only: false },
        { id: 'perm-2', is_principal_only: true },
        { id: 'perm-3', is_principal_only: false },
      ]
    )

    expect(result.allowed).toEqual(['perm-1', 'perm-3'])
    expect(result.blocked).toEqual(['perm-2'])
  })

  it('general setting value validators enforce all key-specific rules', () => {
    expect(validateSettingValue('working_days', 'MON,TUE,SAT')).toBeNull()
    expect(validateSettingValue('working_days', 'MON,SUN')).toContain('Invalid working_days')

    expect(validateSettingValue('grading_scheme', 'GPA')).toBeNull()
    expect(validateSettingValue('grading_scheme', 'INVALID')).toContain(
      'grading_scheme must be one of'
    )

    expect(validateSettingValue('receipt_prefix', 'VBHS')).toBeNull()
    expect(validateSettingValue('receipt_prefix', 'ABCDEFGHIJKLMNOPQRSTUVWXYZ')).toContain(
      '20 characters or less'
    )

    expect(validateSettingValue('academic_start_month', '6')).toBeNull()
    expect(validateSettingValue('academic_start_month', '13')).toContain(
      'between 1 and 12'
    )

    expect(validateSettingValue('attendance_type', 'DAILY')).toBeNull()
    expect(validateSettingValue('attendance_type', 'WEEKLY')).toContain('must be DAILY')
  })
})
