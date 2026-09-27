import { Prisma } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { NextRequest, NextResponse } from 'next/server'
import {
  errorResponse,
  forbiddenResponse,
  successResponse,
  unauthorizedResponse,
} from '@/lib/api-helpers'
import { auth } from '@/lib/auth'
import { createAuditLog } from '@/lib/audit'
import { hasPermission } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import {
  createStudentSchema,
  getRequestMetadata,
  mapStudentRow,
  parseStudentListQuery,
  studentOrderBy,
} from '@/lib/student-management'
import { generatePassword } from '@/lib/utils'

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

type StudentWithRelations = Prisma.StudentGetPayload<{
  include: {
    class: {
      select: {
        id: true
        name: true
        section: true
      }
    }
    academic_year: {
      select: {
        id: true
        name: true
      }
    }
    user: {
      select: {
        id: true
        email: true
        is_active: true
      }
    }
    parents: {
      include: {
        parent: {
          select: {
            id: true
            first_name: true
            last_name: true
            relation: true
            email: true
            phone: true
          }
        }
      }
    }
  }
}>

async function requirePermission(
  permissionCode: string
): Promise<PermissionCheckResult> {
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

  const isAllowed = await hasPermission(user.schoolId, user.role, permissionCode)
  if (!isAllowed) {
    return {
      error: forbiddenResponse(`Missing permission: ${permissionCode}`),
      user: null,
    }
  }

  return { error: null, user: { ...user, schoolId: user.schoolId } }
}

function mapStudentDetail(student: StudentWithRelations) {
  return {
    id: student.id,
    admission_number: student.admission_number,
    first_name: student.first_name,
    last_name: student.last_name,
    name: `${student.first_name} ${student.last_name}`.trim(),
    gender: student.gender,
    date_of_birth: student.date_of_birth.toISOString(),
    blood_group: student.blood_group,
    phone: student.phone,
    address: student.address,
    emergency_contact_name: student.emergency_contact_name,
    emergency_contact_phone: student.emergency_contact_phone,
    photo_url: student.photo_url,
    class_id: student.class_id,
    class: student.class,
    academic_year_id: student.academic_year_id,
    academic_year: student.academic_year,
    admission_date: student.admission_date?.toISOString() ?? null,
    roll_number: student.roll_number,
    is_active: student.is_active,
    user: student.user,
    parents: student.parents.map((link) => ({
      id: link.parent.id,
      first_name: link.parent.first_name,
      last_name: link.parent.last_name,
      name: `${link.parent.first_name} ${link.parent.last_name}`.trim(),
      relation: link.parent.relation,
      email: link.parent.email,
      phone: link.parent.phone,
      is_primary: link.is_primary,
      linked_at: link.created_at.toISOString(),
    })),
    created_at: student.created_at.toISOString(),
    updated_at: student.updated_at.toISOString(),
  }
}

