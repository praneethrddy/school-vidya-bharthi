import { AdmissionStatus, Gender, Prisma, type AuditLog } from '@prisma/client'
import { NextRequest } from 'next/server'
import { z } from 'zod'

const optionalText = (maxLength: number) =>
  z.preprocess(
    (value) => {
      if (value === undefined || value === null) {
        return undefined
      }
      if (typeof value === 'string') {
        const trimmed = value.trim()
        return trimmed.length > 0 ? trimmed : undefined
      }
      return value
    },
    z.string().max(maxLength).optional()
  )

const optionalNullableText = (maxLength: number) =>
  z.preprocess(
    (value) => {
      if (value === undefined) {
        return undefined
      }
      if (value === null) {
        return null
      }
      if (typeof value === 'string') {
        const trimmed = value.trim()
        return trimmed.length > 0 ? trimmed : null
      }
      return value
    },
    z.string().max(maxLength).nullable().optional()
  )

const requiredDate = z.coerce.date().refine((value) => !Number.isNaN(value.getTime()), {
  message: 'Invalid date value',
})

const optionalDate = z.preprocess(
  (value) => {
    if (value === null || value === undefined || value === '') {
      return undefined
    }
    return value
  },
  z.coerce.date().refine((value) => !Number.isNaN(value.getTime()), {
    message: 'Invalid date value',
  }).optional()
)

