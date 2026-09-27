import { Prisma } from '@prisma/client'
import { NextRequest } from 'next/server'
import { createAuditLog } from '@/lib/audit'
import { errorResponse, successResponse } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'
import {
  normalizeNullableText,
  updateClassSchema,
} from '@/lib/school-settings'
import {
  getRequestMetadata,
  requireSchoolPermission,
} from '@/lib/settings-auth'

function normalizeSection(section: string | null | undefined): string | null {
  const normalized = section?.trim()
  return normalized ? normalized.toUpperCase() : null
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireSchoolPermission('SETTINGS.manage_school_settings')
  if (access.error) {
    return access.error
  }

  const payload = await request.json().catch(() => null)
  const parsedBody = updateClassSchema.safeParse(payload)
  if (!parsedBody.success) {
    return errorResponse(
      'VALIDATION_ERROR',
      parsedBody.error.issues[0]?.message || 'Invalid payload',
      400
    )
  }

  const { id } = await params
  const schoolId = access.user.schoolId
  const existingClass = await prisma.class.findFirst({
    where: {
      id,
      school_id: schoolId,
    },
    select: {
      id: true,
      name: true,
      section: true,
      room_number: true,
      max_students: true,
      class_teacher_id: true,
      academic_year_id: true,
    },
  })

  if (!existingClass) {
    return errorResponse('NOT_FOUND', 'Class not found', 404)
  }

  if (parsedBody.data.class_teacher_id) {
    const teacher = await prisma.staff.findFirst({
      where: {
        id: parsedBody.data.class_teacher_id,
        school_id: schoolId,
        is_active: true,
      },
      select: {
        id: true,
      },
    })
    if (!teacher) {
      return errorResponse('NOT_FOUND', 'Class teacher not found', 404)
    }
  }

  try {
    const updatedClass = await prisma.class.update({
      where: {
        id,
      },
      data: {
        name: parsedBody.data.name?.trim(),
        section:
          parsedBody.data.section === undefined
            ? undefined
            : normalizeSection(parsedBody.data.section),
        room_number:
          parsedBody.data.room_number === undefined
            ? undefined
            : normalizeNullableText(parsedBody.data.room_number),
        max_students: parsedBody.data.max_students,
        class_teacher_id: parsedBody.data.class_teacher_id,
        updated_at: new Date(),
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
      action: 'UPDATE',
      entity_type: 'class',
      entity_id: updatedClass.id,
      old_value: existingClass,
      new_value: {
        id: updatedClass.id,
        name: updatedClass.name,
        section: updatedClass.section,
        room_number: updatedClass.room_number,
        max_students: updatedClass.max_students,
        class_teacher_id: updatedClass.class_teacher_id,
      },
      ...getRequestMetadata(request),
    })

    return successResponse({
      class: {
        id: updatedClass.id,
        academic_year_id: updatedClass.academic_year_id,
        name: updatedClass.name,
        section: updatedClass.section,
        room_number: updatedClass.room_number,
        max_students: updatedClass.max_students,
        class_teacher_id: updatedClass.class_teacher_id,
        class_teacher_name: updatedClass.class_teacher
          ? `${updatedClass.class_teacher.first_name} ${updatedClass.class_teacher.last_name}`.trim()
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
        'A class with this name and section already exists for the academic year',
        409
      )
    }
    return errorResponse('INTERNAL_SERVER_ERROR', 'Failed to update class', 500)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireSchoolPermission('SETTINGS.manage_school_settings')
  if (access.error) {
    return access.error
  }

  const { id } = await params
  const schoolId = access.user.schoolId
  const existingClass = await prisma.class.findFirst({
    where: {
      id,
      school_id: schoolId,
    },
    select: {
      id: true,
      name: true,
      section: true,
      academic_year_id: true,
      room_number: true,
      max_students: true,
      class_teacher_id: true,
    },
  })

  if (!existingClass) {
    return errorResponse('NOT_FOUND', 'Class not found', 404)
  }

  const studentCount = await prisma.student.count({
    where: {
      school_id: schoolId,
      class_id: id,
      is_active: true,
    },
  })

  if (studentCount > 0) {
    return errorResponse(
      'CLASS_HAS_STUDENTS',
      `Reassign ${studentCount} students first`,
      409
    )
  }

  await prisma.class.delete({
    where: {
      id,
    },
  })

  await createAuditLog({
    school_id: schoolId,
    user_id: access.user.id,
    action: 'DELETE',
    entity_type: 'class',
    entity_id: id,
    old_value: existingClass,
    ...getRequestMetadata(request),
  })

  return successResponse({
    message: 'Class deleted successfully',
  })
}

