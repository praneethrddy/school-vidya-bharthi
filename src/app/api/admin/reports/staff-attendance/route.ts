import { NextRequest } from 'next/server'
import {
  buildReportResponse,
  getAuthorizedReportContext,
  parseReportFormat,
  validateDateRange,
} from '@/lib/report-route-utils'
import { buildStaffAttendanceReport } from '@/lib/reports'

export async function GET(request: NextRequest) {
  const context = await getAuthorizedReportContext([
    'REPORTS.view_attendance',
    'STAFF.view',
  ])
  if (!context.ok) {
    return context.response
  }

  const searchParams = request.nextUrl.searchParams
  const dateFrom = searchParams.get('date_from')
  const dateTo = searchParams.get('date_to')
  const department = searchParams.get('department')
  const format = parseReportFormat(searchParams.get('format'))

  const range = validateDateRange(dateFrom, dateTo)
  if (!range.ok) {
    return range.response
  }

  const report = await buildStaffAttendanceReport({
    schoolId: context.user.schoolId as string,
    dateFrom: dateFrom as string,
    dateTo: dateTo as string,
    department,
  })

  return buildReportResponse({
    schoolId: context.user.schoolId as string,
    format,
    report,
  })
}
