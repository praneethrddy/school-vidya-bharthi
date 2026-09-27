import { z } from 'zod'
import type { Prisma } from '@prisma/client'

export const STAFF_ACCOUNT_ROLES = [
  'STAFF_ADMIN',
  'STUDENT_ADMIN',
  'ACCOUNTANT',
  'TEACHER',
] as const

export type StaffAccountRole = (typeof STAFF_ACCOUNT_ROLES)[number]

export const staffListQuerySchema = z.object({
  search: z.string().trim().optional().default(''),
  department: z.string().trim().optional(),
  designation: z.string().trim().optional(),
  is_active: z.enum(['true', 'false', 'all']).optional().default('true'),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  sort_by: z.enum(['created_at', 'first_name', 'employee_code', 'department']).optional().default('created_at'),
  sort_order: z.enum(['asc', 'desc']).optional().default('desc'),
})

export const createStaffSchema = z
  .object({
    employee_code: z.string().trim().min(1, 'Employee code is required'),
    first_name: z.string().trim().min(1, 'First name is required'),
    last_name: z.string().trim().min(1, 'Last name is required'),
    gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
    date_of_birth: z.string().optional(),
    phone: z.string().trim().optional(),
    address: z.string().trim().optional(),
    photo_url: z.string().trim().optional(),
    designation: z.string().trim().optional(),
    department: z.string().trim().optional(),
    date_of_joining: z.string().optional(),
    qualification: z.string().trim().optional(),
    create_account: z.boolean().optional().default(false),
    email: z.string().trim().email('Invalid email').optional().or(z.literal('')),
    role: z.enum(STAFF_ACCOUNT_ROLES).optional(),
    auto_generate_password: z.boolean().optional().default(false),
    password: z.string().min(8, 'Password must be at least 8 characters').optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.create_account) {
      return
    }

    if (!value.email) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['email'],
        message: 'Email is required when creating an account',
      })
    }

    if (!value.role) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['role'],
        message: 'Role is required when creating an account',
      })
    }

    if (!value.auto_generate_password && !value.password) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['password'],
        message: 'Password is required when auto generation is disabled',
      })
    }
  })

export const updateStaffSchema = z.object({
  employee_code: z.string().trim().min(1).optional(),
  first_name: z.string().trim().min(1).optional(),
  last_name: z.string().trim().min(1).optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).nullable().optional(),
  date_of_birth: z.string().nullable().optional(),
  phone: z.string().trim().nullable().optional(),
  address: z.string().trim().nullable().optional(),
  photo_url: z.string().trim().nullable().optional(),
  designation: z.string().trim().nullable().optional(),
  department: z.string().trim().nullable().optional(),
  date_of_joining: z.string().nullable().optional(),
  qualification: z.string().trim().nullable().optional(),
  is_active: z.boolean().optional(),
})

export const classTeacherSchema = z.object({
  class_id: z.string().uuid().nullable(),
})

export const createStaffAccountSchema = z
  .object({
    email: z.string().trim().email('Invalid email'),
    role: z.enum(STAFF_ACCOUNT_ROLES),
    auto_generate_password: z.boolean().optional().default(true),
    password: z.string().min(8, 'Password must be at least 8 characters').optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.auto_generate_password && !value.password) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['password'],
        message: 'Password is required when auto generation is disabled',
      })
    }
  })

export const resetStaffAccountPasswordSchema = z
  .object({
    auto_generate_password: z.boolean().optional().default(true),
    password: z.string().min(8, 'Password must be at least 8 characters').optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.auto_generate_password && !value.password) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['password'],
        message: 'Password is required when auto generation is disabled',
      })
    }
  })

export const removeAssignmentSchema = z.object({
  assignment_id: z.string().uuid(),
})

export const addAssignmentSchema = z.object({
  subject_id: z.string().uuid(),
  academic_year_id: z.string().uuid(),
})

export type StaffListQuery = z.infer<typeof staffListQuerySchema>

export function parseStaffListQuery(params: URLSearchParams) {
  return staffListQuerySchema.safeParse({
    search: params.get('search') ?? undefined,
    department: params.get('department') ?? undefined,
    designation: params.get('designation') ?? undefined,
    is_active: params.get('is_active') ?? undefined,
    page: params.get('page') ?? undefined,
    limit: params.get('limit') ?? undefined,
    sort_by: params.get('sort_by') ?? undefined,
    sort_order: params.get('sort_order') ?? undefined,
  })
}

export function buildStaffWhereInput(
  schoolId: string,
  query: StaffListQuery
): Prisma.StaffWhereInput {
  const where: Prisma.StaffWhereInput = {
    school_id: schoolId,
  }

  if (query.search) {
    where.OR = [
      { first_name: { contains: query.search, mode: 'insensitive' } },
      { last_name: { contains: query.search, mode: 'insensitive' } },
      { employee_code: { contains: query.search, mode: 'insensitive' } },
      {
        AND: [
          { first_name: { contains: query.search, mode: 'insensitive' } },
          { last_name: { contains: query.search, mode: 'insensitive' } },
        ],
      },
    ]
  }

  if (query.department) {
    where.department = query.department
  }

  if (query.designation) {
    where.designation = query.designation
  }

  if (query.is_active !== 'all') {
    where.is_active = query.is_active === 'true'
  }

  return where
}

export function buildStaffOrderBy(
  sortBy: StaffListQuery['sort_by'],
  sortOrder: StaffListQuery['sort_order']
): Prisma.StaffOrderByWithRelationInput[] {
  if (sortBy === 'first_name') {
    return [{ first_name: sortOrder }, { last_name: sortOrder }]
  }

  if (sortBy === 'employee_code') {
    return [{ employee_code: sortOrder }, { first_name: 'asc' }]
  }

  if (sortBy === 'department') {
    return [{ department: sortOrder }, { first_name: 'asc' }]
  }

  return [{ created_at: sortOrder }]
}

export function sanitizeStaffAuditSnapshot(
  data: Record<string, unknown> | null | undefined
): Record<string, any> | undefined {
  if (!data) {
    return undefined
  }

  return {
    ...data,
    phone: data.phone ? '***' : data.phone,
    address: data.address ? '***' : data.address,
  }
}

export function calculateStaffWorkload(
  assignments: Array<{ subject: { periods_per_week: number | null } }>
) {
  return assignments.reduce((total, assignment) => {
    return total + (assignment.subject.periods_per_week ?? 0)
  }, 0)
}

export interface StaffFilterRecord {
  first_name: string
  last_name: string
  employee_code: string | null
  department: string | null
  designation: string | null
  is_active: boolean
}

export function applyStaffFilters(
  records: StaffFilterRecord[],
  options: {
    search?: string
    department?: string
    designation?: string
    isActiveOnly?: boolean
  }
) {
  const search = options.search?.trim().toLowerCase()

  return records.filter((record) => {
    if (options.isActiveOnly && !record.is_active) {
      return false
    }

    if (options.department && record.department !== options.department) {
      return false
    }

    if (options.designation && record.designation !== options.designation) {
      return false
    }

    if (!search) {
      return true
    }

    const fullName = `${record.first_name} ${record.last_name}`.toLowerCase()
    const code = (record.employee_code ?? '').toLowerCase()
    return fullName.includes(search) || code.includes(search)
  })
}

export function normalizeOptionalString(value: string | null | undefined) {
  if (value === undefined) {
    return undefined
  }

  if (value === null) {
    return null
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}
