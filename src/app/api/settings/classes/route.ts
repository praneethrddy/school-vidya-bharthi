import { Prisma } from '@prisma/client'
import { NextRequest } from 'next/server'
import { createAuditLog } from '@/lib/audit'
import { errorResponse, successResponse } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'
import {
  copyClassesSchema,
  createClassSchema,
  normalizeNullableText,
} from '@/lib/school-settings'
import {
  getRequestMetadata,
  requireSchoolPermission,
} from '@/lib/settings-auth'

function formatClassName(name: string, section: string | null) {
  return `${name}${section ? ` - ${section}` : ''}`
}

function normalizeSection(section: string | null | undefined): string | null {
  const normalized = section?.trim()
  return normalized ? normalized.toUpperCase() : null
}

export async function GET(request: NextRequest) {
  const access = await requireSchoolPermission('SETTINGS.manage_school_settings')
  if (access.error) {
    return access.error
  }

  const schoolId = access.user.schoolId
  const academicYearId = request.nextUrl.searchParams.get('academic_year_id')

  const [academicYears, currentYear, classes, teachers] = await Promise.all([
    prisma.academicYear.findMany({
      where: {
        school_id: schoolId,
      },
      select: {
        id: true,
        name: true,
        is_current: true,
      },
      orderBy: {
        start_date: 'desc',
      },
    }),
    prisma.academicYear.findFirst({
      where: {
        school_id: schoolId,
        is_current: true,
      },
      select: {
        id: true,
      },
    }),
    prisma.class.findMany({
      where: {
        school_id: schoolId,
        ...(academicYearId ? { academic_year_id: academicYearId } : {}),
      },
      include: {
        class_teacher: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
          },
        },
        academic_year: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [{ name: 'asc' }, { section: 'asc' }],
    }),
    prisma.staff.findMany({
      where: {
        school_id: schoolId,
        is_active: true,
      },
      select: {
        id: true,
        first_name: true,
        last_name: true,
      },
      orderBy: [{ first_name: 'asc' }, { last_name: 'asc' }],
    }),
  ])

  const classIds = classes.map((schoolClass) => schoolClass.id)
  const studentCounts = classIds.length
    ? await prisma.student.groupBy({
        by: ['class_id'],
        where: {
          school_id: schoolId,
          class_id: {
            in: classIds,
          },
          is_active: true,
        },
        _count: {
          class_id: true,
        },
      })
    : []

  const studentCountByClass = new Map(
    studentCounts.map((entry) => [entry.class_id || '', entry._count.class_id])
  )

  return successResponse({
    academic_years: academicYears,
    current_academic_year_id: currentYear?.id || null,
    teachers: teachers.map((teacher) => ({
      id: teacher.id,
      name: `${teacher.first_name} ${teacher.last_name}`.trim(),
    })),
    classes: classes.map((schoolClass) => ({
      id: schoolClass.id,
      academic_year_id: schoolClass.academic_year_id,
      academic_year_name: schoolClass.academic_year.name,
      name: schoolClass.name,
      section: schoolClass.section,
      display_name: formatClassName(schoolClass.name, schoolClass.section),
      room_number: schoolClass.room_number,
      max_students: schoolClass.max_students,
      class_teacher_id: schoolClass.class_teacher_id,
      class_teacher_name: schoolClass.class_teacher
        ? `${schoolClass.class_teacher.first_name} ${schoolClass.class_teacher.last_name}`.trim()
        : null,
      current_students: studentCountByClass.get(schoolClass.id) || 0,
    })),
  })
}

