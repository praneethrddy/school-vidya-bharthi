import { NextRequest } from 'next/server'
import {
  buildReportResponse,
  getAuthorizedReportContext,
  parseReportFormat,
  validateDateRange,
} from '@/lib/report-route-utils'
import { buildFinancialReport } from '@/lib/reports'

export async function GET(request: NextRequest) {
  const context = await getAuthorizedReportContext(['REPORTS.view_financial'])
  if (!context.ok) {
    return context.response
  }

  const searchParams = request.nextUrl.searchParams
  const dateFrom = searchParams.get('date_from')
  const dateTo = searchParams.get('date_to')
  const classId = searchParams.get('class_id')
  const feeCategoryId = searchParams.get('fee_category_id')
  const format = parseReportFormat(searchParams.get('format'))

  const range = validateDateRange(dateFrom, dateTo)
  if (!range.ok) {
    return range.response
  }

  const report = await buildFinancialReport({
    schoolId: context.user.schoolId as string,
    dateFrom: dateFrom as string,
    dateTo: dateTo as string,
    classId,
    feeCategoryId,
  })

  return buildReportResponse({
    schoolId: context.user.schoolId as string,
    format,
    report,
  })
}
