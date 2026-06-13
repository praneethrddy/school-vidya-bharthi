import { NextRequest } from 'next/server'
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
import { assignClassSchema, getRequestMetadata } from '@/lib/student-management'

interface SessionUser {
  id: string
  role: string
  schoolId: string | null
}

interface SchoolSessionUser extends SessionUser {
  schoolId: string
}

type PermissionCheckResult =
  | { error: Response; user: null }
  | { error: null; user: SchoolSessionUser }

async function requireAssignClassPermission(): Promise<PermissionCheckResult> {
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

  const allowed = await hasPermission(user.schoolId, user.role, 'STUDENTS.assign_class')
  if (!allowed) {
    return {
      error: forbiddenResponse('Missing permission: STUDENTS.assign_class'),
      user: null,
    }
  }

  return {
    error: null,
    user: { ...user, schoolId: user.schoolId },
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const permissionCheck = await requireAssignClassPermission()
  if (permissionCheck.error) {
    return permissionCheck.error
  }
  const user = permissionCheck.user

  const { id } = await params
  const parsedBody = assignClassSchema.safeParse(await request.json())
  if (!parsedBody.success) {
    return errorResponse(
      'VALIDATION_ERROR',
      parsedBody.error.issues[0]?.message || 'Invalid request payload',
      400
    )
  }

  const { class_id, academic_year_id } = parsedBody.data

  const student = await prisma.student.findFirst({
    where: {
      id,
      school_id: user.schoolId,
    },
    select: {
      id: true,
      class_id: true,
      academic_year_id: true,
    },
  })

  if (!student) {
    return errorResponse('NOT_FOUND', 'Student not found', 404)
  }

  const classRecord = await prisma.class.findFirst({
    where: {
      id: class_id,
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

  const targetAcademicYearId = academic_year_id ?? classRecord.academic_year_id
  if (targetAcademicYearId !== classRecord.academic_year_id) {
    return errorResponse(
      'CLASS_YEAR_MISMATCH',
      'Selected class does not belong to the provided academic year',
      400
    )
  }

  const academicYear = await prisma.academicYear.findFirst({
    where: {
      id: targetAcademicYearId,
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

  const updatedStudent = await prisma.student.update({
    where: {
      id,
    },
    data: {
      class_id: classRecord.id,
      academic_year_id: academicYear.id,
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
    },
  })

  await createAuditLog({
    school_id: user.schoolId,
    user_id: user.id,
    action: 'UPDATE',
    entity_type: 'student',
    entity_id: id,
    old_value: {
      class_id: student.class_id,
      academic_year_id: student.academic_year_id,
    },
    new_value: {
      class_id: updatedStudent.class_id,
      class_name: updatedStudent.class?.name,
      class_section: updatedStudent.class?.section,
      academic_year_id: updatedStudent.academic_year_id,
      academic_year_name: updatedStudent.academic_year?.name,
    },
    ...getRequestMetadata(request),
  })

  return successResponse({
    student_id: id,
    class: updatedStudent.class,
    academic_year: updatedStudent.academic_year,
  })
}
