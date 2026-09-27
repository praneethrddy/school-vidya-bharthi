import { AdmissionStatus, Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import {
  errorResponse,
  forbiddenResponse,
  successResponse,
  unauthorizedResponse,
} from '@/lib/api-helpers'
import {
  admissionOrderBy,
  admissionStatuses,
  createAdmissionSchema,
  getRequestMetadata,
  parseAdmissionListQuery,
} from '@/lib/admissions'
import { auth } from '@/lib/auth'
import { createAuditLog } from '@/lib/audit'
import { hasPermission } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

interface SessionUser {
  id: string
  role: string
  schoolId: string | null
}

interface SchoolSessionUser extends SessionUser {
  schoolId: string
}

type PermissionCheckResult =
  | { error: NextResponse; user: null }
  | { error: null; user: SchoolSessionUser }

async function requirePermission(permissionCode: string): Promise<PermissionCheckResult> {
  const session = await auth()
  if (!session?.user) {
    return {
      error: unauthorizedResponse('No valid session'),
      user: null,
    }
  }

  const user = session.user as SessionUser
  if (!user.schoolId) {
    return {
      error: errorResponse('SCHOOL_REQUIRED', 'School context is missing for this account', 400),
      user: null,
    }
  }

  const allowed = await hasPermission(user.schoolId, user.role, permissionCode)
  if (!allowed) {
    return {
      error: forbiddenResponse(`Missing permission: ${permissionCode}`),
      user: null,
    }
  }

  return {
    error: null,
    user: { ...user, schoolId: user.schoolId },
  }
}

function initializeStatusCounts(): Record<AdmissionStatus, number> {
  return {
    APPLIED: 0,
    SHORTLISTED: 0,
    TESTING: 0,
    ADMITTED: 0,
    REJECTED: 0,
    WAITLIST: 0,
  }
}

export async function GET(request: NextRequest) {
  const permissionCheck = await requirePermission('ADMISSIONS.view')
  if (permissionCheck.error) {
    return permissionCheck.error
  }

  const user = permissionCheck.user
  const parsedQuery = parseAdmissionListQuery(request.nextUrl.searchParams)

  if (!parsedQuery.success) {
    return errorResponse(
      'VALIDATION_ERROR',
      parsedQuery.error.issues[0]?.message || 'Invalid query parameters',
      400
    )
  }

  const query = parsedQuery.data

  let academicYearId = query.academic_year_id
  if (!academicYearId) {
    const currentYear = await prisma.academicYear.findFirst({
      where: {
        school_id: user.schoolId,
        is_current: true,
      },
      select: {
        id: true,
      },
    })

    academicYearId = currentYear?.id
  }

  const baseWhere: Prisma.AdmissionWhereInput = {
    school_id: user.schoolId,
    ...(academicYearId ? { academic_year_id: academicYearId } : {}),
  }

  if (query.applying_for_class) {
    baseWhere.applying_for_class = {
      contains: query.applying_for_class,
      mode: 'insensitive',
    }
  }

  if (query.search) {
    baseWhere.OR = [
      {
        applicant_name: {
          contains: query.search,
          mode: 'insensitive',
        },
      },
      {
        parent_name: {
          contains: query.search,
          mode: 'insensitive',
        },
      },
      {
        parent_phone: {
          contains: query.search,
          mode: 'insensitive',
        },
      },
    ]
  }

  const where: Prisma.AdmissionWhereInput = {
    ...baseWhere,
    ...(query.status ? { status: query.status } : {}),
  }

  const skip = (query.page - 1) * query.limit

  const [total, admissions, groupedCounts, academicYears, classes] = await prisma.$transaction([
    prisma.admission.count({ where }),
    prisma.admission.findMany({
      where,
      include: {
        processor: {
          select: {
            id: true,
            email: true,
          },
        },
        decider: {
          select: {
            id: true,
            email: true,
          },
        },
      },
      orderBy: admissionOrderBy(query.sort_by, query.sort_order),
      skip,
      take: query.limit,
    }),
    prisma.admission.groupBy({
      by: ['status'],
      where: baseWhere,
      orderBy: {
        status: 'asc',
      },
      _count: {
        _all: true,
      },
    }),
    prisma.academicYear.findMany({
      where: {
        school_id: user.schoolId,
      },
      select: {
        id: true,
        name: true,
        is_current: true,
      },
      orderBy: [{ start_date: 'desc' }],
    }),
    prisma.class.findMany({
      where: {
        school_id: user.schoolId,
        ...(academicYearId ? { academic_year_id: academicYearId } : {}),
      },
      select: {
        id: true,
        name: true,
        section: true,
      },
      orderBy: [{ name: 'asc' }, { section: 'asc' }],
    }),
  ])

  const counts = initializeStatusCounts()
  groupedCounts.forEach((entry) => {
    if (admissionStatuses.includes(entry.status)) {
      const countMeta = entry._count as { _all?: number } | undefined
      counts[entry.status] = countMeta?._all ?? 0
    }
  })

  return successResponse({
    admissions: admissions.map((admission) => ({
      id: admission.id,
      applicant_name: admission.applicant_name,
      date_of_birth: admission.date_of_birth.toISOString(),
      gender: admission.gender,
      applying_for_class: admission.applying_for_class,
      parent_name: admission.parent_name,
      parent_phone: admission.parent_phone,
      parent_email: admission.parent_email,
      status: admission.status,
      applied_at: admission.applied_at?.toISOString() || admission.created_at.toISOString(),
      processed_by: admission.processed_by,
      decided_by: admission.decided_by,
      remarks: admission.remarks,
      documents_url: admission.documents_url || [],
      processed_by_email: admission.processor?.email || null,
      decided_by_email: admission.decider?.email || null,
    })),
    pagination: {
      total,
      page: query.page,
      limit: query.limit,
      total_pages: total === 0 ? 0 : Math.ceil(total / query.limit),
    },
    counts,
    current_academic_year_id: academicYearId || null,
    filters: {
      academic_years: academicYears,
      classes: classes.map((classItem) => ({
        id: classItem.id,
        name: classItem.name,
        section: classItem.section,
        label: `${classItem.name}${classItem.section ? ` - ${classItem.section}` : ''}`,
      })),
    },
  })
}

export async function POST(request: NextRequest) {
  const permissionCheck = await requirePermission('ADMISSIONS.create')
  if (permissionCheck.error) {
    return permissionCheck.error
  }

  const user = permissionCheck.user
  const payload = await request.json().catch(() => null)
  const parsedBody = createAdmissionSchema.safeParse(payload)

  if (!parsedBody.success) {
    return errorResponse(
      'VALIDATION_ERROR',
      parsedBody.error.issues[0]?.message || 'Invalid request payload',
      400
    )
  }

  const currentYear = await prisma.academicYear.findFirst({
    where: {
      school_id: user.schoolId,
      is_current: true,
    },
    select: {
      id: true,
    },
  })

  if (!currentYear) {
    return errorResponse(
      'NO_CURRENT_ACADEMIC_YEAR',
      'No active academic year configured for this school',
      400
    )
  }

  const input = parsedBody.data

  const duplicate = await prisma.admission.findFirst({
    where: {
      school_id: user.schoolId,
      academic_year_id: currentYear.id,
      applicant_name: {
        equals: input.applicant_name,
        mode: 'insensitive',
      },
      date_of_birth: input.date_of_birth,
    },
    select: {
      id: true,
    },
  })

  const created = await prisma.admission.create({
    data: {
      school_id: user.schoolId,
      academic_year_id: currentYear.id,
      applicant_name: input.applicant_name,
      date_of_birth: input.date_of_birth,
      gender: input.gender,
      applying_for_class: input.applying_for_class,
      parent_name: input.parent_name,
      parent_phone: input.parent_phone,
      parent_email: input.parent_email || null,
      address: input.address || null,
      previous_school: input.previous_school || null,
      status: AdmissionStatus.APPLIED,
      remarks: input.remarks || null,
      documents_url: input.documents_url || [],
      applied_at: new Date(),
    },
  })

  await createAuditLog({
    school_id: user.schoolId,
    user_id: user.id,
    action: 'CREATE',
    entity_type: 'admission',
    entity_id: created.id,
    new_value: {
      applicant_name: created.applicant_name,
      date_of_birth: created.date_of_birth,
      gender: created.gender,
      applying_for_class: created.applying_for_class,
      parent_name: created.parent_name,
      parent_phone: created.parent_phone,
      status: created.status,
    },
    ...getRequestMetadata(request),
  })

  return NextResponse.json(
    {
      success: true,
      data: {
        id: created.id,
        applicant_name: created.applicant_name,
        date_of_birth: created.date_of_birth.toISOString(),
        gender: created.gender,
        applying_for_class: created.applying_for_class,
        parent_name: created.parent_name,
        parent_phone: created.parent_phone,
        parent_email: created.parent_email,
        address: created.address,
        previous_school: created.previous_school,
        remarks: created.remarks,
        documents_url: created.documents_url,
        status: created.status,
        academic_year_id: created.academic_year_id,
        applied_at: created.applied_at?.toISOString() || created.created_at.toISOString(),
        duplicate_warning: Boolean(duplicate),
      },
    },
    { status: 201 }
  )
}
