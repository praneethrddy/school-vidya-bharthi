import { Prisma } from '@prisma/client'
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
  getRequestMetadata,
  isPrincipalRole,
  updateStudentSchema,
} from '@/lib/student-management'

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

async function loadStudentWithRelations(schoolId: string, studentId: string) {
  return prisma.student.findFirst({
    where: {
      school_id: schoolId,
      id: studentId,
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
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const permissionCheck = await requirePermission('STUDENTS.view')
  if (permissionCheck.error) {
    return permissionCheck.error
  }
  const user = permissionCheck.user

  const { id } = await params
  const student = await loadStudentWithRelations(user.schoolId, id)
  if (!student) {
    return errorResponse('NOT_FOUND', 'Student not found', 404)
  }

  const [
    attendanceByStatus,
    attendanceTotal,
    gradeAverageAggregate,
    gradeCount,
    gradeExams,
    feeSumAggregate,
    feePaymentCount,
    latestPayment,
    activity,
  ] = await prisma.$transaction([
    prisma.attendance.groupBy({
      by: ['status'],
      where: {
        school_id: user.schoolId,
        student_id: id,
      },
      orderBy: {
        status: 'asc',
      },
      _count: {
        _all: true,
      },
    }),
    prisma.attendance.count({
      where: {
        school_id: user.schoolId,
        student_id: id,
      },
    }),
    prisma.grade.aggregate({
      where: {
        school_id: user.schoolId,
        student_id: id,
      },
      _avg: {
        marks_obtained: true,
      },
    }),
    prisma.grade.count({
      where: {
        school_id: user.schoolId,
        student_id: id,
      },
    }),
    prisma.grade.findMany({
      where: {
        school_id: user.schoolId,
        student_id: id,
      },
      select: {
        exam_id: true,
      },
      distinct: ['exam_id'],
    }),
    prisma.feePayment.aggregate({
      where: {
        school_id: user.schoolId,
        student_id: id,
      },
      _sum: {
        amount_paid: true,
      },
    }),
    prisma.feePayment.count({
      where: {
        school_id: user.schoolId,
        student_id: id,
      },
    }),
    prisma.feePayment.findFirst({
      where: {
        school_id: user.schoolId,
        student_id: id,
      },
      orderBy: {
        payment_date: 'desc',
      },
      select: {
        payment_date: true,
        amount_paid: true,
        receipt_number: true,
      },
    }),
    prisma.auditLog.findMany({
      where: {
        school_id: user.schoolId,
        entity_type: 'student',
        entity_id: id,
      },
      orderBy: {
        created_at: 'desc',
      },
      take: 50,
      select: {
        id: true,
        action: true,
        old_value: true,
        new_value: true,
        created_at: true,
        user: {
          select: {
            email: true,
            role: true,
          },
        },
      },
    }),
  ])

  const attendanceSummary = attendanceByStatus.reduce<Record<string, number>>(
    (accumulator, record) => {
      const countMeta = record._count
      let count = 0
      if (typeof countMeta === 'number') {
        count = countMeta
      } else if (countMeta && countMeta !== true) {
        count = countMeta._all ?? 0
      }
      accumulator[record.status] = count
      return accumulator
    },
    {}
  )

  return successResponse({
    student: mapStudentDetail(student),
    summaries: {
      attendance: {
        total_records: attendanceTotal,
        present: attendanceSummary.PRESENT || 0,
        absent: attendanceSummary.ABSENT || 0,
        late: attendanceSummary.LATE || 0,
        half_day: attendanceSummary.HALF_DAY || 0,
        holiday: attendanceSummary.HOLIDAY || 0,
      },
      grades: {
        records: gradeCount,
        exams: gradeExams.length,
        average_marks: gradeAverageAggregate._avg.marks_obtained
          ? Number(gradeAverageAggregate._avg.marks_obtained)
          : 0,
      },
      fees: {
        payment_count: feePaymentCount,
        total_paid: feeSumAggregate._sum.amount_paid ? Number(feeSumAggregate._sum.amount_paid) : 0,
        latest_payment: latestPayment
          ? {
              payment_date: latestPayment.payment_date.toISOString(),
              amount_paid: Number(latestPayment.amount_paid),
              receipt_number: latestPayment.receipt_number,
            }
          : null,
      },
    },
    activity: activity.map((entry) => ({
      id: entry.id,
      action: entry.action,
      actor_email: entry.user.email,
      actor_role: entry.user.role,
      old_value: entry.old_value,
      new_value: entry.new_value,
      created_at: entry.created_at.toISOString(),
    })),
  })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const permissionCheck = await requirePermission('STUDENTS.edit')
  if (permissionCheck.error) {
    return permissionCheck.error
  }
  const user = permissionCheck.user

  const { id } = await params
  const parsedBody = updateStudentSchema.safeParse(await request.json())
  if (!parsedBody.success) {
    return errorResponse(
      'VALIDATION_ERROR',
      parsedBody.error.issues[0]?.message || 'Invalid request payload',
      400
    )
  }

  const data = parsedBody.data
  const existingStudent = await prisma.student.findFirst({
    where: {
      id,
      school_id: user.schoolId,
    },
  })

  if (!existingStudent) {
    return errorResponse('NOT_FOUND', 'Student not found', 404)
  }

  if (data.admission_number && data.admission_number !== existingStudent.admission_number) {
    const duplicate = await prisma.student.findFirst({
      where: {
        school_id: user.schoolId,
        admission_number: data.admission_number,
        id: {
          not: id,
        },
      },
      select: {
        id: true,
      },
    })

    if (duplicate) {
      return errorResponse('DUPLICATE_ADMISSION_NUMBER', 'Admission number already exists', 409)
    }
  }

  const nextClassId =
    data.class_id === undefined ? existingStudent.class_id : data.class_id
  const nextAcademicYearId =
    data.academic_year_id === undefined
      ? existingStudent.academic_year_id
      : data.academic_year_id

  if (nextClassId) {
    const classRecord = await prisma.class.findFirst({
      where: {
        id: nextClassId,
        school_id: user.schoolId,
      },
      select: {
        id: true,
        academic_year_id: true,
      },
    })

    if (!classRecord) {
      return errorResponse('INVALID_CLASS', 'Selected class is invalid for this school', 400)
    }

    if (nextAcademicYearId && classRecord.academic_year_id !== nextAcademicYearId) {
      return errorResponse(
        'CLASS_YEAR_MISMATCH',
        'Selected class does not belong to the provided academic year',
        400
      )
    }
  }

  if (nextAcademicYearId) {
    const yearRecord = await prisma.academicYear.findFirst({
      where: {
        id: nextAcademicYearId,
        school_id: user.schoolId,
      },
      select: {
        id: true,
      },
    })

    if (!yearRecord) {
      return errorResponse('INVALID_ACADEMIC_YEAR', 'Academic year is invalid for this school', 400)
    }
  }

  const updateData: Prisma.StudentUncheckedUpdateInput = {}
  if (data.admission_number !== undefined) updateData.admission_number = data.admission_number
  if (data.first_name !== undefined) updateData.first_name = data.first_name
  if (data.last_name !== undefined) updateData.last_name = data.last_name
  if (data.gender !== undefined) updateData.gender = data.gender
  if (data.date_of_birth !== undefined) updateData.date_of_birth = data.date_of_birth
  if (data.blood_group !== undefined) updateData.blood_group = data.blood_group
  if (data.phone !== undefined) updateData.phone = data.phone
  if (data.address !== undefined) updateData.address = data.address
  if (data.emergency_contact_name !== undefined)
    updateData.emergency_contact_name = data.emergency_contact_name
  if (data.emergency_contact_phone !== undefined)
    updateData.emergency_contact_phone = data.emergency_contact_phone
  if (data.photo_url !== undefined) updateData.photo_url = data.photo_url
  if (data.class_id !== undefined) updateData.class_id = data.class_id
  if (data.academic_year_id !== undefined) updateData.academic_year_id = data.academic_year_id
  if (data.admission_date !== undefined) updateData.admission_date = data.admission_date
  if (data.roll_number !== undefined) updateData.roll_number = data.roll_number
  if (data.is_active !== undefined) updateData.is_active = data.is_active

  let linkedParentId: string | null = null
  let parentAction: 'linked' | 'created_and_linked' | null = null

  try {
    await prisma.$transaction(async (transaction) => {
      if (Object.keys(updateData).length > 0) {
        await transaction.student.update({
          where: {
            id,
          },
          data: updateData,
        })
      }

      if (data.parent_link) {
        let parentId = data.parent_link.existing_parent_id
        parentAction = parentId ? 'linked' : 'created_and_linked'

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
        } else if (data.parent_link.create_parent) {
          const createdParent = await transaction.parent.create({
            data: {
              school_id: user.schoolId,
              first_name: data.parent_link.create_parent.first_name,
              last_name: data.parent_link.create_parent.last_name,
              relation: data.parent_link.create_parent.relation ?? null,
              phone: data.parent_link.create_parent.phone,
              alternate_phone: data.parent_link.create_parent.alternate_phone ?? null,
              email: data.parent_link.create_parent.email ?? null,
              occupation: data.parent_link.create_parent.occupation ?? null,
              address: data.parent_link.create_parent.address ?? null,
              photo_url: data.parent_link.create_parent.photo_url ?? null,
            },
            select: {
              id: true,
            },
          })
          parentId = createdParent.id
        }

        if (parentId) {
          linkedParentId = parentId
          const existingLinksCount = await transaction.studentParent.count({
            where: {
              school_id: user.schoolId,
              student_id: id,
            },
          })

          const shouldBePrimary = data.parent_link.is_primary ?? existingLinksCount === 0
          if (shouldBePrimary) {
            await transaction.studentParent.updateMany({
              where: {
                school_id: user.schoolId,
                student_id: id,
              },
              data: {
                is_primary: false,
              },
            })
          }

          const existingLink = await transaction.studentParent.findFirst({
            where: {
              school_id: user.schoolId,
              student_id: id,
              parent_id: parentId,
            },
            select: {
              id: true,
            },
          })

          if (existingLink) {
            await transaction.studentParent.update({
              where: {
                id: existingLink.id,
              },
              data: {
                is_primary: shouldBePrimary,
              },
            })
          } else {
            await transaction.studentParent.create({
              data: {
                school_id: user.schoolId,
                student_id: id,
                parent_id: parentId,
                is_primary: shouldBePrimary,
              },
            })
          }
        }
      }
    })
  } catch (transactionError) {
    if (
      transactionError instanceof Prisma.PrismaClientKnownRequestError &&
      transactionError.code === 'P2002'
    ) {
      return errorResponse('DUPLICATE_RECORD', 'The update conflicts with an existing record', 409)
    }

    if (
      transactionError instanceof Error &&
      transactionError.message === 'INVALID_PARENT_REFERENCE'
    ) {
      return errorResponse('INVALID_PARENT', 'Selected parent does not belong to this school', 400)
    }

    return errorResponse('INTERNAL_SERVER_ERROR', 'Failed to update student', 500)
  }

  const updatedStudent = await loadStudentWithRelations(user.schoolId, id)
  if (!updatedStudent) {
    return errorResponse('NOT_FOUND', 'Student not found after update', 404)
  }

  await createAuditLog({
    school_id: user.schoolId,
    user_id: user.id,
    action: 'UPDATE',
    entity_type: 'student',
    entity_id: id,
    old_value: {
      admission_number: existingStudent.admission_number,
      first_name: existingStudent.first_name,
      last_name: existingStudent.last_name,
      class_id: existingStudent.class_id,
      academic_year_id: existingStudent.academic_year_id,
      is_active: existingStudent.is_active,
    },
    new_value: {
      admission_number: updatedStudent.admission_number,
      first_name: updatedStudent.first_name,
      last_name: updatedStudent.last_name,
      class_id: updatedStudent.class_id,
      academic_year_id: updatedStudent.academic_year_id,
      is_active: updatedStudent.is_active,
      parent_action: parentAction,
      linked_parent_id: linkedParentId,
    },
    ...getRequestMetadata(request),
  })

  return successResponse({
    student: mapStudentDetail(updatedStudent),
  })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return unauthorizedResponse('No valid session')
  }

  const user = session.user as SessionUser
  const schoolId = user.schoolId
  if (!schoolId) {
    return errorResponse('SCHOOL_REQUIRED', 'School context is missing for this account', 400)
  }

  if (!isPrincipalRole(user.role)) {
    return forbiddenResponse('Only PRINCIPAL can deactivate students')
  }

  const { id } = await params
  const existingStudent = await prisma.student.findFirst({
    where: {
      id,
      school_id: schoolId,
    },
    select: {
      id: true,
      is_active: true,
      user_id: true,
      admission_number: true,
      first_name: true,
      last_name: true,
    },
  })

  if (!existingStudent) {
    return errorResponse('NOT_FOUND', 'Student not found', 404)
  }

  await prisma.$transaction(async (transaction) => {
    await transaction.student.update({
      where: {
        id,
      },
      data: {
        is_active: false,
      },
    })

    if (existingStudent.user_id) {
      await transaction.user.update({
        where: {
          id: existingStudent.user_id,
        },
        data: {
          is_active: false,
        },
      })
    }
  })

  await createAuditLog({
    school_id: schoolId,
    user_id: user.id,
    action: 'DELETE',
    entity_type: 'student',
    entity_id: id,
    old_value: {
      is_active: existingStudent.is_active,
      user_id: existingStudent.user_id,
    },
    new_value: {
      is_active: false,
      user_deactivated: Boolean(existingStudent.user_id),
    },
    ...getRequestMetadata(request),
  })

  return successResponse({
    message: `Student ${existingStudent.first_name} ${existingStudent.last_name} has been deactivated`,
  })
}
