import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { createAuditLog } from '@/lib/audit'
import { hasPermission } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { classTeacherSchema } from '@/lib/staff-management'

interface SessionUser {
  id: string
  role: string
  schoolId: string | null
}

interface SchoolSessionUser extends SessionUser {
  schoolId: string
}

async function requireSchoolPermission(): Promise<
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

  const [hasStaffEdit, hasTimetableCreate] = await Promise.all([
    hasPermission(user.schoolId, user.role, 'STAFF.edit'),
    hasPermission(user.schoolId, user.role, 'TIMETABLE.create'),
  ])

  if (!hasStaffEdit && !hasTimetableCreate) {
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const permissionCheck = await requireSchoolPermission()
  if (permissionCheck.error) {
    return permissionCheck.error
  }
  const user = permissionCheck.user

  const { id } = await params
  const parsedBody = classTeacherSchema.safeParse(await request.json())
  if (!parsedBody.success) {
    return NextResponse.json(
      {
        error: 'Validation failed',
        details: parsedBody.error.issues,
      },
      { status: 400 }
    )
  }

  const staff = await prisma.staff.findFirst({
    where: {
      school_id: user.schoolId,
      id,
    },
    select: {
      id: true,
      first_name: true,
      last_name: true,
    },
  })

  if (!staff) {
    return NextResponse.json({ error: 'Staff member not found' }, { status: 404 })
  }

  const { class_id: classId } = parsedBody.data

  if (!classId) {
    const currentClasses = await prisma.class.findMany({
      where: {
        school_id: user.schoolId,
        class_teacher_id: id,
      },
      select: {
        id: true,
      },
    })

    if (currentClasses.length === 0) {
      return NextResponse.json({
        data: {
          removed_count: 0,
        },
      })
    }

    const updateResult = await prisma.class.updateMany({
      where: {
        school_id: user.schoolId,
        class_teacher_id: id,
      },
      data: {
        class_teacher_id: null,
      },
    })

    await createAuditLog({
      school_id: user.schoolId,
      user_id: user.id,
      action: 'UPDATE',
      entity_type: 'class',
      entity_id: currentClasses[0]?.id,
      old_value: {
        class_teacher_id: id,
        class_ids: currentClasses.map((entry) => entry.id),
      },
      new_value: {
        class_teacher_id: null,
        removed_count: updateResult.count,
      },
      ...requestMetadata(request),
    })

    return NextResponse.json({
      data: {
        removed_count: updateResult.count,
      },
    })
  }

  const existingClass = await prisma.class.findFirst({
    where: {
      school_id: user.schoolId,
      id: classId,
    },
    select: {
      id: true,
      name: true,
      section: true,
      class_teacher_id: true,
    },
  })

  if (!existingClass) {
    return NextResponse.json({ error: 'Class not found' }, { status: 404 })
  }

  const updatedClass = await prisma.class.update({
    where: {
      id: classId,
    },
    data: {
      class_teacher_id: id,
    },
    select: {
      id: true,
      name: true,
      section: true,
      class_teacher_id: true,
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
    entity_type: 'class',
    entity_id: classId,
    old_value: {
      class_teacher_id: existingClass.class_teacher_id,
    },
    new_value: {
      class_teacher_id: id,
      staff_name: `${staff.first_name} ${staff.last_name}`,
    },
    ...requestMetadata(request),
  })

  return NextResponse.json({
    data: updatedClass,
  })
}