export async function GET(request: NextRequest) {
  const permissionCheck = await requirePermission('STUDENTS.view')
  if (permissionCheck.error) {
    return permissionCheck.error
  }
  const user = permissionCheck.user

  const parsedQuery = parseStudentListQuery(request.nextUrl.searchParams)
  if (!parsedQuery.success) {
    return errorResponse(
      'VALIDATION_ERROR',
      parsedQuery.error.issues[0]?.message || 'Invalid query parameters',
      400
    )
  }

  const query = parsedQuery.data

  if (query.parent_search) {
    const parents = await prisma.parent.findMany({
      where: {
        school_id: user.schoolId,
        OR: [
          { first_name: { contains: query.parent_search, mode: 'insensitive' } },
          { last_name: { contains: query.parent_search, mode: 'insensitive' } },
          {
            AND: [
              { first_name: { contains: query.parent_search, mode: 'insensitive' } },
              { last_name: { contains: query.parent_search, mode: 'insensitive' } },
            ],
          },
        ],
      },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        relation: true,
        email: true,
      },
      orderBy: [{ first_name: 'asc' }, { last_name: 'asc' }],
      take: Math.min(query.limit, 20),
    })

    return successResponse({
      parents: parents.map((parent) => ({
        ...parent,
        name: `${parent.first_name} ${parent.last_name}`.trim(),
      })),
    })
  }

  const where: Prisma.StudentWhereInput = {
    school_id: user.schoolId,
  }

  if (query.search) {
    where.OR = [
      { admission_number: { contains: query.search, mode: 'insensitive' } },
      { first_name: { contains: query.search, mode: 'insensitive' } },
      { last_name: { contains: query.search, mode: 'insensitive' } },
      {
        AND: [
          { first_name: { contains: query.search, mode: 'insensitive' } },
          { last_name: { contains: query.search, mode: 'insensitive' } },
        ],
      },
    ]
  }

  if (query.class_id) {
    where.class_id = query.class_id
  }

  if (query.gender) {
    where.gender = query.gender
  }

  if (query.is_active) {
    where.is_active = query.is_active === 'true'
  }

  const skip = (query.page - 1) * query.limit
  const [total, students, classes, academicYears] = await prisma.$transaction([
    prisma.student.count({ where }),
    prisma.student.findMany({
      where,
      include: {
        class: {
          select: {
            name: true,
            section: true,
          },
        },
      },
      orderBy: studentOrderBy(query.sort_by, query.sort_order),
      skip,
      take: query.limit,
    }),
    prisma.class.findMany({
      where: {
        school_id: user.schoolId,
      },
      select: {
        id: true,
        name: true,
        section: true,
        academic_year_id: true,
      },
      orderBy: [{ name: 'asc' }, { section: 'asc' }],
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
  ])

  const totalPages = total === 0 ? 0 : Math.ceil(total / query.limit)

  return successResponse({
    students: students.map(mapStudentRow),
    pagination: {
      total,
      page: query.page,
      limit: query.limit,
      total_pages: totalPages,
    },
    filters: {
      classes: classes.map((classItem) => ({
        id: classItem.id,
        name: classItem.name,
        section: classItem.section,
        label: `${classItem.name}${classItem.section ? ` - ${classItem.section}` : ''}`,
        academic_year_id: classItem.academic_year_id,
      })),
      academic_years: academicYears.map((year) => ({
        id: year.id,
        name: year.name,
        is_current: year.is_current,
      })),
    },
    search_note: 'Search supports name and admission number. Phone/address fields are encrypted.',
  })
}

export async function POST(request: NextRequest) {
  const permissionCheck = await requirePermission('STUDENTS.create')
  if (permissionCheck.error) {
    return permissionCheck.error
  }
  const user = permissionCheck.user

  const parsedBody = createStudentSchema.safeParse(await request.json())
  if (!parsedBody.success) {
    return errorResponse(
      'VALIDATION_ERROR',
      parsedBody.error.issues[0]?.message || 'Invalid request payload',
      400
    )
  }

  const data = parsedBody.data
  const classRecord = await prisma.class.findFirst({
    where: {
      id: data.class_id,
      school_id: user.schoolId,
    },
    select: {
      id: true,
      name: true,
      section: true,
      academic_year_id: true,
    },
  })

  if (!classRecord) {
    return errorResponse('INVALID_CLASS', 'Selected class is invalid for this school', 400)
  }

  const academicYearId = data.academic_year_id ?? classRecord.academic_year_id
  const academicYear = await prisma.academicYear.findFirst({
    where: {
      id: academicYearId,
      school_id: user.schoolId,
    },
    select: {
      id: true,
      name: true,
    },
  })

  if (!academicYear) {
    return errorResponse('INVALID_ACADEMIC_YEAR', 'Academic year is invalid for this school', 400)
  }

  if (classRecord.academic_year_id !== academicYear.id) {
    return errorResponse(
      'CLASS_YEAR_MISMATCH',
      'Selected class does not belong to the provided academic year',
      400
    )
  }

  const duplicateAdmission = await prisma.student.findFirst({
    where: {
      school_id: user.schoolId,
      admission_number: data.admission_number,
    },
    select: {
      id: true,
    },
  })

  if (duplicateAdmission) {
    return errorResponse('DUPLICATE_ADMISSION_NUMBER', 'Admission number already exists', 409)
  }

  const accountPayload = data.account
  const shouldCreateUser = accountPayload?.create_user === true
  const normalizedEmail = accountPayload?.email?.toLowerCase().trim()

  if (shouldCreateUser && normalizedEmail) {
    const existingUser = await prisma.user.findFirst({
      where: {
        school_id: user.schoolId,
        email: normalizedEmail,
      },
      select: {
        id: true,
      },
    })

    if (existingUser) {
      return errorResponse('DUPLICATE_EMAIL', 'A user account with this email already exists', 409)
    }
  }

  const metadata = getRequestMetadata(request)
  let generatedPassword: string | null = null
  let createdStudentId = ''
  let linkedParentId: string | null = null
  let createdUserId: string | null = null

  try {
    await prisma.$transaction(async (transaction) => {
      if (shouldCreateUser) {
        const rawPassword =
          accountPayload?.auto_generate_password || !accountPayload?.password
            ? generatePassword(12)
            : accountPayload.password
        generatedPassword = rawPassword

        const userRecord = await transaction.user.create({
          data: {
            school_id: user.schoolId,
            email: normalizedEmail!,
            password_hash: await bcrypt.hash(rawPassword, 12),
            role: 'STUDENT',
            is_active: true,
          },
          select: {
            id: true,
          },
        })
        createdUserId = userRecord.id
      }

      const createdStudent = await transaction.student.create({
        data: {
          school_id: user.schoolId,
          user_id: createdUserId,
          admission_number: data.admission_number,
          first_name: data.first_name,
          last_name: data.last_name,
          gender: data.gender ?? null,
          date_of_birth: data.date_of_birth,
          blood_group: data.blood_group ?? null,
          phone: data.phone ?? null,
          address: data.address ?? null,
          emergency_contact_name: data.emergency_contact_name ?? null,
          emergency_contact_phone: data.emergency_contact_phone ?? null,
          photo_url: data.photo_url ?? null,
          class_id: classRecord.id,
          academic_year_id: academicYear.id,
          admission_date: data.admission_date ?? new Date(),
          roll_number: data.roll_number ?? null,
          is_active: data.is_active ?? true,
        },
        select: {
          id: true,
        },
      })

      createdStudentId = createdStudent.id

      if (data.parent) {
        let parentId = data.parent.existing_parent_id

        if (parentId) {
          const existingParent = await transaction.parent.findFirst({
            where: {
              id: parentId,
              school_id: user.schoolId,
            },
            select: {
              id: true,
            },
          })

          if (!existingParent) {
            throw new Error('INVALID_PARENT_REFERENCE')
          }
        } else if (data.parent.create_parent) {
          const createdParent = await transaction.parent.create({
            data: {
              school_id: user.schoolId,
              first_name: data.parent.create_parent.first_name,
              last_name: data.parent.create_parent.last_name,
              relation: data.parent.create_parent.relation ?? null,
              phone: data.parent.create_parent.phone,
              alternate_phone: data.parent.create_parent.alternate_phone ?? null,
              email: data.parent.create_parent.email ?? null,
              occupation: data.parent.create_parent.occupation ?? null,
              address: data.parent.create_parent.address ?? null,
              photo_url: data.parent.create_parent.photo_url ?? null,
            },
            select: {
              id: true,
            },
          })
          parentId = createdParent.id
        }

        if (parentId) {
          const shouldBePrimary = data.parent.is_primary ?? true

          if (shouldBePrimary) {
            await transaction.studentParent.updateMany({
              where: {
                school_id: user.schoolId,
                student_id: createdStudent.id,
              },
              data: {
                is_primary: false,
              },
            })
          }

          await transaction.studentParent.create({
            data: {
              school_id: user.schoolId,
              student_id: createdStudent.id,
              parent_id: parentId,
              is_primary: shouldBePrimary,
            },
          })

          linkedParentId = parentId
        }
      }
    })
  } catch (transactionError) {
    if (transactionError instanceof Prisma.PrismaClientKnownRequestError) {
      if (transactionError.code === 'P2002') {
        return errorResponse('DUPLICATE_RECORD', 'Admission number already exists', 409)
      }
    }

    if (
      transactionError instanceof Error &&
      transactionError.message === 'INVALID_PARENT_REFERENCE'
    ) {
      return errorResponse('INVALID_PARENT', 'Selected parent does not belong to this school', 400)
    }

    return errorResponse('INTERNAL_SERVER_ERROR', 'Failed to create student', 500)
  }

  const createdStudent = await prisma.student.findFirst({
    where: {
      id: createdStudentId,
      school_id: user.schoolId,
    },
    include: {
      class: {
        select: {
          id: true,
          name: true,
          section: true,
        },
      },
      academic_year: {
        select: {
          id: true,
          name: true,
        },
      },
      user: {
        select: {
          id: true,
          email: true,
          is_active: true,
        },
      },
      parents: {
        include: {
          parent: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              relation: true,
              email: true,
              phone: true,
            },
          },
        },
      },
    },
  })

  if (!createdStudent) {
    return errorResponse('NOT_FOUND', 'Student was created but could not be loaded', 500)
  }

  await createAuditLog({
    school_id: user.schoolId,
    user_id: user.id,
    action: 'CREATE',
    entity_type: 'student',
    entity_id: createdStudentId,
    new_value: {
      admission_number: createdStudent.admission_number,
      first_name: createdStudent.first_name,
      last_name: createdStudent.last_name,
      class_id: createdStudent.class_id,
      academic_year_id: createdStudent.academic_year_id,
      user_id: createdUserId,
      linked_parent_id: linkedParentId,
    },
    ...metadata,
  })

  return NextResponse.json(
    {
      success: true,
      data: {
        student: mapStudentDetail(createdStudent),
        generated_password: generatedPassword,
      },
    },
    { status: 201 }
  )
}
