import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { errorResponse, forbiddenResponse, unauthorizedResponse } from '@/lib/api-helpers'
import { hasPermission } from '@/lib/permissions'
import { generateReportExcel } from '@/lib/report-excel'
import { generateReportPdf } from '@/lib/report-pdf'
import { getSchoolReportContext } from '@/lib/reports'
import type { ReportFormat, ReportPayload } from '@/lib/report-types'

export async function getAuthorizedReportContext(requiredPermissions: string[]) {
  const session = await auth()
  if (!session?.user) {
    return {
      ok: false as const,
      response: unauthorizedResponse('Not logged in'),
    }
  }

  const user = session.user as { id: string; role: string; schoolId: string | null }
  if (!user.schoolId) {
    return {
      ok: false as const,
      response: errorResponse('SCHOOL_REQUIRED', 'No school context'),
    }
  }

  for (const permission of requiredPermissions) {
    const allowed = await hasPermission(user.schoolId, user.role, permission)
    if (!allowed) {
      return {
        ok: false as const,
        response: forbiddenResponse(`Missing ${permission} permission`),
      }
    }
  }

  return {
    ok: true as const,
    user,
  }
}

export function parseReportFormat(value: string | null): ReportFormat {
  if (value === 'pdf' || value === 'excel') {
    return value
  }

  return 'json'
}

export function validateDateRange(dateFrom: string | null, dateTo: string | null) {
  if (!dateFrom || !dateTo) {
    return {
      ok: false as const,
      response: errorResponse('INVALID_PARAMS', 'date_from and date_to are required'),
    }
  }

  const from = new Date(`${dateFrom}T00:00:00.000Z`)
  const to = new Date(`${dateTo}T00:00:00.000Z`)

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return {
      ok: false as const,
      response: errorResponse('INVALID_DATE', 'Invalid date range'),
    }
  }

  if (from > to) {
    return {
      ok: false as const,
      response: errorResponse('INVALID_DATE_RANGE', 'date_from cannot be after date_to'),
    }
  }

  return {
    ok: true as const,
  }
}

export async function buildReportResponse(options: {
  schoolId: string
  format: ReportFormat
  report: ReportPayload
}) {
  if (options.format === 'json') {
    return NextResponse.json({
      success: true,
      data: options.report,
    })
  }

  if (options.format === 'pdf') {
    const school = await getSchoolReportContext(options.schoolId)
    const result = await generateReportPdf({
      schoolName: school.name,
      schoolSlug: school.slug,
      report: options.report,
    })

    return NextResponse.json({
      success: true,
      data: {
        url: result.url,
        file_name: result.fileName,
      },
    })
  }

  const result = await generateReportExcel(options.report)

  return new NextResponse(new Uint8Array(result.buffer), {
    status: 200,
    headers: {
      'Content-Type': result.contentType,
      'Content-Disposition': `attachment; filename="${result.fileName}"`,
    },
  })
}
