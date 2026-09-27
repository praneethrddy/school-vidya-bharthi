import { NextRequest } from 'next/server'
import { createAuditLog } from '@/lib/audit'
import { errorResponse, successResponse } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'
import {
  getRequestMetadata,
  requireSchoolPermission,
} from '@/lib/settings-auth'

function toDateString(date: Date) {
  return date.toISOString().slice(0, 10)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireSchoolPermission('SETTINGS.manage_academic_year')
  if (access.error) {
    return access.error
  }

  const { id } = await params
  const schoolId = access.user.schoolId

  const [targetYear, currentYear] = await Promise.all([
    prisma.academicYear.findFirst({
      where: {
        id,
        school_id: schoolId,
      },
      select: {
        id: true,
        name: true,
        start_date: true,
        end_date: true,
        is_current: true,
      },
    }),
    prisma.academicYear.findFirst({
      where: {
        school_id: schoolId,
        is_current: true,
      },
      select: {
        id: true,
        name: true,
      },
    }),
  ])

  if (!targetYear) {
    return errorResponse('NOT_FOUND', 'Academic year not found', 404)
  }

  const classCount = await prisma.class.count({
    where: {
      school_id: schoolId,
      academic_year_id: id,
    },
  })

  if (classCount === 0) {
    return errorResponse(
      'NO_CLASSES',
      'Create classes before activating this academic year',
      409
    )
  }

  await prisma.$transaction(async (transaction) => {
    await transaction.academicYear.updateMany({
      where: {
        school_id: schoolId,
        is_current: true,
      },
      data: {
        is_current: false,
        updated_at: new Date(),
      },
    })

    await transaction.academicYear.update({
      where: {
        id: targetYear.id,
      },
      data: {
        is_current: true,
        updated_at: new Date(),
      },
    })
  })

  await createAuditLog({
    school_id: schoolId,
    user_id: access.user.id,
    action: 'UPDATE',
    entity_type: 'academic_year',
    entity_id: targetYear.id,
    old_value: {
      previous_current_year_id: currentYear?.id || null,
      previous_current_year_name: currentYear?.name || null,
      target_is_current: targetYear.is_current,
    },
    new_value: {
      activated_year_id: targetYear.id,
      activated_year_name: targetYear.name,
      activated_start_date: toDateString(targetYear.start_date),
      activated_end_date: toDateString(targetYear.end_date),
      class_count: classCount,
      target_is_current: true,
    },
    ...getRequestMetadata(request),
  })

  return successResponse({
    activated_academic_year: {
      id: targetYear.id,
      name: targetYear.name,
      is_current: true,
      start_date: toDateString(targetYear.start_date),
      end_date: toDateString(targetYear.end_date),
    },
  })
}

