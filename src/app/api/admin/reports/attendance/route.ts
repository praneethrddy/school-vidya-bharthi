import { NextRequest } from 'next/server'
import { errorResponse } from '@/lib/api-helpers'
import {
  buildReportResponse,
  getAuthorizedReportContext,
  parseReportFormat,
  validateDateRange,
} from '@/lib/report-route-utils'
import { buildAttendanceReport } from '@/lib/reports'

export async function GET(request: NextRequest) {
  const context = await getAuthorizedReportContext(['REPORTS.view_attendance'])
  if (!context.ok) {
    return context.response
  }

  const searchParams = request.nextUrl.searchParams
  const classId = searchParams.get('class_id')
  const dateFrom = searchParams.get('date_from')
  const dateTo = searchParams.get('date_to')
  const format = parseReportFormat(searchParams.get('format'))

  if (!classId) {
    return errorResponse('INVALID_PARAMS', 'class_id is required')
  }

  const range = validateDateRange(dateFrom, dateTo)
  if (!range.ok) {
    return range.response
  }

  const report = await buildAttendanceReport({
    schoolId: context.user.schoolId as string,
    classId,
    dateFrom: dateFrom as string,
    dateTo: dateTo as string,
  })

  return buildReportResponse({
    schoolId: context.user.schoolId as string,
    format,
    report,
  })
}
