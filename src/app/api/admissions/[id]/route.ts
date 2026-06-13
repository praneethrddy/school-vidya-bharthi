import { Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import {
  errorResponse,
  forbiddenResponse,
  successResponse,
  unauthorizedResponse,
} from '@/lib/api-helpers'
import {
  buildAdmissionTimeline,
  getRequestMetadata,
  updateAdmissionSchema,
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

type PermissionCheckResult =
  | { error: NextResponse; user: null }
  | { error: null; user: SchoolSessionUser }

async function requirePermission(permissionCode: string): Promise<PermissionCheckResult> {
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

async function loadAdmissionWithActors(schoolId: string, id: string) {
  return prisma.admission.findFirst({
    where: {
      id,
      school_id: schoolId,
    },
    include: {
      processor: {
        select: {
          id: true,
          email: true,
        },
      },
      decider: {
        select: {
          id: true,
          email: true,
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
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const permissionCheck = await requirePermission('ADMISSIONS.view')
  if (permissionCheck.error) {
    return permissionCheck.error
  }

  const user = permissionCheck.user
  const { id } = await params

  const admission = await loadAdmissionWithActors(user.schoolId, id)
  if (!admission) {
    return errorResponse('NOT_FOUND', 'Admission application not found', 404)
  }

  const logs = await prisma.auditLog.findMany({
    where: {
      school_id: user.schoolId,
      entity_type: 'admission',
      entity_id: id,
    },
    orderBy: {
      created_at: 'asc',
    },
    select: {
      id: true,
      user_id: true,
      old_value: true,
      new_value: true,
      created_at: true,
    },
  })

  return successResponse({
    id: admission.id,
    academic_year_id: admission.academic_year_id,
    academic_year_name: admission.academic_year?.name || null,
    applicant_name: admission.applicant_name,
    date_of_birth: admission.date_of_birth.toISOString(),
    gender: admission.gender,
    applying_for_class: admission.applying_for_class,
    parent_name: admission.parent_name,
    parent_phone: admission.parent_phone,
    parent_email: admission.parent_email,
    address: admission.address,
    previous_school: admission.previous_school,
    status: admission.status,
    processed_by: admission.processed_by,
    processed_by_email: admission.processor?.email || null,
    decided_by: admission.decided_by,
    decided_by_email: admission.decider?.email || null,
    decided_at: admission.decided_at?.toISOString() || null,
    remarks: admission.remarks,
    documents_url: admission.documents_url || [],
    applied_at: admission.applied_at?.toISOString() || admission.created_at.toISOString(),
    created_at: admission.created_at.toISOString(),
    updated_at: admission.updated_at.toISOString(),
    timeline: buildAdmissionTimeline(logs),
  })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const permissionCheck = await requirePermission('ADMISSIONS.process')
  if (permissionCheck.error) {
    return permissionCheck.error
  }

  const user = permissionCheck.user
  const { id } = await params

  const payload = await request.json().catch(() => null)
  const parsedBody = updateAdmissionSchema.safeParse(payload)

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
  })

  if (!existing) {
    return errorResponse('NOT_FOUND', 'Admission application not found', 404)
  }

  const input = parsedBody.data
  const updateData: Prisma.AdmissionUncheckedUpdateInput = {
    updated_at: new Date(),
  }

  if (input.applicant_name !== undefined) updateData.applicant_name = input.applicant_name
  if (input.date_of_birth !== undefined) updateData.date_of_birth = input.date_of_birth
  if (input.gender !== undefined) updateData.gender = input.gender
  if (input.applying_for_class !== undefined) updateData.applying_for_class = input.applying_for_class
  if (input.parent_name !== undefined) updateData.parent_name = input.parent_name
  if (input.parent_phone !== undefined) updateData.parent_phone = input.parent_phone
  if (input.parent_email !== undefined) updateData.parent_email = input.parent_email
  if (input.address !== undefined) updateData.address = input.address
  if (input.previous_school !== undefined) updateData.previous_school = input.previous_school
  if (input.remarks !== undefined) updateData.remarks = input.remarks
  if (input.documents_url !== undefined) updateData.documents_url = input.documents_url

  const updated = await prisma.admission.update({
    where: {
      id,
    },
    data: updateData,
  })

  await createAuditLog({
    school_id: user.schoolId,
    user_id: user.id,
    action: 'UPDATE',
    entity_type: 'admission',
    entity_id: id,
    old_value: {
      applicant_name: existing.applicant_name,
      date_of_birth: existing.date_of_birth,
      gender: existing.gender,
      applying_for_class: existing.applying_for_class,
      parent_name: existing.parent_name,
      parent_phone: existing.parent_phone,
      parent_email: existing.parent_email,
      address: existing.address,
      previous_school: existing.previous_school,
      remarks: existing.remarks,
      documents_url: existing.documents_url,
    },
    new_value: {
      applicant_name: updated.applicant_name,
      date_of_birth: updated.date_of_birth,
      gender: updated.gender,
      applying_for_class: updated.applying_for_class,
      parent_name: updated.parent_name,
      parent_phone: updated.parent_phone,
      parent_email: updated.parent_email,
      address: updated.address,
      previous_school: updated.previous_school,
      remarks: updated.remarks,
      documents_url: updated.documents_url,
    },
    ...getRequestMetadata(request),
  })

  return successResponse({
    id: updated.id,
    applicant_name: updated.applicant_name,
    date_of_birth: updated.date_of_birth.toISOString(),
    gender: updated.gender,
    applying_for_class: updated.applying_for_class,
    parent_name: updated.parent_name,
    parent_phone: updated.parent_phone,
    parent_email: updated.parent_email,
    address: updated.address,
    previous_school: updated.previous_school,
    remarks: updated.remarks,
    documents_url: updated.documents_url || [],
    status: updated.status,
    updated_at: updated.updated_at.toISOString(),
  })
}
