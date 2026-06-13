import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { createAuditLog } from '@/lib/audit'
import { hasPermission } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import {
  addAssignmentSchema,
  removeAssignmentSchema,
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
  const assignments = await prisma.subjectAssignment.findMany({
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
  })

  return NextResponse.json({
    data: assignments.map((assignment) => ({
      ...assignment,
      created_at: assignment.created_at.toISOString(),
    })),
  })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const permissionCheck = await requireSchoolPermission('STAFF.edit')
  if (permissionCheck.error) {
    return permissionCheck.error
  }
  const user = permissionCheck.user

  const { id } = await params
  const parsedBody = addAssignmentSchema.safeParse(await request.json())
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
  const [staff, subject, academicYear] = await prisma.$transaction([
    prisma.staff.findFirst({
      where: {
        school_id: user.schoolId,
        id,
      },
      select: {
        id: true,
      },
    }),
    prisma.subject.findFirst({
      where: {
        school_id: user.schoolId,
        id: payload.subject_id,
      },
      select: {
        id: true,
      },
    }),
    prisma.academicYear.findFirst({
      where: {
        school_id: user.schoolId,
        id: payload.academic_year_id,
      },
      select: {
        id: true,
      },
    }),
  ])

  if (!staff) {
    return NextResponse.json({ error: 'Staff member not found' }, { status: 404 })
  }

  if (!subject) {
    return NextResponse.json({ error: 'Subject not found' }, { status: 404 })
  }

  if (!academicYear) {
    return NextResponse.json({ error: 'Academic year not found' }, { status: 404 })
  }

  const duplicate = await prisma.subjectAssignment.findFirst({
    where: {
      school_id: user.schoolId,
      staff_id: id,
      subject_id: payload.subject_id,
      academic_year_id: payload.academic_year_id,
    },
    select: {
      id: true,
    },
  })

  if (duplicate) {
    return NextResponse.json({ error: 'Subject assignment already exists' }, { status: 409 })
  }

  const assignment = await prisma.subjectAssignment.create({
    data: {
      school_id: user.schoolId,
      staff_id: id,
      subject_id: payload.subject_id,
      academic_year_id: payload.academic_year_id,
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
  })

  await createAuditLog({
    school_id: user.schoolId,
    user_id: user.id,
    action: 'CREATE',
    entity_type: 'subject_assignment',
    entity_id: assignment.id,
    new_value: {
      staff_id: id,
      subject_id: payload.subject_id,
      academic_year_id: payload.academic_year_id,
    },
    ...requestMetadata(request),
  })

  return NextResponse.json(
    {
      data: {
        ...assignment,
        created_at: assignment.created_at.toISOString(),
      },
    },
    { status: 201 }
  )
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const permissionCheck = await requireSchoolPermission('STAFF.edit')
  if (permissionCheck.error) {
    return permissionCheck.error
  }
  const user = permissionCheck.user

  const { id } = await params
  const parsedBody = removeAssignmentSchema.safeParse(await request.json())
  if (!parsedBody.success) {
    return NextResponse.json(
      {
        error: 'Validation failed',
        details: parsedBody.error.issues,
      },
      { status: 400 }
    )
  }

  const existingAssignment = await prisma.subjectAssignment.findFirst({
    where: {
      id: parsedBody.data.assignment_id,
      school_id: user.schoolId,
      staff_id: id,
    },
  })

  if (!existingAssignment) {
    return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
  }

  await prisma.subjectAssignment.delete({
    where: {
      id: existingAssignment.id,
    },
  })

  await createAuditLog({
    school_id: user.schoolId,
    user_id: user.id,
    action: 'DELETE',
    entity_type: 'subject_assignment',
    entity_id: existingAssignment.id,
    old_value: {
      staff_id: existingAssignment.staff_id,
      subject_id: existingAssignment.subject_id,
      academic_year_id: existingAssignment.academic_year_id,
    },
    ...requestMetadata(request),
  })

  return NextResponse.json({ success: true })
}

