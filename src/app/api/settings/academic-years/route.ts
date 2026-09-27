import { NextRequest } from 'next/server'
import { createAuditLog } from '@/lib/audit'
import { errorResponse, successResponse } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'
import {
  buildDefaultTerms,
  createAcademicYearSchema,
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

export async function GET() {
  const access = await requireSchoolPermission('SETTINGS.manage_academic_year')
  if (access.error) {
    return access.error
  }

  const years = await prisma.academicYear.findMany({
    where: {
      school_id: access.user.schoolId,
    },
    include: {
      terms: {
        select: {
          id: true,
          name: true,
          start_date: true,
          end_date: true,
        },
        orderBy: {
          start_date: 'asc',
        },
      },
      _count: {
        select: {
          classes: true,
        },
      },
    },
    orderBy: {
      start_date: 'desc',
    },
  })

  return successResponse({
    academic_years: years.map((year) => ({
      id: year.id,
      name: year.name,
      start_date: toDateString(year.start_date),
      end_date: toDateString(year.end_date),
      is_current: year.is_current,
      classes_count: year._count.classes,
      terms: year.terms.map((term) => ({
        id: term.id,
        name: term.name,
        start_date: toDateString(term.start_date),
        end_date: toDateString(term.end_date),
      })),
    })),
  })
}

export async function POST(request: NextRequest) {
  const access = await requireSchoolPermission('SETTINGS.manage_academic_year')
  if (access.error) {
    return access.error
  }

  const payload = await request.json().catch(() => null)
  const parsedBody = createAcademicYearSchema.safeParse(payload)
  if (!parsedBody.success) {
    return errorResponse(
      'VALIDATION_ERROR',
      parsedBody.error.issues[0]?.message || 'Invalid payload',
      400
    )
  }

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

  const existingYears = await prisma.academicYear.findMany({
    where: {
      school_id: schoolId,
    },
    select: {
      id: true,
      name: true,
      start_date: true,
      end_date: true,
      is_current: true,
    },
  })

  const overlap = existingYears.find((year) =>
    rangesOverlap(startDate, endDate, year.start_date, year.end_date)
  )
  if (overlap) {
    return errorResponse(
      'DATE_RANGE_OVERLAP',
      `Date range overlaps with academic year ${overlap.name}`,
      409
    )
  }

  const termInput = parsedBody.data.terms
  const termsToCreate = termInput?.length
    ? termInput
        .map((term) => {
          const termStart = parseDateOnly(term.start_date)
          const termEnd = parseDateOnly(term.end_date)

          if (!termStart || !termEnd) {
            return { error: 'Each term requires valid YYYY-MM-DD dates' } as const
          }

          if (!isDateRangeValid(termStart, termEnd)) {
            return { error: `Term ${term.name} has invalid date range` } as const
          }

          if (termStart < startDate || termEnd > endDate) {
            return {
              error: `Term ${term.name} must be within academic year range`,
            } as const
          }

          return {
            name: term.name.trim(),
            start_date: termStart,
            end_date: termEnd,
          } as const
        })
    : buildDefaultTerms(startDate, endDate)

  const invalidTerm = termsToCreate.find(
    (term) => 'error' in term && Boolean(term.error)
  )
  if (invalidTerm && 'error' in invalidTerm) {
    return errorResponse(
      'VALIDATION_ERROR',
      invalidTerm.error || 'Invalid term payload',
      400
    )
  }

  const normalizedTerms = termsToCreate.filter(
    (term): term is { name: string; start_date: Date; end_date: Date } =>
      !('error' in term)
  )

  const overlappingTerms = normalizedTerms.find((term, index) => {
    return normalizedTerms.some((candidate, candidateIndex) => {
      if (index === candidateIndex) {
        return false
      }
      return rangesOverlap(
        term.start_date,
        term.end_date,
        candidate.start_date,
        candidate.end_date
      )
    })
  })
  if (overlappingTerms) {
    return errorResponse(
      'VALIDATION_ERROR',
      `Term ${overlappingTerms.name} overlaps another term`,
      400
    )
  }

  const hasCurrentYear = existingYears.some((year) => year.is_current)
  const metadata = getRequestMetadata(request)

  const created = await prisma.$transaction(async (transaction) => {
    const year = await transaction.academicYear.create({
      data: {
        school_id: schoolId,
        name: parsedBody.data.name.trim(),
        start_date: startDate,
        end_date: endDate,
        is_current: !hasCurrentYear,
      },
    })

    if (normalizedTerms.length > 0) {
      await transaction.term.createMany({
        data: normalizedTerms.map((term) => ({
          school_id: schoolId,
          academic_year_id: year.id,
          name: term.name,
          start_date: term.start_date,
          end_date: term.end_date,
        })),
      })
    }

    const terms = await transaction.term.findMany({
      where: {
        school_id: schoolId,
        academic_year_id: year.id,
      },
      orderBy: {
        start_date: 'asc',
      },
    })

    return { year, terms }
  })

  await createAuditLog({
    school_id: schoolId,
    user_id: access.user.id,
    action: 'CREATE',
    entity_type: 'academic_year',
    entity_id: created.year.id,
    new_value: {
      name: created.year.name,
      start_date: toDateString(created.year.start_date),
      end_date: toDateString(created.year.end_date),
      is_current: created.year.is_current,
      terms: created.terms.map((term) => ({
        id: term.id,
        name: term.name,
        start_date: toDateString(term.start_date),
        end_date: toDateString(term.end_date),
      })),
    },
    ...metadata,
  })

  return successResponse({
    academic_year: {
      id: created.year.id,
      name: created.year.name,
      start_date: toDateString(created.year.start_date),
      end_date: toDateString(created.year.end_date),
      is_current: created.year.is_current,
      terms: created.terms.map((term) => ({
        id: term.id,
        name: term.name,
        start_date: toDateString(term.start_date),
        end_date: toDateString(term.end_date),
      })),
    },
  })
}
