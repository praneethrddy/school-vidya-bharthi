import bcrypt from 'bcryptjs'
import { Role, type Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { createAuditLog } from '@/lib/audit'
import { hasPermission } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import {
  buildStaffOrderBy,
  buildStaffWhereInput,
  createStaffSchema,
  parseStaffListQuery,
  sanitizeStaffAuditSnapshot,
} from '@/lib/staff-management'
import { generatePassword } from '@/lib/utils'

interface SessionUser {
  id: string
  role: string
  schoolId: string | null
}

interface SchoolSessionUser extends SessionUser {
  schoolId: string
}

async function requireSchoolPermission(
  permissionCode: string
): Promise<
  | { error: NextResponse; user: null }
  | { error: null; user: SchoolSessionUser }
> {
  const session = await auth()
  if (!session?.user) {
    return {
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      user: null,
    }
  }

  const user = session.user as SessionUser
  if (!user.schoolId) {
    return {
      error: NextResponse.json({ error: 'School context is required' }, { status: 400 }),
      user: null,
    }
  }

  const allowed = await hasPermission(user.schoolId, user.role, permissionCode)
  if (!allowed) {
    return {
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
      user: null,
    }
  }

  return {
    error: null,
    user: { ...user, schoolId: user.schoolId },
  }
}

function mapStaffListRow(
  row: Prisma.StaffGetPayload<{
    include: {
      user: {
        select: {
          id: true
          email: true
          role: true
          is_active: true
        }
      }
      _count: {
        select: {
          subject_assignments: true
        }
      }
    }
  }>
) {
  return {
    id: row.id,
    employee_code: row.employee_code,
    first_name: row.first_name,
    last_name: row.last_name,
    name: `${row.first_name} ${row.last_name}`.trim(),
    photo_url: row.photo_url,
    designation: row.designation,
    department: row.department,
    is_active: row.is_active,
    user_id: row.user_id,
    user_email: row.user?.email ?? null,
    user_role: row.user?.role ?? null,
    user_is_active: row.user?.is_active ?? null,
    subjects_count: row._count.subject_assignments,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  }
}

function requestMetadata(request: NextRequest) {
  const forwardedFor = request.headers.get('x-forwarded-for')
  return {
    ip_address: forwardedFor ? forwardedFor.split(',')[0].trim() : undefined,
    user_agent: request.headers.get('user-agent') ?? undefined,
  }
}

export async function GET(request: NextRequest) {
  const permissionCheck = await requireSchoolPermission('STAFF.view')
  if (permissionCheck.error) {
    return permissionCheck.error
  }
  const user = permissionCheck.user

  const queryResult = parseStaffListQuery(request.nextUrl.searchParams)
  if (!queryResult.success) {
    return NextResponse.json(
      {
        error: 'Invalid query parameters',
        details: queryResult.error.issues,
      },
      { status: 400 }
    )
  }

  const query = queryResult.data
  const where = buildStaffWhereInput(user.schoolId, query)
  const orderBy = buildStaffOrderBy(query.sort_by, query.sort_order)
  const skip = (query.page - 1) * query.limit

  const [total, rows, departmentRows, designationRows] = await prisma.$transaction([
    prisma.staff.count({ where }),
    prisma.staff.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            is_active: true,
          },
        },
        _count: {
          select: {
            subject_assignments: true,
          },
        },
      },
      orderBy,
      skip,
      take: query.limit,
    }),
    prisma.staff.findMany({
      where: {
        school_id: user.schoolId,
        department: {
          not: null,
        },
      },
      distinct: ['department'],
      select: {
        department: true,
      },
      orderBy: {
        department: 'asc',
      },
    }),
    prisma.staff.findMany({
      where: {
        school_id: user.schoolId,
        designation: {
          not: null,
        },
      },
      distinct: ['designation'],
      select: {
        designation: true,
      },
      orderBy: {
        designation: 'asc',
      },
    }),
  ])

  return NextResponse.json({
    data: rows.map(mapStaffListRow),
    pagination: {
      total,
      page: query.page,
      limit: query.limit,
      totalPages: total === 0 ? 0 : Math.ceil(total / query.limit),
    },
    filters: {
      departments: departmentRows
        .map((entry) => entry.department)
        .filter((entry): entry is string => Boolean(entry)),
      designations: designationRows
        .map((entry) => entry.designation)
        .filter((entry): entry is string => Boolean(entry)),
    },
    search_note: 'Search supports name and employee code. Phone/address fields are encrypted.',
  })
}

