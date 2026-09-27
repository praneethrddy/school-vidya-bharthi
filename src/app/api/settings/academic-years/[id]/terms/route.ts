import { NextRequest } from 'next/server'
import { createAuditLog } from '@/lib/audit'
import { errorResponse, successResponse } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'
import {
  createTermSchema,
  isDateRangeValid,
  parseDateOnly,
  rangesOverlap,
} from '@/lib/school-settings'
import {
  getRequestMetadata,
  requireSchoolPermission,
} from '@/lib/settings-auth'

function toDateString(date: Date) {
  return date.toISOString().slice(0, 10)
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireSchoolPermission('SETTINGS.manage_academic_year')
  if (access.error) {
    return access.error
  }

  const { id } = await params
  const schoolId = access.user.schoolId

  const academicYear = await prisma.academicYear.findFirst({
    where: {
      id,
      school_id: schoolId,
    },
    select: {
      id: true,
      name: true,
    },
  })

  if (!academicYear) {
    return errorResponse('NOT_FOUND', 'Academic year not found', 404)
  }

  const terms = await prisma.term.findMany({
    where: {
      school_id: schoolId,
      academic_year_id: id,
    },
    orderBy: {
      start_date: 'asc',
    },
  })

  return successResponse({
    academic_year: academicYear,
    terms: terms.map((term) => ({
      id: term.id,
      name: term.name,
      start_date: toDateString(term.start_date),
      end_date: toDateString(term.end_date),
    })),
  })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireSchoolPermission('SETTINGS.manage_academic_year')
  if (access.error) {
    return access.error
  }

  const payload = await request.json().catch(() => null)
  const parsedBody = createTermSchema.safeParse(payload)
  if (!parsedBody.success) {
    return errorResponse(
      'VALIDATION_ERROR',
      parsedBody.error.issues[0]?.message || 'Invalid payload',
      400
    )
  }

  const { id } = await params
  const schoolId = access.user.schoolId
  const startDate = parseDateOnly(parsedBody.data.start_date)
  const endDate = parseDateOnly(parsedBody.data.end_date)
  if (!startDate || !endDate) {
    return errorResponse(
      'VALIDATION_ERROR',
      'start_date and end_date must be valid YYYY-MM-DD values',
      400
    )
  }

  if (!isDateRangeValid(startDate, endDate)) {
    return errorResponse(
      'VALIDATION_ERROR',
      'start_date must be before end_date',
      400
    )
  }

  const academicYear = await prisma.academicYear.findFirst({
    where: {
      id,
      school_id: schoolId,
    },
    select: {
      id: true,
      start_date: true,
      end_date: true,
    },
  })

  if (!academicYear) {
    return errorResponse('NOT_FOUND', 'Academic year not found', 404)
  }

  if (startDate < academicYear.start_date || endDate > academicYear.end_date) {
    return errorResponse(
      'TERM_OUT_OF_RANGE',
      'Term dates must be within the selected academic year range',
      400
    )
  }

  const overlap = await prisma.term.findFirst({
    where: {
      school_id: schoolId,
      academic_year_id: id,
      start_date: {
        lte: endDate,
      },
      end_date: {
        gte: startDate,
      },
    },
    select: {
      id: true,
      name: true,
      start_date: true,
      end_date: true,
    },
  })

  if (overlap) {
    const hasOverlap = rangesOverlap(
      startDate,
      endDate,
      overlap.start_date,
      overlap.end_date
    )
    if (hasOverlap) {
      return errorResponse(
        'TERM_OVERLAP',
        `Term overlaps with ${overlap.name}`,
        409
      )
    }
  }

  const createdTerm = await prisma.term.create({
    data: {
      school_id: schoolId,
      academic_year_id: id,
      name: parsedBody.data.name.trim(),
      start_date: startDate,
      end_date: endDate,
    },
  })

  await createAuditLog({
    school_id: schoolId,
    user_id: access.user.id,
    action: 'CREATE',
    entity_type: 'term',
    entity_id: createdTerm.id,
    new_value: {
      academic_year_id: id,
      name: createdTerm.name,
      start_date: toDateString(createdTerm.start_date),
      end_date: toDateString(createdTerm.end_date),
    },
    ...getRequestMetadata(request),
  })

  return successResponse({
    term: {
      id: createdTerm.id,
      name: createdTerm.name,
      start_date: toDateString(createdTerm.start_date),
      end_date: toDateString(createdTerm.end_date),
    },
  })
}

