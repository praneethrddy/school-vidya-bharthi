import { type Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { createAuditLog } from '@/lib/audit'
import { hasPermission } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import {
  sanitizeStaffAuditSnapshot,
  updateStaffSchema,
} from '@/lib/staff-management'

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

function requestMetadata(request: NextRequest) {
  const forwardedFor = request.headers.get('x-forwarded-for')
  return {
    ip_address: forwardedFor ? forwardedFor.split(',')[0].trim() : undefined,
    user_agent: request.headers.get('user-agent') ?? undefined,
  }
}

function mapActivityEntry(
  row: Prisma.AuditLogGetPayload<{
    include: {
      user: {
        select: {
          email: true
          role: true
        }
      }
    }
  }>
) {
  return {
    id: row.id,
    action: row.action,
    entity_type: row.entity_type,
    entity_id: row.entity_id,
    old_value: row.old_value,
    new_value: row.new_value,
    actor_email: row.user.email,
    actor_role: row.user.role,
    created_at: row.created_at.toISOString(),
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const permissionCheck = await requireSchoolPermission('STAFF.view')
  if (permissionCheck.error) {
    return permissionCheck.error
  }
  const user = permissionCheck.user

  const { id } = await params
  const staff = await prisma.staff.findFirst({
    where: {
      school_id: user.schoolId,
      id,
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          role: true,
          is_active: true,
          last_login: true,
        },
      },
    },
  })

  if (!staff) {
    return NextResponse.json({ error: 'Staff member not found' }, { status: 404 })
  }

  const [assignments, classesTaught, attendanceByStatus, attendanceTotal, activity, classes, subjects, academicYears] =
    await prisma.$transaction([
      prisma.subjectAssignment.findMany({
        where: {
          school_id: user.schoolId,
          staff_id: id,
        },
        include: {
          subject: {
            include: {
              class: {
                select: {
                  id: true,
                  name: true,
                  section: true,
                },
              },
            },
          },
          academic_year: {
            select: {
              id: true,
              name: true,
              is_current: true,
            },
          },
        },
        orderBy: {
          created_at: 'desc',
        },
      }),
      prisma.class.findMany({
        where: {
          school_id: user.schoolId,
          class_teacher_id: id,
        },
        include: {
          academic_year: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: [{ name: 'asc' }, { section: 'asc' }],
      }),
      prisma.staffAttendance.groupBy({
        by: ['status'],
        where: {
          school_id: user.schoolId,
          staff_id: id,
        },
        orderBy: {
          status: 'asc',
        },
        _count: {
          _all: true,
        },
      }),
      prisma.staffAttendance.count({
        where: {
          school_id: user.schoolId,
          staff_id: id,
        },
      }),
      prisma.auditLog.findMany({
        where: {
          school_id: user.schoolId,
          OR: [
            {
              entity_type: 'staff',
              entity_id: id,
            },
            {
              entity_type: 'subject_assignment',
              OR: [
                {
                  new_value: {
                    path: ['staff_id'],
                    equals: id,
                  },
                },
                {
                  old_value: {
                    path: ['staff_id'],
                    equals: id,
                  },
                },
              ],
            },
            {
              entity_type: 'class',
              OR: [
                {
                  new_value: {
                    path: ['class_teacher_id'],
                    equals: id,
                  },
                },
                {
                  old_value: {
                    path: ['class_teacher_id'],
                    equals: id,
                  },
                },
              ],
            },
          ],
        },
        include: {
          user: {
            select: {
              email: true,
              role: true,
            },
          },
        },
        orderBy: {
          created_at: 'desc',
        },
        take: 50,
      }),
      prisma.class.findMany({
        where: {
          school_id: user.schoolId,
        },
        select: {
          id: true,
          name: true,
          section: true,
          class_teacher_id: true,
          academic_year_id: true,
          academic_year: {
            select: {
              id: true,
              name: true,
              is_current: true,
            },
          },
        },
        orderBy: [{ name: 'asc' }, { section: 'asc' }],
      }),
      prisma.subject.findMany({
        where: {
          school_id: user.schoolId,
        },
        select: {
          id: true,
          name: true,
          code: true,
          class_id: true,
          periods_per_week: true,
          class: {
            select: {
              id: true,
              name: true,
              section: true,
            },
          },
        },
        orderBy: [{ name: 'asc' }],
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

  const attendanceSummary = attendanceByStatus.reduce<Record<string, number>>((acc, row) => {
    const countMeta = row._count
    let count = 0
    if (typeof countMeta === 'number') {
      count = countMeta
    } else if (countMeta && countMeta !== true) {
      count = countMeta._all ?? 0
    }

    acc[row.status] = count
    return acc
  }, {})

  return NextResponse.json({
    data: {
      staff: {
        ...staff,
        created_at: staff.created_at.toISOString(),
        updated_at: staff.updated_at.toISOString(),
      },
      assignments: assignments.map((row) => ({
        ...row,
        created_at: row.created_at.toISOString(),
      })),
      classes_taught: classesTaught.map((row) => ({
        ...row,
        created_at: row.created_at.toISOString(),
        updated_at: row.updated_at.toISOString(),
      })),
      attendance_summary: {
        total_records: attendanceTotal,
        present: attendanceSummary.PRESENT ?? 0,
        absent: attendanceSummary.ABSENT ?? 0,
        late: attendanceSummary.LATE ?? 0,
        half_day: attendanceSummary.HALF_DAY ?? 0,
        leave: attendanceSummary.LEAVE ?? 0,
      },
      activity: activity.map(mapActivityEntry),
      lookups: {
        classes,
        subjects,
        academic_years: academicYears,
      },
    },
  })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const permissionCheck = await requireSchoolPermission('STAFF.edit')
  if (permissionCheck.error) {
    return permissionCheck.error
  }
  const user = permissionCheck.user

  const { id } = await params
  const parsedBody = updateStaffSchema.safeParse(await request.json())
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
  const existingStaff = await prisma.staff.findFirst({
    where: {
      school_id: user.schoolId,
      id,
    },
  })

  if (!existingStaff) {
    return NextResponse.json({ error: 'Staff member not found' }, { status: 404 })
  }

  if (
    payload.employee_code &&
    payload.employee_code !== existingStaff.employee_code
  ) {
    const duplicateCode = await prisma.staff.findFirst({
      where: {
        school_id: user.schoolId,
        employee_code: payload.employee_code,
        id: {
          not: id,
        },
      },
      select: {
        id: true,
      },
    })

    if (duplicateCode) {
      return NextResponse.json({ error: 'Employee code already exists' }, { status: 409 })
    }
  }

  const updateData: Prisma.StaffUncheckedUpdateInput = {}
  if (payload.employee_code !== undefined) updateData.employee_code = payload.employee_code
  if (payload.first_name !== undefined) updateData.first_name = payload.first_name
  if (payload.last_name !== undefined) updateData.last_name = payload.last_name
  if (payload.gender !== undefined) updateData.gender = payload.gender
  if (payload.date_of_birth !== undefined) {
    updateData.date_of_birth = payload.date_of_birth ? new Date(payload.date_of_birth) : null
  }
  if (payload.phone !== undefined) updateData.phone = payload.phone
  if (payload.address !== undefined) updateData.address = payload.address
  if (payload.photo_url !== undefined) updateData.photo_url = payload.photo_url
  if (payload.designation !== undefined) updateData.designation = payload.designation
  if (payload.department !== undefined) updateData.department = payload.department
  if (payload.date_of_joining !== undefined) {
    updateData.date_of_joining = payload.date_of_joining
      ? new Date(payload.date_of_joining)
      : null
  }
  if (payload.qualification !== undefined) updateData.qualification = payload.qualification
  if (payload.is_active !== undefined) updateData.is_active = payload.is_active

  const updatedStaff = await prisma.staff.update({
    where: {
      id,
    },
    data: updateData,
  })

  await createAuditLog({
    school_id: user.schoolId,
    user_id: user.id,
    action: 'UPDATE',
    entity_type: 'staff',
    entity_id: id,
    old_value: sanitizeStaffAuditSnapshot({
      employee_code: existingStaff.employee_code,
      first_name: existingStaff.first_name,
      last_name: existingStaff.last_name,
      gender: existingStaff.gender,
      phone: existingStaff.phone,
      address: existingStaff.address,
      designation: existingStaff.designation,
      department: existingStaff.department,
      date_of_joining: existingStaff.date_of_joining,
      qualification: existingStaff.qualification,
      is_active: existingStaff.is_active,
    }),
    new_value: sanitizeStaffAuditSnapshot({
      employee_code: updatedStaff.employee_code,
      first_name: updatedStaff.first_name,
      last_name: updatedStaff.last_name,
      gender: updatedStaff.gender,
      phone: updatedStaff.phone,
      address: updatedStaff.address,
      designation: updatedStaff.designation,
      department: updatedStaff.department,
      date_of_joining: updatedStaff.date_of_joining,
      qualification: updatedStaff.qualification,
      is_active: updatedStaff.is_active,
    }),
    ...requestMetadata(request),
  })

  return NextResponse.json({
    data: {
      ...updatedStaff,
      created_at: updatedStaff.created_at.toISOString(),
      updated_at: updatedStaff.updated_at.toISOString(),
    },
  })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = session.user as SessionUser
  if (!user.schoolId) {
    return NextResponse.json({ error: 'School context is required' }, { status: 400 })
  }

  const hasDeletePermission = await hasPermission(user.schoolId, user.role, 'STAFF.delete')
  if (!hasDeletePermission || user.role !== 'PRINCIPAL') {
    return NextResponse.json(
      { error: 'Forbidden. Only Principal can deactivate staff.' },
      { status: 403 }
    )
  }

  const { id } = await params
  const existingStaff = await prisma.staff.findFirst({
    where: {
      school_id: user.schoolId,
      id,
    },
  })

  if (!existingStaff) {
    return NextResponse.json({ error: 'Staff member not found' }, { status: 404 })
  }

  if (existingStaff.user_id === user.id) {
    return NextResponse.json({ error: 'Cannot deactivate yourself' }, { status: 400 })
  }

  if (existingStaff.user_id) {
    const linkedUser = await prisma.user.findFirst({
      where: {
        school_id: user.schoolId,
        id: existingStaff.user_id,
      },
      select: {
        id: true,
        role: true,
      },
    })

    if (linkedUser?.role === 'PRINCIPAL') {
      const activePrincipals = await prisma.user.count({
        where: {
          school_id: user.schoolId,
          role: 'PRINCIPAL',
          is_active: true,
        },
      })

      if (activePrincipals <= 1) {
        return NextResponse.json(
          { error: 'Cannot deactivate the last active Principal account.' },
          { status: 400 }
        )
      }
    }
  }

  await prisma.$transaction(async (transaction) => {
    await transaction.staff.update({
      where: {
        id,
      },
      data: {
        is_active: false,
      },
    })

    if (existingStaff.user_id) {
      await transaction.user.update({
        where: {
          id: existingStaff.user_id,
        },
        data: {
          is_active: false,
        },
      })
    }
  })

  await createAuditLog({
    school_id: user.schoolId,
    user_id: user.id,
    action: 'DELETE',
    entity_type: 'staff',
    entity_id: id,
    old_value: {
      is_active: existingStaff.is_active,
      user_id: existingStaff.user_id,
    },
    new_value: {
      is_active: false,
      linked_user_deactivated: Boolean(existingStaff.user_id),
    },
    ...requestMetadata(request),
  })

  return NextResponse.json({
    data: {
      id: existingStaff.id,
      is_active: false,
      message: `${existingStaff.first_name} ${existingStaff.last_name} has been deactivated`,
    },
  })
}