export const admissionListQuerySchema = z.object({
  status: z.nativeEnum(AdmissionStatus).optional(),
  academic_year_id: z.string().uuid().optional(),
  applying_for_class: optionalText(50),
  search: optionalText(120),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort_by: z
    .enum(['applicant_name', 'date_of_birth', 'applying_for_class', 'parent_name', 'parent_phone', 'status', 'applied_at'])
    .default('applied_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
})

export const createAdmissionSchema = z.object({
  applicant_name: z.string().trim().min(1, 'Applicant name is required').max(200),
  date_of_birth: requiredDate,
  gender: z.nativeEnum(Gender),
  applying_for_class: z.string().trim().min(1, 'Applying class is required').max(50),
  parent_name: z.string().trim().min(1, 'Parent name is required').max(200),
  parent_phone: z.string().trim().min(6, 'Parent phone is required').max(20),
  parent_email: z.string().trim().email('Invalid parent email').optional().nullable(),
  address: optionalNullableText(2000),
  previous_school: optionalNullableText(255),
  remarks: optionalNullableText(2000),
  documents_url: z.array(z.string().url()).max(20).optional(),
})

export const updateAdmissionSchema = z
  .object({
    applicant_name: optionalText(200),
    date_of_birth: optionalDate,
    gender: z.nativeEnum(Gender).optional(),
    applying_for_class: optionalText(50),
    parent_name: optionalText(200),
    parent_phone: optionalText(20),
    parent_email: z.string().trim().email('Invalid parent email').optional().nullable(),
    address: optionalNullableText(2000),
    previous_school: optionalNullableText(255),
    remarks: optionalNullableText(2000),
    documents_url: z.array(z.string().url()).max(50).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update',
  })

export const updateAdmissionStatusSchema = z.object({
  status: z.nativeEnum(AdmissionStatus),
  remarks: optionalNullableText(2000),
})

export const admissionStatuses: AdmissionStatus[] = [
  AdmissionStatus.APPLIED,
  AdmissionStatus.SHORTLISTED,
  AdmissionStatus.TESTING,
  AdmissionStatus.ADMITTED,
  AdmissionStatus.REJECTED,
  AdmissionStatus.WAITLIST,
]

export const transitionMap: Record<AdmissionStatus, AdmissionStatus[]> = {
  [AdmissionStatus.APPLIED]: [AdmissionStatus.SHORTLISTED],
  [AdmissionStatus.SHORTLISTED]: [AdmissionStatus.TESTING],
  [AdmissionStatus.TESTING]: [AdmissionStatus.ADMITTED, AdmissionStatus.REJECTED, AdmissionStatus.WAITLIST],
  [AdmissionStatus.WAITLIST]: [AdmissionStatus.ADMITTED, AdmissionStatus.REJECTED],
  [AdmissionStatus.ADMITTED]: [],
  [AdmissionStatus.REJECTED]: [],
}

export interface StatusTransitionRule {
  permission: string
  principalOnly: boolean
  setsDecision: boolean
}

export function getStatusTransitionRule(
  fromStatus: AdmissionStatus,
  toStatus: AdmissionStatus
): StatusTransitionRule | null {
  if (fromStatus === AdmissionStatus.APPLIED && toStatus === AdmissionStatus.SHORTLISTED) {
    return {
      permission: 'ADMISSIONS.shortlist',
      principalOnly: false,
      setsDecision: false,
    }
  }

  if (fromStatus === AdmissionStatus.SHORTLISTED && toStatus === AdmissionStatus.TESTING) {
    return {
      permission: 'ADMISSIONS.schedule_test',
      principalOnly: false,
      setsDecision: false,
    }
  }

  if (fromStatus === AdmissionStatus.TESTING && toStatus === AdmissionStatus.WAITLIST) {
    return {
      permission: 'ADMISSIONS.process',
      principalOnly: false,
      setsDecision: false,
    }
  }

  if (
    (fromStatus === AdmissionStatus.TESTING || fromStatus === AdmissionStatus.WAITLIST) &&
    toStatus === AdmissionStatus.ADMITTED
  ) {
    return {
      permission: 'ADMISSIONS.admit',
      principalOnly: true,
      setsDecision: true,
    }
  }

  if (
    (fromStatus === AdmissionStatus.TESTING || fromStatus === AdmissionStatus.WAITLIST) &&
    toStatus === AdmissionStatus.REJECTED
  ) {
    return {
      permission: 'ADMISSIONS.reject',
      principalOnly: true,
      setsDecision: true,
    }
  }

  return null
}

export function isPrincipalRole(role: string): boolean {
  return role === 'PRINCIPAL' || role === 'SUPER_ADMIN'
}

export function validateAdmissionTransition(
  fromStatus: AdmissionStatus,
  toStatus: AdmissionStatus
): { valid: boolean; error?: string } {
  if (fromStatus === toStatus) {
    return {
      valid: false,
      error: `Cannot change from ${fromStatus} to ${toStatus}`,
    }
  }

  const allowed = transitionMap[fromStatus] || []
  if (!allowed.includes(toStatus)) {
    return {
      valid: false,
      error: `Cannot change from ${fromStatus} to ${toStatus}`,
    }
  }

  return { valid: true }
}

export function parseAdmissionListQuery(searchParams: URLSearchParams) {
  return admissionListQuerySchema.safeParse({
    status: searchParams.get('status') ?? undefined,
    academic_year_id: searchParams.get('academic_year_id') ?? undefined,
    applying_for_class: searchParams.get('applying_for_class') ?? undefined,
    search: searchParams.get('search') ?? undefined,
    page: searchParams.get('page') ?? undefined,
    limit: searchParams.get('limit') ?? undefined,
    sort_by: searchParams.get('sort_by') ?? undefined,
    sort_order: searchParams.get('sort_order') ?? undefined,
  })
}

export function admissionOrderBy(
  sortBy: z.infer<typeof admissionListQuerySchema>['sort_by'],
  sortOrder: Prisma.SortOrder
): Prisma.AdmissionOrderByWithRelationInput[] {
  if (sortBy === 'applicant_name') {
    return [{ applicant_name: sortOrder }, { applied_at: 'desc' }]
  }

  if (sortBy === 'date_of_birth') {
    return [{ date_of_birth: sortOrder }, { applicant_name: 'asc' }]
  }

  if (sortBy === 'applying_for_class') {
    return [{ applying_for_class: sortOrder }, { applicant_name: 'asc' }]
  }

  if (sortBy === 'parent_name') {
    return [{ parent_name: sortOrder }, { applicant_name: 'asc' }]
  }

  if (sortBy === 'parent_phone') {
    return [{ parent_phone: sortOrder }, { applicant_name: 'asc' }]
  }

  if (sortBy === 'status') {
    return [{ status: sortOrder }, { applied_at: 'desc' }]
  }

  return [{ applied_at: sortOrder }, { applicant_name: 'asc' }]
}

export function getRequestMetadata(request: NextRequest): {
  ip_address?: string
  user_agent?: string
} {
  const forwardedFor = request.headers.get('x-forwarded-for')
  const ip = forwardedFor?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || undefined

  return {
    ip_address: ip,
    user_agent: request.headers.get('user-agent') || undefined,
  }
}

export function splitName(fullName: string): { first_name: string; last_name: string } {
  const normalized = fullName.trim().replace(/\s+/g, ' ')
  if (!normalized) {
    return { first_name: 'Unknown', last_name: 'Applicant' }
  }

  const parts = normalized.split(' ')
  if (parts.length === 1) {
    return { first_name: parts[0], last_name: 'Applicant' }
  }

  return {
    first_name: parts[0],
    last_name: parts.slice(1).join(' '),
  }
}

export function generateAdmissionNumber(date = new Date()): string {
  const year = date.getUTCFullYear()
  const suffix = `${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 90 + 10)}`
  return `ADM-${year}-${suffix}`
}

export interface AdmissionConversionSource {
  id: string
  applicant_name: string
  date_of_birth: Date
  gender: Gender
  parent_name: string
  parent_phone: string
  parent_email: string | null
  address: string | null
}

export function mapAdmissionToStudentPayload(params: {
  admission: AdmissionConversionSource
  schoolId: string
  classId: string
  academicYearId: string
  admissionNumber: string
}) {
  const applicantName = splitName(params.admission.applicant_name)
  const parentName = splitName(params.admission.parent_name)

  return {
    student: {
      school_id: params.schoolId,
      admission_number: params.admissionNumber,
      first_name: applicantName.first_name,
      last_name: applicantName.last_name,
      gender: params.admission.gender,
      date_of_birth: params.admission.date_of_birth,
      address: params.admission.address,
      class_id: params.classId,
      academic_year_id: params.academicYearId,
      admission_date: new Date(),
      is_active: true,
    },
    parent: {
      school_id: params.schoolId,
      first_name: parentName.first_name,
      last_name: parentName.last_name,
      relation: null,
      phone: params.admission.parent_phone,
      email: params.admission.parent_email,
      address: params.admission.address,
    },
  }
}

export interface AdmissionHistoryEntry {
  id: string
  from_status: AdmissionStatus | null
  to_status: AdmissionStatus | null
  actor_id: string
  created_at: string
  remarks: string | null
}

function parseStatus(value: unknown): AdmissionStatus | null {
  if (typeof value !== 'string') {
    return null
  }

  return admissionStatuses.includes(value as AdmissionStatus) ? (value as AdmissionStatus) : null
}

type AuditLogTimelineSource = Pick<
  AuditLog,
  'id' | 'user_id' | 'old_value' | 'new_value' | 'created_at'
>

export function buildAdmissionTimeline(logs: AuditLogTimelineSource[]): AdmissionHistoryEntry[] {
  const timeline: AdmissionHistoryEntry[] = []

  logs.forEach((log) => {
    const oldValue = (log.old_value || {}) as Record<string, unknown>
    const newValue = (log.new_value || {}) as Record<string, unknown>
    const fromStatus = parseStatus(oldValue.status)
    const toStatus = parseStatus(newValue.status)

    if (!toStatus) {
      return
    }

    timeline.push({
      id: log.id,
      from_status: fromStatus,
      to_status: toStatus,
      actor_id: log.user_id,
      created_at: log.created_at.toISOString(),
      remarks: typeof newValue.remarks === 'string' ? newValue.remarks : null,
    })
  })

  return timeline
}

export function admissionStatusBadgeVariant(status: AdmissionStatus):
  | 'default'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'destructive'
  | 'outline' {
  if (status === AdmissionStatus.APPLIED) return 'secondary'
  if (status === AdmissionStatus.SHORTLISTED) return 'default'
  if (status === AdmissionStatus.TESTING) return 'warning'
  if (status === AdmissionStatus.ADMITTED) return 'success'
  if (status === AdmissionStatus.REJECTED) return 'destructive'
  return 'outline'
}
