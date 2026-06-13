import { AdmissionStatus, Prisma } from '@prisma/client'
import { NextRequest } from 'next/server'
import {
  errorResponse,
  forbiddenResponse,
  successResponse,
  unauthorizedResponse,
} from '@/lib/api-helpers'
import {
  generateAdmissionNumber,
  getRequestMetadata,
  mapAdmissionToStudentPayload,
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

function buildConvertedRemark(previousRemarks: string | null, studentId: string): string {
  const marker = `[CONVERTED:${studentId}]`
  if (!previousRemarks) {
    return marker
  }

  if (previousRemarks.includes('[CONVERTED:')) {
    return previousRemarks
  }

  return `${previousRemarks}\n${marker}`
}

function isAlreadyConverted(remarks: string | null): boolean {
  return Boolean(remarks && remarks.includes('[CONVERTED:'))
}

function parseClassName(value: string): { name: string; section: string | null } {
  const normalized = value.trim().replace(/\s+/g, ' ')
  const withDash = normalized.split('-').map((item) => item.trim()).filter(Boolean)
  if (withDash.length >= 2) {
    return {
      name: withDash.slice(0, withDash.length - 1).join(' '),
      section: withDash[withDash.length - 1],
    }
  }

  const withSectionWord = normalized.match(/^(.*)\s+section\s+([A-Za-z0-9]+)$/i)
  if (withSectionWord) {
    return {
      name: withSectionWord[1].trim(),
      section: withSectionWord[2].trim(),
    }
  }

  return {
    name: normalized,
    section: null,
  }
}

async function resolveTargetClass(params: {
  schoolId: string
  academicYearId: string
  applyingForClass: string
}) {
  const parsed = parseClassName(params.applyingForClass)

  const exactMatch = await prisma.class.findFirst({
    where: {
      school_id: params.schoolId,
      academic_year_id: params.academicYearId,
      name: {
        equals: parsed.name,
        mode: 'insensitive',
      },
      ...(parsed.section
        ? {
            section: {
              equals: parsed.section,
              mode: 'insensitive',
            },
          }
        : {}),
    },
  })

  if (exactMatch) {
    return exactMatch
  }

  return prisma.class.findFirst({
    where: {
      school_id: params.schoolId,
      academic_year_id: params.academicYearId,
      name: {
        contains: parsed.name,
        mode: 'insensitive',
      },
    },
    orderBy: [{ name: 'asc' }, { section: 'asc' }],
  })
}

async function requireSchoolUser() {
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

  return {
    error: null,
    user: { ...user, schoolId: user.schoolId } as SchoolSessionUser,
  }
}

async function createUniqueAdmissionNumber(
  tx: Prisma.TransactionClient,
  schoolId: string
): Promise<string> {
  for (let attempt = 0; attempt < 12; attempt++) {
    const admissionNumber = generateAdmissionNumber()
    const existing = await tx.student.findFirst({
      where: {
        school_id: schoolId,
        admission_number: admissionNumber,
      },
      select: {
        id: true,
      },
    })

    if (!existing) {
      return admissionNumber
    }
  }

  throw new Error('ADMISSION_NUMBER_GENERATION_FAILED')
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessionCheck = await requireSchoolUser()
  if (sessionCheck.error) {
    return sessionCheck.error
  }

  const user = sessionCheck.user

  const [canAdmit, canCreateStudent] = await Promise.all([
    hasPermission(user.schoolId, user.role, 'ADMISSIONS.admit'),
    hasPermission(user.schoolId, user.role, 'STUDENTS.create'),
  ])

  if (!canAdmit && !canCreateStudent) {
    return forbiddenResponse('Missing permission: ADMISSIONS.admit or STUDENTS.create')
  }

  const { id } = await params
  const admission = await prisma.admission.findFirst({
    where: {
      id,
      school_id: user.schoolId,
    },
    select: {
      id: true,
      academic_year_id: true,
      applicant_name: true,
      date_of_birth: true,
      gender: true,
      applying_for_class: true,
      parent_name: true,
      parent_phone: true,
      parent_email: true,
      address: true,
      status: true,
      remarks: true,
    },
  })

  if (!admission) {
    return errorResponse('NOT_FOUND', 'Admission application not found', 404)
  }

  if (admission.status !== AdmissionStatus.ADMITTED) {
    return errorResponse('INVALID_STATUS', 'Only ADMITTED applications can be converted', 400)
  }

  if (isAlreadyConverted(admission.remarks)) {
    return errorResponse('ALREADY_CONVERTED', 'This applicant has already been converted to a student', 409)
  }

  const targetClass = await resolveTargetClass({
    schoolId: user.schoolId,
    academicYearId: admission.academic_year_id,
    applyingForClass: admission.applying_for_class,
  })

  if (!targetClass) {
    return errorResponse(
      'CLASS_NOT_FOUND',
      'No matching class found for this admission in the selected academic year',
      400
    )
  }

  const activeStudentsInClass = await prisma.student.count({
    where: {
      school_id: user.schoolId,
      class_id: targetClass.id,
      is_active: true,
    },
  })

  if (activeStudentsInClass >= targetClass.max_students) {
    return errorResponse('CLASS_FULL', 'Selected class has reached its capacity limit', 409)
  }

  let createdStudentId = ''
  let createdParentId = ''
  let admissionNumber = ''

  try {
    await prisma.$transaction(async (tx) => {
      admissionNumber = await createUniqueAdmissionNumber(tx, user.schoolId)

      const mapped = mapAdmissionToStudentPayload({
        admission: {
          id: admission.id,
          applicant_name: admission.applicant_name,
          date_of_birth: admission.date_of_birth,
          gender: admission.gender,
          parent_name: admission.parent_name,
          parent_phone: admission.parent_phone,
          parent_email: admission.parent_email,
          address: admission.address,
        },
        schoolId: user.schoolId,
        classId: targetClass.id,
        academicYearId: admission.academic_year_id,
        admissionNumber,
      })

      const createdParent = await tx.parent.create({
        data: mapped.parent,
        select: {
          id: true,
        },
      })
      createdParentId = createdParent.id

      const createdStudent = await tx.student.create({
        data: mapped.student,
        select: {
          id: true,
        },
      })
      createdStudentId = createdStudent.id

      await tx.studentParent.create({
        data: {
          school_id: user.schoolId,
          student_id: createdStudent.id,
          parent_id: createdParent.id,
          is_primary: true,
        },
      })

      await tx.admission.update({
        where: {
          id: admission.id,
        },
        data: {
          remarks: buildConvertedRemark(admission.remarks, createdStudent.id),
          processed_by: user.id,
          updated_at: new Date(),
        },
      })
    })
  } catch (transactionError) {
    if (
      transactionError instanceof Prisma.PrismaClientKnownRequestError &&
      transactionError.code === 'P2002'
    ) {
      return errorResponse('DUPLICATE_RECORD', 'Generated record conflicted with an existing record', 409)
    }

    if (
      transactionError instanceof Error &&
      transactionError.message === 'ADMISSION_NUMBER_GENERATION_FAILED'
    ) {
      return errorResponse('INTERNAL_SERVER_ERROR', 'Unable to generate unique admission number', 500)
    }

    return errorResponse('INTERNAL_SERVER_ERROR', 'Failed to convert admission to student', 500)
  }

  await createAuditLog({
    school_id: user.schoolId,
    user_id: user.id,
    action: 'CREATE',
    entity_type: 'student',
    entity_id: createdStudentId,
    new_value: {
      admission_number: admissionNumber,
      class_id: targetClass.id,
      academic_year_id: admission.academic_year_id,
      source_admission_id: admission.id,
    },
    ...getRequestMetadata(request),
  })

  await createAuditLog({
    school_id: user.schoolId,
    user_id: user.id,
    action: 'UPDATE',
    entity_type: 'admission',
    entity_id: admission.id,
    old_value: {
      status: admission.status,
      remarks: admission.remarks,
    },
    new_value: {
      status: admission.status,
      remarks: buildConvertedRemark(admission.remarks, createdStudentId),
      converted_student_id: createdStudentId,
      converted_parent_id: createdParentId,
    },
    ...getRequestMetadata(request),
  })

  return successResponse({
    message: 'Admission converted to student successfully',
    student_id: createdStudentId,
    parent_id: createdParentId,
    admission_number: admissionNumber,
    class_id: targetClass.id,
    class_name: `${targetClass.name}${targetClass.section ? ` - ${targetClass.section}` : ''}`,
  })
}
