import { Gender, ParentRelation, type Prisma } from '@prisma/client'
import { NextRequest } from 'next/server'
import { z } from 'zod'

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
  z.coerce.date().refine((parsed) => !Number.isNaN(parsed.getTime()), {
    message: 'Invalid date value',
  }).optional()
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

export const parentCreateSchema = z.object({
  first_name: z.string().trim().min(1, 'Parent first name is required').max(100),
  last_name: z.string().trim().min(1, 'Parent last name is required').max(100),
  relation: z.nativeEnum(ParentRelation).optional().nullable(),
  phone: z.string().trim().min(6, 'Parent phone is required').max(20),
  alternate_phone: optionalNullableText(20),
  email: z.string().trim().email('Invalid parent email').optional().nullable(),
  occupation: optionalNullableText(100),
  address: optionalNullableText(2000),
  photo_url: optionalNullableText(2000),
})

export const parentLinkSchema = z
  .object({
    existing_parent_id: z.string().uuid().optional(),
    create_parent: parentCreateSchema.optional(),
    is_primary: z.boolean().optional(),
  })
  .superRefine((value, context) => {
    const hasExisting = Boolean(value.existing_parent_id)
    const hasCreate = Boolean(value.create_parent)

    if (hasExisting === hasCreate) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Provide either existing_parent_id or create_parent',
        path: ['existing_parent_id'],
      })
    }
  })

export const studentAccountSchema = z
  .object({
    create_user: z.boolean().default(false),
    email: z.string().trim().email('Invalid student email').optional(),
    password: z.string().min(8, 'Password must be at least 8 characters').max(72).optional(),
    auto_generate_password: z.boolean().default(true),
  })
  .superRefine((value, context) => {
    if (!value.create_user) {
      return
    }

    if (!value.email) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Email is required when create_user is true',
        path: ['email'],
      })
    }

    if (!value.auto_generate_password && !value.password) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Password is required when auto_generate_password is false',
        path: ['password'],
      })
    }
  })

const studentCoreSchema = z.object({
  admission_number: z.string().trim().min(1, 'Admission number is required').max(50),
  first_name: z.string().trim().min(1, 'First name is required').max(100),
  last_name: z.string().trim().min(1, 'Last name is required').max(100),
  gender: z.nativeEnum(Gender).optional().nullable(),
  date_of_birth: requiredDate,
  blood_group: optionalNullableText(5),
  phone: optionalNullableText(20),
  address: optionalNullableText(2000),
  emergency_contact_name: optionalNullableText(200),
  emergency_contact_phone: optionalNullableText(20),
  photo_url: optionalNullableText(2000),
  class_id: z.string().uuid('class_id must be a valid UUID'),
  academic_year_id: z.string().uuid().optional(),
  admission_date: optionalDate,
  roll_number: optionalNullableText(20),
  is_active: z.boolean().optional().default(true),
})

export const createStudentSchema = studentCoreSchema.extend({
  parent: parentLinkSchema.optional(),
  account: studentAccountSchema.optional(),
})

export const updateStudentSchema = z
  .object({
    admission_number: optionalText(50),
    first_name: optionalText(100),
    last_name: optionalText(100),
    gender: z.nativeEnum(Gender).optional().nullable(),
    date_of_birth: optionalDate,
    blood_group: optionalNullableText(5),
    phone: optionalNullableText(20),
    address: optionalNullableText(2000),
    emergency_contact_name: optionalNullableText(200),
    emergency_contact_phone: optionalNullableText(20),
    photo_url: optionalNullableText(2000),
    class_id: z.string().uuid().optional().nullable(),
    academic_year_id: z.string().uuid().optional().nullable(),
    admission_date: optionalDate,
    roll_number: optionalNullableText(20),
    is_active: z.boolean().optional(),
    parent_link: parentLinkSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update',
  })

export const assignClassSchema = z.object({
  class_id: z.string().uuid('class_id must be a valid UUID'),
  academic_year_id: z.string().uuid().optional(),
})

export const studentListQuerySchema = z.object({
  search: optionalText(120),
  parent_search: optionalText(120),
  class_id: z.string().uuid().optional(),
  gender: z.nativeEnum(Gender).optional(),
  is_active: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort_by: z.enum(['name', 'admission_number', 'class']).default('name'),
  sort_order: z.enum(['asc', 'desc']).default('asc'),
})

export type CreateStudentInput = z.infer<typeof createStudentSchema>
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>
export type AssignClassInput = z.infer<typeof assignClassSchema>
export type StudentListQuery = z.infer<typeof studentListQuerySchema>

export function parseStudentListQuery(searchParams: URLSearchParams) {
  return studentListQuerySchema.safeParse({
    search: searchParams.get('search') ?? undefined,
    parent_search: searchParams.get('parent_search') ?? undefined,
    class_id: searchParams.get('class_id') ?? undefined,
    gender: searchParams.get('gender') ?? undefined,
    is_active: searchParams.get('is_active') ?? undefined,
    page: searchParams.get('page') ?? undefined,
    limit: searchParams.get('limit') ?? undefined,
    sort_by: searchParams.get('sort_by') ?? undefined,
    sort_order: searchParams.get('sort_order') ?? undefined,
  })
}

export function getRequestMetadata(request: NextRequest): {
  ip_address?: string
  user_agent?: string
} {
  const forwardedFor = request.headers.get('x-forwarded-for')
  const ipFromForwardedHeader = forwardedFor?.split(',')[0]?.trim()

  return {
    ip_address: ipFromForwardedHeader || request.headers.get('x-real-ip') || undefined,
    user_agent: request.headers.get('user-agent') || undefined,
  }
}

export function mapStudentRow(student: {
  id: string
  admission_number: string
  first_name: string
  last_name: string
  class_id: string | null
  class: { name: string; section: string | null } | null
  gender: Gender | null
  is_active: boolean
  photo_url: string | null
}) {
  return {
    id: student.id,
    admission_number: student.admission_number,
    name: `${student.first_name} ${student.last_name}`.trim(),
    class_id: student.class_id,
    class: student.class?.name ?? null,
    section: student.class?.section ?? null,
    gender: student.gender,
    is_active: student.is_active,
    photo_url: student.photo_url,
  }
}

export function studentOrderBy(
  sortBy: StudentListQuery['sort_by'],
  sortOrder: Prisma.SortOrder
): Prisma.StudentOrderByWithRelationInput[] {
  if (sortBy === 'admission_number') {
    return [{ admission_number: sortOrder }]
  }

  if (sortBy === 'class') {
    return [{ class: { name: sortOrder } }, { class: { section: sortOrder } }, { first_name: 'asc' }]
  }

  return [{ first_name: sortOrder }, { last_name: sortOrder }]
}

export function isPrincipalRole(role: string): boolean {
  return role === 'PRINCIPAL' || role === 'SUPER_ADMIN'
}