export async function POST(request: NextRequest) {
  const access = await requireSchoolPermission('SETTINGS.manage_school_settings')
  if (access.error) {
    return access.error
  }

  const payload = await request.json().catch(() => null)
  if (!payload || typeof payload !== 'object') {
    return errorResponse('VALIDATION_ERROR', 'Invalid payload', 400)
  }

  const schoolId = access.user.schoolId
  const metadata = getRequestMetadata(request)

  if ('copy_from_academic_year_id' in payload) {
    const parsedCopy = copyClassesSchema.safeParse(payload)
    if (!parsedCopy.success) {
      return errorResponse(
        'VALIDATION_ERROR',
        parsedCopy.error.issues[0]?.message || 'Invalid copy payload',
        400
      )
    }

    const { academic_year_id, copy_from_academic_year_id } = parsedCopy.data
    if (academic_year_id === copy_from_academic_year_id) {
      return errorResponse(
        'VALIDATION_ERROR',
        'Source and target academic years must be different',
        400
      )
    }

    const [targetYear, sourceYear] = await Promise.all([
      prisma.academicYear.findFirst({
        where: {
          id: academic_year_id,
          school_id: schoolId,
        },
        select: {
          id: true,
          name: true,
        },
      }),
      prisma.academicYear.findFirst({
        where: {
          id: copy_from_academic_year_id,
          school_id: schoolId,
        },
        select: {
          id: true,
          name: true,
        },
      }),
    ])

    if (!targetYear || !sourceYear) {
      return errorResponse(
        'NOT_FOUND',
        'Source or target academic year not found',
        404
      )
    }

    const [sourceClasses, targetClasses] = await Promise.all([
      prisma.class.findMany({
        where: {
          school_id: schoolId,
          academic_year_id: copy_from_academic_year_id,
        },
        select: {
          name: true,
          section: true,
          max_students: true,
          room_number: true,
        },
      }),
      prisma.class.findMany({
        where: {
          school_id: schoolId,
          academic_year_id,
        },
        select: {
          name: true,
          section: true,
        },
      }),
    ])

    if (sourceClasses.length === 0) {
      return errorResponse(
        'SOURCE_EMPTY',
        'No classes found in source academic year',
        400
      )
    }

    const existingTargetKeys = new Set(
      targetClasses.map(
        (schoolClass) =>
          `${schoolClass.name.trim().toUpperCase()}::${normalizeSection(schoolClass.section) || ''}`
      )
    )

    const toCreate = sourceClasses.filter((schoolClass) => {
      const key = `${schoolClass.name.trim().toUpperCase()}::${
        normalizeSection(schoolClass.section) || ''
      }`
      return !existingTargetKeys.has(key)
    })

    if (toCreate.length > 0) {
      await prisma.class.createMany({
        data: toCreate.map((schoolClass) => ({
          school_id: schoolId,
          academic_year_id,
          name: schoolClass.name,
          section: normalizeSection(schoolClass.section),
          max_students: schoolClass.max_students,
          room_number: schoolClass.room_number,
        })),
      })
    }

    await createAuditLog({
      school_id: schoolId,
      user_id: access.user.id,
      action: 'CREATE',
      entity_type: 'class',
      entity_id: academic_year_id,
      new_value: {
        source_academic_year_id: copy_from_academic_year_id,
        source_academic_year_name: sourceYear.name,
        target_academic_year_id: academic_year_id,
        target_academic_year_name: targetYear.name,
        created_count: toCreate.length,
        skipped_count: sourceClasses.length - toCreate.length,
      },
      ...metadata,
    })

    const createdClasses = await prisma.class.findMany({
      where: {
        school_id: schoolId,
        academic_year_id,
      },
      orderBy: [{ name: 'asc' }, { section: 'asc' }],
    })

    return successResponse({
      created_count: toCreate.length,
      skipped_count: sourceClasses.length - toCreate.length,
      classes: createdClasses.map((schoolClass) => ({
        id: schoolClass.id,
        name: schoolClass.name,
        section: schoolClass.section,
        display_name: formatClassName(schoolClass.name, schoolClass.section),
        room_number: schoolClass.room_number,
        max_students: schoolClass.max_students,
        class_teacher_id: schoolClass.class_teacher_id,
      })),
    })
  }

  const parsedCreate = createClassSchema.safeParse(payload)
  if (!parsedCreate.success) {
    return errorResponse(
      'VALIDATION_ERROR',
      parsedCreate.error.issues[0]?.message || 'Invalid payload',
      400
    )
  }

  const data = parsedCreate.data
  const [academicYear, teacher] = await Promise.all([
    prisma.academicYear.findFirst({
      where: {
        id: data.academic_year_id,
        school_id: schoolId,
      },
      select: {
        id: true,
      },
    }),
    data.class_teacher_id
      ? prisma.staff.findFirst({
          where: {
            id: data.class_teacher_id,
            school_id: schoolId,
            is_active: true,
          },
          select: {
            id: true,
          },
        })
      : Promise.resolve(null),
  ])

  if (!academicYear) {
    return errorResponse('NOT_FOUND', 'Academic year not found', 404)
  }

  if (data.class_teacher_id && !teacher) {
    return errorResponse('NOT_FOUND', 'Class teacher not found', 404)
  }

  try {
    const createdClass = await prisma.class.create({
      data: {
        school_id: schoolId,
        academic_year_id: data.academic_year_id,
        name: data.name.trim(),
        section: normalizeSection(data.section),
        max_students: data.max_students,
        room_number: normalizeNullableText(data.room_number),
        class_teacher_id: data.class_teacher_id || null,
      },
      include: {
        class_teacher: {
          select: {
            first_name: true,
            last_name: true,
          },
        },
      },
    })

    await createAuditLog({
      school_id: schoolId,
      user_id: access.user.id,
      action: 'CREATE',
      entity_type: 'class',
      entity_id: createdClass.id,
      new_value: {
        academic_year_id: createdClass.academic_year_id,
        name: createdClass.name,
        section: createdClass.section,
        room_number: createdClass.room_number,
        max_students: createdClass.max_students,
        class_teacher_id: createdClass.class_teacher_id,
      },
      ...metadata,
    })

    return successResponse({
      class: {
        id: createdClass.id,
        academic_year_id: createdClass.academic_year_id,
        name: createdClass.name,
        section: createdClass.section,
        display_name: formatClassName(createdClass.name, createdClass.section),
        room_number: createdClass.room_number,
        max_students: createdClass.max_students,
        class_teacher_id: createdClass.class_teacher_id,
        class_teacher_name: createdClass.class_teacher
          ? `${createdClass.class_teacher.first_name} ${createdClass.class_teacher.last_name}`.trim()
          : null,
      },
    })
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return errorResponse(
        'DUPLICATE_CLASS',
        'A class with the same name and section already exists for this academic year',
        409
      )
    }

    return errorResponse('INTERNAL_SERVER_ERROR', 'Failed to create class', 500)
  }
}

