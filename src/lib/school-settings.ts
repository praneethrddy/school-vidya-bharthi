import { z } from 'zod'
import { CONFIGURABLE_ROLES, type ConfigurableRole } from '@/lib/permission-config'

export const GENERAL_SETTING_KEYS = [
  'working_days',
  'grading_scheme',
  'receipt_prefix',
  'academic_start_month',
  'attendance_type',
] as const

export type GeneralSettingKey = (typeof GENERAL_SETTING_KEYS)[number]

export const GRADING_SCHEMES = ['PERCENTAGE', 'GRADE', 'GPA'] as const
export const ATTENDANCE_TYPES = ['DAILY'] as const
export const WEEK_DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const

export const generalSettingsPatchSchema = z.object({
  settings: z
    .array(
      z.object({
        setting_key: z.enum(GENERAL_SETTING_KEYS),
        setting_value: z.string().min(1, 'setting_value is required'),
      })
    )
    .min(1, 'At least one setting must be provided'),
})

export const schoolProfilePatchSchema = z
  .object({
    name: z.string().trim().min(1).max(255).optional(),
    address: z.string().trim().max(2000).nullable().optional(),
    city: z.string().trim().max(100).nullable().optional(),
    state: z.string().trim().max(100).nullable().optional(),
    phone: z.string().trim().max(20).nullable().optional(),
    email: z.string().trim().email().max(255).nullable().optional(),
    website: z.string().trim().url().max(255).nullable().optional(),
    board: z.string().trim().max(100).nullable().optional(),
    logo_url: z.string().trim().url().nullable().optional(),
    brand_primary: z
      .string()
      .trim()
      .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'brand_primary must be a valid hex color')
      .optional(),
    brand_accent: z
      .string()
      .trim()
      .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'brand_accent must be a valid hex color')
      .optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update',
  })

export const createAcademicYearSchema = z.object({
  name: z.string().trim().min(1, 'Academic year name is required').max(50),
  start_date: z.string().trim().min(1, 'start_date is required'),
  end_date: z.string().trim().min(1, 'end_date is required'),
  terms: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(50),
        start_date: z.string().trim().min(1),
        end_date: z.string().trim().min(1),
      })
    )
    .optional(),
})

export const createTermSchema = z.object({
  name: z.string().trim().min(1, 'Term name is required').max(50),
  start_date: z.string().trim().min(1, 'start_date is required'),
  end_date: z.string().trim().min(1, 'end_date is required'),
})

export const createClassSchema = z.object({
  academic_year_id: z.string().uuid(),
  name: z.string().trim().min(1, 'Class name is required').max(50),
  section: z.string().trim().max(10).nullable().optional(),
  max_students: z.number().int().positive().max(500).default(40),
  room_number: z.string().trim().max(20).nullable().optional(),
  class_teacher_id: z.string().uuid().nullable().optional(),
})

export const copyClassesSchema = z.object({
  academic_year_id: z.string().uuid(),
  copy_from_academic_year_id: z.string().uuid(),
})

export const updateClassSchema = z
  .object({
    name: z.string().trim().min(1).max(50).optional(),
    section: z.string().trim().max(10).nullable().optional(),
    max_students: z.number().int().positive().max(500).optional(),
    room_number: z.string().trim().max(20).nullable().optional(),
    class_teacher_id: z.string().uuid().nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update',
  })

const promotionActionSchema = z.enum(['PROMOTE', 'RETAIN', 'TC'])

export const executePromotionSchema = z.object({
  from_academic_year_id: z.string().uuid(),
  to_academic_year_id: z.string().uuid(),
  promotions: z
    .array(
      z.object({
        student_id: z.string().uuid(),
        action: promotionActionSchema,
        target_class_id: z.string().uuid().optional(),
      })
    )
    .min(1, 'At least one student promotion must be provided'),
})

export const updateRolePermissionsSchema = z.object({
  role: z.enum(CONFIGURABLE_ROLES),
  permission_ids: z.array(z.string().uuid()),
})

export function normalizeNullableText(value: unknown): string | null | undefined {
  if (value === undefined) {
    return undefined
  }
  if (value === null) {
    return null
  }
  if (typeof value !== 'string') {
    return undefined
  }
  const trimmed = value.trim()
  return trimmed.length === 0 ? null : trimmed
}

export function parseDateOnly(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null
  }
  const parsed = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }
  if (parsed.toISOString().slice(0, 10) !== value) {
    return null
  }
  return parsed
}

