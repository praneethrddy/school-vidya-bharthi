import bcrypt from 'bcryptjs'
import { Role } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { createAuditLog } from '@/lib/audit'
import { hasPermission } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import {
  createStaffAccountSchema,
  resetStaffAccountPasswordSchema,
} from '@/lib/staff-management'
import { generatePassword } from '@/lib/utils'

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
  const parsedBody = createStaffAccountSchema.safeParse(await request.json())
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
  const normalizedEmail = payload.email.trim().toLowerCase()

  const staff = await prisma.staff.findFirst({
    where: {
      school_id: user.schoolId,
      id,
    },
    select: {
      id: true,
      user_id: true,
      first_name: true,
      last_name: true,
    },
  })

  if (!staff) {
    return NextResponse.json({ error: 'Staff member not found' }, { status: 404 })
  }

  if (staff.user_id) {
    return NextResponse.json(
      { error: 'This staff member already has a login account' },
      { status: 409 }
    )
  }

  const duplicateEmail = await prisma.user.findFirst({
    where: {
      school_id: user.schoolId,
      email: normalizedEmail,
    },
    select: {
      id: true,
    },
  })

  if (duplicateEmail) {
    return NextResponse.json({ error: 'Email already in use' }, { status: 409 })
  }

  const rawPassword =
    payload.auto_generate_password || !payload.password
      ? generatePassword(12)
      : payload.password
  const generatedPassword =
    payload.auto_generate_password || !payload.password ? rawPassword : null

  const createdUser = await prisma.$transaction(async (transaction) => {
    const userRecord = await transaction.user.create({
      data: {
        school_id: user.schoolId,
        email: normalizedEmail,
        password_hash: await bcrypt.hash(rawPassword, 12),
        role: payload.role as Role,
        is_active: true,
      },
      select: {
        id: true,
        email: true,
        role: true,
        is_active: true,
      },
    })

    await transaction.staff.update({
      where: {
        id: staff.id,
      },
      data: {
        user_id: userRecord.id,
      },
    })

    return userRecord
  })

  await createAuditLog({
    school_id: user.schoolId,
    user_id: user.id,
    action: 'UPDATE',
    entity_type: 'staff',
    entity_id: staff.id,
    old_value: {
      user_id: null,
    },
    new_value: {
      user_id: createdUser.id,
      role: createdUser.role,
      email: createdUser.email,
    },
    ...requestMetadata(request),
  })

  return NextResponse.json(
    {
      data: createdUser,
      generatedPassword,
    },
    { status: 201 }
  )
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
  const parsedBody = resetStaffAccountPasswordSchema.safeParse(await request.json())
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
        },
      },
    },
  })

  if (!staff) {
    return NextResponse.json({ error: 'Staff member not found' }, { status: 404 })
  }

  if (!staff.user) {
    return NextResponse.json({ error: 'No user account exists for this staff member' }, { status: 404 })
  }

  const rawPassword =
    payload.auto_generate_password || !payload.password
      ? generatePassword(12)
      : payload.password
  const generatedPassword =
    payload.auto_generate_password || !payload.password ? rawPassword : null

  await prisma.user.update({
    where: {
      id: staff.user.id,
    },
    data: {
      password_hash: await bcrypt.hash(rawPassword, 12),
      failed_login_count: 0,
      locked_until: null,
    },
  })

  await createAuditLog({
    school_id: user.schoolId,
    user_id: user.id,
    action: 'UPDATE',
    entity_type: 'user',
    entity_id: staff.user.id,
    old_value: {
      password_reset: false,
    },
    new_value: {
      password_reset: true,
      for_staff_id: staff.id,
      role: staff.user.role,
      email: staff.user.email,
    },
    ...requestMetadata(request),
  })

  return NextResponse.json({
    data: {
      user_id: staff.user.id,
      password_reset: true,
    },
    generatedPassword,
  })
}

