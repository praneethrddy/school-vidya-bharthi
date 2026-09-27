import { AdmissionStatus } from '@prisma/client'
import { describe, expect, it } from 'vitest'
import {
  admissionOrderBy,
  admissionStatusBadgeVariant,
  buildAdmissionTimeline,
  getStatusTransitionRule,
  isPrincipalRole,
  mapAdmissionToStudentPayload,
  parseAdmissionListQuery,
  splitName,
  validateAdmissionTransition,
} from '../admissions'

describe('admissions library', () => {
  it('validates status transitions according to workflow', () => {
    expect(validateAdmissionTransition(AdmissionStatus.APPLIED, AdmissionStatus.SHORTLISTED)).toEqual({
      valid: true,
    })

    expect(validateAdmissionTransition(AdmissionStatus.APPLIED, AdmissionStatus.ADMITTED)).toEqual({
      valid: false,
      error: 'Cannot change from APPLIED to ADMITTED',
    })

    expect(validateAdmissionTransition(AdmissionStatus.TESTING, AdmissionStatus.TESTING)).toEqual({
      valid: false,
      error: 'Cannot change from TESTING to TESTING',
    })
  })

  it('returns correct permission rules per transition', () => {
    expect(getStatusTransitionRule(AdmissionStatus.APPLIED, AdmissionStatus.SHORTLISTED)).toEqual({
      permission: 'ADMISSIONS.shortlist',
      principalOnly: false,
      setsDecision: false,
    })

    expect(getStatusTransitionRule(AdmissionStatus.TESTING, AdmissionStatus.ADMITTED)).toEqual({
      permission: 'ADMISSIONS.admit',
      principalOnly: true,
      setsDecision: true,
    })

    expect(getStatusTransitionRule(AdmissionStatus.SHORTLISTED, AdmissionStatus.ADMITTED)).toBeNull()
  })

  it('detects principal-only roles used in final decisions', () => {
    expect(isPrincipalRole('PRINCIPAL')).toBe(true)
    expect(isPrincipalRole('SUPER_ADMIN')).toBe(true)
    expect(isPrincipalRole('STUDENT_ADMIN')).toBe(false)
  })

  it('maps admission payload to student and parent conversion payload', () => {
    const mapped = mapAdmissionToStudentPayload({
      admission: {
        id: 'admission-1',
        applicant_name: 'Aarav Sharma',
        date_of_birth: new Date('2014-06-10'),
        gender: 'MALE',
        parent_name: 'Rohit Sharma',
        parent_phone: '9999999999',
        parent_email: 'rohit@example.com',
        address: 'Hyderabad',
      },
      schoolId: 'school-1',
      classId: 'class-1',
      academicYearId: 'year-1',
      admissionNumber: 'ADM-2026-000001',
    })

    expect(mapped.student).toMatchObject({
      school_id: 'school-1',
      admission_number: 'ADM-2026-000001',
      first_name: 'Aarav',
      last_name: 'Sharma',
      class_id: 'class-1',
      academic_year_id: 'year-1',
    })

    expect(mapped.parent).toMatchObject({
      school_id: 'school-1',
      first_name: 'Rohit',
      last_name: 'Sharma',
      phone: '9999999999',
      email: 'rohit@example.com',
    })
  })

  it('parses list query and applies defaults', () => {
    const result = parseAdmissionListQuery(new URLSearchParams('status=APPLIED&page=2&limit=10&sort_by=status'))

    expect(result.success).toBe(true)
    if (!result.success) {
      throw new Error('Expected successful query parsing')
    }

    expect(result.data).toMatchObject({
      status: AdmissionStatus.APPLIED,
      page: 2,
      limit: 10,
      sort_by: 'status',
      sort_order: 'desc',
    })
  })

  it('builds expected orderBy shape for sorting', () => {
    expect(admissionOrderBy('applicant_name', 'asc')).toEqual([
      { applicant_name: 'asc' },
      { applied_at: 'desc' },
    ])

    expect(admissionOrderBy('applied_at', 'desc')).toEqual([
      { applied_at: 'desc' },
      { applicant_name: 'asc' },
    ])
  })

  it('builds timeline entries only when new status is present', () => {
    const timeline = buildAdmissionTimeline([
      {
        id: 'log-1',
        user_id: 'actor-1',
        old_value: { status: 'APPLIED' },
        new_value: { status: 'SHORTLISTED', remarks: 'reviewed' },
        created_at: new Date('2026-04-10T09:00:00.000Z'),
      },
      {
        id: 'log-2',
        user_id: 'actor-2',
        old_value: { notes: 'no status' },
        new_value: { remarks: 'skip' },
        created_at: new Date('2026-04-10T10:00:00.000Z'),
      },
    ])

    expect(timeline).toHaveLength(1)
    expect(timeline[0]).toMatchObject({
      id: 'log-1',
      from_status: 'APPLIED',
      to_status: 'SHORTLISTED',
      remarks: 'reviewed',
    })
  })

  it('normalizes names and badge variants', () => {
    expect(splitName('  Aarav   Sharma  ')).toEqual({
      first_name: 'Aarav',
      last_name: 'Sharma',
    })
    expect(splitName('')).toEqual({
      first_name: 'Unknown',
      last_name: 'Applicant',
    })

    expect(admissionStatusBadgeVariant(AdmissionStatus.APPLIED)).toBe('secondary')
    expect(admissionStatusBadgeVariant(AdmissionStatus.ADMITTED)).toBe('success')
  })
})
