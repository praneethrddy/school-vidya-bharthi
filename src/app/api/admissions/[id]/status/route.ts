import { AdmissionStatus } from '@prisma/client'
import { NextRequest } from 'next/server'
import {
  errorResponse,
  forbiddenResponse,
  successResponse,
  unauthorizedResponse,
} from '@/lib/api-helpers'
import {
  getRequestMetadata,
  getStatusTransitionRule,
  isPrincipalRole,
  updateAdmissionStatusSchema,
  validateAdmissionTransition,
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

async function createStatusNotifications(params: {
  schoolId: string
  actorId: string
  applicantName: string
  admissionId: string
  fromStatus: AdmissionStatus
  toStatus: AdmissionStatus
}) {
  const recipients = await prisma.user.findMany({
    where: {
      school_id: params.schoolId,
      is_active: true,
      role: {
        in: ['PRINCIPAL', 'STUDENT_ADMIN'],
      },
      id: {
        not: params.actorId,
      },
    },
    select: {
      id: true,
    },
  })

  if (recipients.length === 0) {
    return
  }

  await prisma.notification.createMany({
    data: recipients.map((recipient) => ({
      school_id: params.schoolId,
      user_id: recipient.id,
      title: 'Admissions status updated',
      message: `${params.applicantName} moved from ${params.fromStatus} to ${params.toStatus}.`,
      type: 'GENERAL',
      link: `/admin/admissions?application_id=${params.admissionId}`,
    })),
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessionCheck = await requireSchoolUser()
  if (sessionCheck.error) {
    return sessionCheck.error
  }

  const user = sessionCheck.user
  const { id } = await params
  const payload = await request.json().catch(() => null)
  const parsedBody = updateAdmissionStatusSchema.safeParse(payload)

  if (!parsedBody.success) {
    return errorResponse(
      'VALIDATION_ERROR',
      parsedBody.error.issues[0]?.message || 'Invalid request payload',
      400
    )
  }

  const existing = await prisma.admission.findFirst({
    where: {
      id,
      school_id: user.schoolId,
    },
    select: {
      id: true,
      applicant_name: true,
      status: true,
      remarks: true,
      processed_by: true,
      decided_by: true,
      decided_at: true,
    },
  })

  if (!existing) {
    return errorResponse('NOT_FOUND', 'Admission application not found', 404)
  }

  const nextStatus = parsedBody.data.status
  const transitionValidation = validateAdmissionTransition(existing.status, nextStatus)
  if (!transitionValidation.valid) {
    return errorResponse('INVALID_STATUS_TRANSITION', transitionValidation.error || 'Invalid transition', 400)
  }

  const transitionRule = getStatusTransitionRule(existing.status, nextStatus)
  if (!transitionRule) {
    return errorResponse(
      'INVALID_STATUS_TRANSITION',
      `Cannot change from ${existing.status} to ${nextStatus}`,
      400
    )
  }

  if (transitionRule.principalOnly && !isPrincipalRole(user.role)) {
    return forbiddenResponse('Only Principal can admit or reject')
  }

  const hasTransitionPermission = await hasPermission(user.schoolId, user.role, transitionRule.permission)
  if (!hasTransitionPermission) {
    return forbiddenResponse(`Missing permission: ${transitionRule.permission}`)
  }

  if (!transitionRule.principalOnly) {
    const hasProcessPermission = await hasPermission(user.schoolId, user.role, 'ADMISSIONS.process')
    if (!hasProcessPermission) {
      return forbiddenResponse('Missing permission: ADMISSIONS.process')
    }
  }

  const updateData: {
    status: AdmissionStatus
    remarks: string | null
    processed_by?: string
    decided_by?: string
    decided_at?: Date
    updated_at: Date
  } = {
    status: nextStatus,
    remarks: parsedBody.data.remarks === undefined ? existing.remarks : parsedBody.data.remarks,
    updated_at: new Date(),
  }

  if (transitionRule.setsDecision) {
    updateData.decided_by = user.id
    updateData.decided_at = new Date()
  } else {
    updateData.processed_by = user.id
  }

  const updated = await prisma.admission.update({
    where: {
      id: existing.id,
    },
    data: updateData,
  })

  await createAuditLog({
    school_id: user.schoolId,
    user_id: user.id,
    action: 'UPDATE',
    entity_type: 'admission',
    entity_id: existing.id,
    old_value: {
      status: existing.status,
      remarks: existing.remarks,
      processed_by: existing.processed_by,
      decided_by: existing.decided_by,
      decided_at: existing.decided_at,
    },
    new_value: {
      status: updated.status,
      remarks: updated.remarks,
      processed_by: updated.processed_by,
      decided_by: updated.decided_by,
      decided_at: updated.decided_at,
    },
    ...getRequestMetadata(request),
  })

  await createStatusNotifications({
    schoolId: user.schoolId,
    actorId: user.id,
    applicantName: existing.applicant_name,
    admissionId: existing.id,
    fromStatus: existing.status,
    toStatus: updated.status,
  })

  return successResponse({
    id: updated.id,
    status: updated.status,
    remarks: updated.remarks,
    processed_by: updated.processed_by,
    decided_by: updated.decided_by,
    decided_at: updated.decided_at?.toISOString() || null,
    updated_at: updated.updated_at.toISOString(),
  })
}