export function isDateRangeValid(startDate: Date, endDate: Date): boolean {
  return startDate.getTime() < endDate.getTime()
}

export function rangesOverlap(
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date
): boolean {
  return startA <= endB && startB <= endA
}

export function parseWorkingDays(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean)
}

export function validateSettingValue(
  settingKey: GeneralSettingKey,
  settingValue: string
): string | null {
  const value = settingValue.trim()
  if (!value) {
    return 'setting_value is required'
  }

  if (settingKey === 'working_days') {
    const days = parseWorkingDays(value)
    if (days.length === 0) {
      return 'working_days must contain at least one day'
    }
    const invalidDays = days.filter((day) => !WEEK_DAYS.includes(day as (typeof WEEK_DAYS)[number]))
    if (invalidDays.length > 0) {
      return `Invalid working_days values: ${invalidDays.join(', ')}`
    }
    return null
  }

  if (settingKey === 'grading_scheme') {
    if (!GRADING_SCHEMES.includes(value as (typeof GRADING_SCHEMES)[number])) {
      return 'grading_scheme must be one of PERCENTAGE, GRADE, GPA'
    }
    return null
  }

  if (settingKey === 'academic_start_month') {
    const month = Number.parseInt(value, 10)
    if (!Number.isFinite(month) || month < 1 || month > 12) {
      return 'academic_start_month must be a number between 1 and 12'
    }
    return null
  }

  if (settingKey === 'attendance_type') {
    if (!ATTENDANCE_TYPES.includes(value as (typeof ATTENDANCE_TYPES)[number])) {
      return 'attendance_type must be DAILY'
    }
    return null
  }

  if (settingKey === 'receipt_prefix') {
    if (value.length > 20) {
      return 'receipt_prefix must be 20 characters or less'
    }
    return null
  }

  return null
}

export function buildDefaultTerms(startDate: Date, endDate: Date) {
  const dayMs = 24 * 60 * 60 * 1000
  const totalDays = Math.max(
    3,
    Math.floor((endDate.getTime() - startDate.getTime()) / dayMs) + 1
  )
  const termLength = Math.max(1, Math.floor(totalDays / 3))

  const termOneEnd = new Date(
    Math.min(
      endDate.getTime(),
      startDate.getTime() + (termLength - 1) * dayMs
    )
  )
  const termTwoStart = new Date(Math.min(endDate.getTime(), termOneEnd.getTime() + dayMs))
  const termTwoEnd = new Date(
    Math.min(endDate.getTime(), termTwoStart.getTime() + (termLength - 1) * dayMs)
  )
  const termThreeStart = new Date(
    Math.min(endDate.getTime(), termTwoEnd.getTime() + dayMs)
  )

  return [
    {
      name: 'Term 1',
      start_date: startDate,
      end_date: termOneEnd,
    },
    {
      name: 'Term 2',
      start_date: termTwoStart,
      end_date: termTwoEnd,
    },
    {
      name: 'Term 3',
      start_date: termThreeStart,
      end_date: endDate,
    },
  ]
}

type BasicClass = {
  id: string
  name: string
  section: string | null
}

function normalizeSection(section: string | null | undefined) {
  return section?.trim().toUpperCase() || ''
}

export function findRetainTargetClass(
  currentClass: Pick<BasicClass, 'name' | 'section'>,
  targetClasses: BasicClass[]
) {
  const sourceName = currentClass.name.trim().toUpperCase()
  const sourceSection = normalizeSection(currentClass.section)

  return (
    targetClasses.find((candidate) => {
      return (
        candidate.name.trim().toUpperCase() === sourceName &&
        normalizeSection(candidate.section) === sourceSection
      )
    }) || null
  )
}

export function filterPrincipalOnlyPermissionIds(
  requestedPermissionIds: string[],
  permissionRows: Array<{ id: string; is_principal_only: boolean }>
) {
  const permissionById = new Map(
    permissionRows.map((permission) => [permission.id, permission])
  )

  const allowed: string[] = []
  const blocked: string[] = []

  requestedPermissionIds.forEach((permissionId) => {
    const permission = permissionById.get(permissionId)
    if (permission?.is_principal_only) {
      blocked.push(permissionId)
      return
    }
    allowed.push(permissionId)
  })

  return {
    allowed,
    blocked,
  }
}

export const configurableRoles: ConfigurableRole[] = [...CONFIGURABLE_ROLES]
