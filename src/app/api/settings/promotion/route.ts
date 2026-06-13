import { NextRequest } from 'next/server'
import { createAuditLog } from '@/lib/audit'
import { cacheInvalidate } from '@/lib/cache'
import { errorResponse, successResponse } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'
import {
  executePromotionSchema,
  findRetainTargetClass,
} from '@/lib/school-settings'
import {
  getRequestMetadata,
  requireSchoolPermission,
} from '@/lib/settings-auth'

type PromotionAction = 'PROMOTE' | 'RETAIN' | 'TC'

interface PromotionWrite {
  studentId: string
  action: PromotionAction
  from: {
    class_id: string | null
    academic_year_id: string | null
    is_active: boolean
    user_id: string | null
  }
  to: {
    class_id?: string | null
    academic_year_id?: string | null
    is_active: boolean
    deactivate_user: boolean
  }
}

export async function GET(request: NextRequest) {
  const access = await requireSchoolPermission('STUDENTS.promote')
  if (access.error) {
    return access.error
  }

  const schoolId = access.user.schoolId
  const fromAcademicYearId = request.nextUrl.searchParams.get('from_academic_year_id')
  const fromClassId = request.nextUrl.searchParams.get('from_class_id')

  if (!fromAcademicYearId || !fromClassId) {
    const [academicYears, classes] = await Promise.all([
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
      prisma.class.findMany({
        where: {
          school_id: schoolId,
        },
        select: {
          id: true,
          academic_year_id: true,
          name: true,
          section: true,
        },
        orderBy: [{ name: 'asc' }, { section: 'asc' }],
      }),
    ])

    return successResponse({
      academic_years: academicYears,
      classes: classes.map((schoolClass) => ({
        id: schoolClass.id,
        academic_year_id: schoolClass.academic_year_id,
        name: schoolClass.name,
        section: schoolClass.section,
        display_name: `${schoolClass.name}${
          schoolClass.section ? ` - ${schoolClass.section}` : ''
        }`,
      })),
    })
  }

  const sourceClass = await prisma.class.findFirst({
    where: {
      id: fromClassId,
      school_id: schoolId,
      academic_year_id: fromAcademicYearId,
    },
    select: {
      id: true,
      name: true,
      section: true,
    },
  })

  if (!sourceClass) {
    return errorResponse('NOT_FOUND', 'Source class not found', 404)
  }

  const students = await prisma.student.findMany({
    where: {
      school_id: schoolId,
      class_id: fromClassId,
      academic_year_id: fromAcademicYearId,
      is_active: true,
    },
    select: {
      id: true,
      first_name: true,
      last_name: true,
      roll_number: true,
      class: {
        select: {
          name: true,
          section: true,
        },
      },
    },
    orderBy: [{ first_name: 'asc' }, { last_name: 'asc' }],
  })

  return successResponse({
    source_class: sourceClass,
    students: students.map((student) => ({
      student_id: student.id,
      name: `${student.first_name} ${student.last_name}`.trim(),
      roll_number: student.roll_number,
      current_class: `${student.class?.name || ''}${
        student.class?.section ? ` - ${student.class.section}` : ''
      }`.trim(),
      promotion_action: null,
      target_class_id: null,
    })),
  })
}