export async function POST(request: NextRequest) {
  const permissionCheck = await requireSchoolPermission('STAFF.create')
  if (permissionCheck.error) {
    return permissionCheck.error
  }
  const user = permissionCheck.user

  const parsedBody = createStaffSchema.safeParse(await request.json())
  if (!parsedBody.success) {
    return NextResponse.json(
      {
        error: 'Validation failed',
        details: parsedBody.error.issues,
      },
      { status: 400 }
    )
  }

  const payload = parsedBody.data
  const normalizedEmail = payload.email ? payload.email.trim().toLowerCase() : undefined

  const duplicateCode = await prisma.staff.findFirst({
    where: {
      school_id: user.schoolId,
      employee_code: payload.employee_code,
    },
    select: {
      id: true,
    },
  })

  if (duplicateCode) {
    return NextResponse.json({ error: 'Employee code already exists' }, { status: 409 })
  }

  if (payload.create_account && normalizedEmail) {
    const duplicateEmail = await prisma.user.findFirst({
      where: {
        school_id: user.schoolId,
        email: normalizedEmail,
      },
      select: {
        id: true,
      },
    })

    if (duplicateEmail) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 409 })
    }
  }

  let generatedPassword: string | null = null
  let createdStaffId = ''

  try {
    await prisma.$transaction(async (transaction) => {
      let createdUserId: string | null = null

      if (payload.create_account && normalizedEmail && payload.role) {
        const rawPassword =
          payload.auto_generate_password || !payload.password
            ? generatePassword(12)
            : payload.password
        generatedPassword =
          payload.auto_generate_password || !payload.password ? rawPassword : null

        const createdUser = await transaction.user.create({
          data: {
            school_id: user.schoolId,
            email: normalizedEmail,
            password_hash: await bcrypt.hash(rawPassword, 12),
            role: payload.role as Role,
            is_active: true,
          },
          select: {
            id: true,
          },
        })

        createdUserId = createdUser.id
      }

      const createdStaff = await transaction.staff.create({
        data: {
          school_id: user.schoolId,
          user_id: createdUserId,
          employee_code: payload.employee_code,
          first_name: payload.first_name,
          last_name: payload.last_name,
          gender: payload.gender ?? null,
          date_of_birth: payload.date_of_birth ? new Date(payload.date_of_birth) : null,
          phone: payload.phone || null,
          address: payload.address || null,
          photo_url: payload.photo_url || null,
          designation: payload.designation || null,
          department: payload.department || null,
          date_of_joining: payload.date_of_joining ? new Date(payload.date_of_joining) : null,
          qualification: payload.qualification || null,
          is_active: true,
        },
      })

      createdStaffId = createdStaff.id
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: error.issues,
        },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  const createdStaff = await prisma.staff.findFirst({
    where: {
      school_id: user.schoolId,
      id: createdStaffId,
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          role: true,
          is_active: true,
        },
      },
      _count: {
        select: {
          subject_assignments: true,
        },
      },
    },
  })

  if (!createdStaff) {
    return NextResponse.json({ error: 'Unable to load created staff' }, { status: 500 })
  }

  await createAuditLog({
    school_id: user.schoolId,
    user_id: user.id,
    action: 'CREATE',
    entity_type: 'staff',
    entity_id: createdStaff.id,
    new_value: sanitizeStaffAuditSnapshot({
      id: createdStaff.id,
      employee_code: createdStaff.employee_code,
      first_name: createdStaff.first_name,
      last_name: createdStaff.last_name,
      gender: createdStaff.gender,
      phone: createdStaff.phone,
      address: createdStaff.address,
      designation: createdStaff.designation,
      department: createdStaff.department,
      user_id: createdStaff.user_id,
    }),
    ...requestMetadata(request),
  })

  return NextResponse.json(
    {
      data: mapStaffListRow(createdStaff),
      generatedPassword,
    },
    { status: 201 }
  )
}