export async function POST(request: NextRequest) {
  const access = await requireSchoolPermission('STUDENTS.promote')
  if (access.error) {
    return access.error
  }

  const payload = await request.json().catch(() => null)
  const parsedBody = executePromotionSchema.safeParse(payload)
  if (!parsedBody.success) {
    return errorResponse(
      'VALIDATION_ERROR',
      parsedBody.error.issues[0]?.message || 'Invalid payload',
      400
    )
  }

  const data = parsedBody.data
  if (data.from_academic_year_id === data.to_academic_year_id) {
    return errorResponse(
      'VALIDATION_ERROR',
      'from_academic_year_id and to_academic_year_id must be different',
      400
    )
  }

  const schoolId = access.user.schoolId
  const duplicateStudentId = data.promotions.find((promotion, index) => {
    return data.promotions.findIndex(
      (candidate) => candidate.student_id === promotion.student_id
    ) !== index
  })

  if (duplicateStudentId) {
    return errorResponse(
      'VALIDATION_ERROR',
      'Duplicate student_id values are not allowed',
      400
    )
  }

  const [fromYear, toYear, targetClasses, students] = await Promise.all([
    prisma.academicYear.findFirst({
      where: {
        id: data.from_academic_year_id,
        school_id: schoolId,
      },
      select: {
        id: true,
        name: true,
      },
    }),
    prisma.academicYear.findFirst({
      where: {
        id: data.to_academic_year_id,
        school_id: schoolId,
      },
      select: {
        id: true,
        name: true,
      },
    }),
    prisma.class.findMany({
      where: {
        school_id: schoolId,
        academic_year_id: data.to_academic_year_id,
      },
      select: {
        id: true,
        name: true,
        section: true,
      },
    }),
    prisma.student.findMany({
      where: {
        school_id: schoolId,
        id: {
          in: data.promotions.map((promotion) => promotion.student_id),
        },
      },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        class_id: true,
        academic_year_id: true,
        is_active: true,
        user_id: true,
        class: {
          select: {
            id: true,
            name: true,
            section: true,
          },
        },
      },
    }),
  ])

  if (!fromYear || !toYear) {
    return errorResponse(
      'NOT_FOUND',
      'Source or target academic year not found',
      404
    )
  }

  if (students.length !== data.promotions.length) {
    return errorResponse(
      'NOT_FOUND',
      'One or more students were not found in this school',
      404
    )
  }

  const targetClassById = new Map(targetClasses.map((schoolClass) => [schoolClass.id, schoolClass]))
  const studentById = new Map(students.map((student) => [student.id, student]))

  const skipped: Array<{ student_id: string; reason: string }> = []
  const writes: PromotionWrite[] = []

  for (const promotion of data.promotions) {
    const student = studentById.get(promotion.student_id)
    if (!student) {
      return errorResponse(
        'NOT_FOUND',
        `Student ${promotion.student_id} not found`,
        404
      )
    }

    if (student.academic_year_id === data.to_academic_year_id && promotion.action !== 'TC') {
      skipped.push({
        student_id: student.id,
        reason: 'Already promoted to target academic year',
      })
      continue
    }

    if (student.academic_year_id !== data.from_academic_year_id) {
      return errorResponse(
        'VALIDATION_ERROR',
        `Student ${promotion.student_id} is not in the source academic year`,
        400
      )
    }

    if (promotion.action === 'PROMOTE') {
      if (!promotion.target_class_id) {
        return errorResponse(
          'VALIDATION_ERROR',
          `target_class_id is required for student ${student.id} with PROMOTE action`,
          400
        )
      }

      const targetClass = targetClassById.get(promotion.target_class_id)
      if (!targetClass) {
        return errorResponse(
          'INVALID_TARGET_CLASS',
          'Target class does not exist in new year',
          400
        )
      }

      writes.push({
        studentId: student.id,
        action: promotion.action,
        from: {
          class_id: student.class_id,
          academic_year_id: student.academic_year_id,
          is_active: student.is_active,
          user_id: student.user_id,
        },
        to: {
          class_id: targetClass.id,
          academic_year_id: data.to_academic_year_id,
          is_active: true,
          deactivate_user: false,
        },
      })
      continue
    }

    if (promotion.action === 'RETAIN') {
      const explicitTarget = promotion.target_class_id
        ? targetClassById.get(promotion.target_class_id)
        : null
      const matchedTarget = student.class
        ? findRetainTargetClass(
            {
              name: student.class.name,
              section: student.class.section,
            },
            targetClasses
          )
        : null

      const retainTarget = explicitTarget || matchedTarget
      if (!retainTarget) {
        return errorResponse(
          'INVALID_TARGET_CLASS',
          'Target class does not exist in new year',
          400
        )
      }

      writes.push({
        studentId: student.id,
        action: promotion.action,
        from: {
          class_id: student.class_id,
          academic_year_id: student.academic_year_id,
          is_active: student.is_active,
          user_id: student.user_id,
        },
        to: {
          class_id: retainTarget.id,
          academic_year_id: data.to_academic_year_id,
          is_active: true,
          deactivate_user: false,
        },
      })
      continue
    }

    writes.push({
      studentId: student.id,
      action: promotion.action,
      from: {
        class_id: student.class_id,
        academic_year_id: student.academic_year_id,
        is_active: student.is_active,
        user_id: student.user_id,
      },
      to: {
        class_id: student.class_id,
        academic_year_id: student.academic_year_id,
        is_active: false,
        deactivate_user: Boolean(student.user_id),
      },
    })
  }

  const updated: Array<{
    student_id: string
    action: PromotionAction
    class_id: string | null
    academic_year_id: string | null
    is_active: boolean
    user_id: string | null
  }> = []

  await prisma.$transaction(async (transaction) => {
    for (const write of writes) {
      const studentUpdate = await transaction.student.update({
        where: {
          id: write.studentId,
        },
        data: {
          class_id: write.to.class_id,
          academic_year_id: write.to.academic_year_id,
          is_active: write.to.is_active,
          updated_at: new Date(),
        },
        select: {
          id: true,
          class_id: true,
          academic_year_id: true,
          is_active: true,
          user_id: true,
        },
      })

      if (write.to.deactivate_user && write.from.user_id) {
        await transaction.user.update({
          where: {
            id: write.from.user_id,
          },
          data: {
            is_active: false,
            updated_at: new Date(),
          },
        })
      }

      updated.push({
        student_id: studentUpdate.id,
        action: write.action,
        class_id: studentUpdate.class_id,
        academic_year_id: studentUpdate.academic_year_id,
        is_active: studentUpdate.is_active,
        user_id: studentUpdate.user_id,
      })
    }
  })

  const metadata = getRequestMetadata(request)
  await Promise.all(
    writes.map((write) =>
      createAuditLog({
        school_id: schoolId,
        user_id: access.user.id,
        action: 'UPDATE',
        entity_type: 'student',
        entity_id: write.studentId,
        old_value: {
          class_id: write.from.class_id,
          academic_year_id: write.from.academic_year_id,
          is_active: write.from.is_active,
          promotion_action: write.action,
        },
        new_value: {
          class_id: write.to.class_id,
          academic_year_id: write.to.academic_year_id,
          is_active: write.to.is_active,
          promotion_action: write.action,
          deactivated_user_account: write.to.deactivate_user,
        },
        ...metadata,
      })
    )
  )

  await Promise.all([
    cacheInvalidate(`dashboard:${schoolId}`),
    cacheInvalidate(`students:${schoolId}`),
    cacheInvalidate(`fees:balance:${schoolId}`),
  ])

  return successResponse({
    source_academic_year: fromYear,
    target_academic_year: toYear,
    total_requested: data.promotions.length,
    total_updated: updated.length,
    total_skipped: skipped.length,
    skipped,
    updates: updated,
  })
}
