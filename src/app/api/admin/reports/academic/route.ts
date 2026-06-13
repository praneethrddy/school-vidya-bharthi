import { NextRequest } from 'next/server'
import { errorResponse } from '@/lib/api-helpers'
import { buildAcademicReport } from '@/lib/reports'
import {
  buildReportResponse,
  getAuthorizedReportContext,
  parseReportFormat,
} from '@/lib/report-route-utils'

export async function GET(request: NextRequest) {
  const context = await getAuthorizedReportContext(['REPORTS.view_academic'])
  if (!context.ok) {
    return context.response
  }

  const searchParams = request.nextUrl.searchParams
  const classId = searchParams.get('class_id')
  const termId = searchParams.get('term_id')
  const examId = searchParams.get('exam_id')
  const format = parseReportFormat(searchParams.get('format'))

  if (!classId) {
    return errorResponse('INVALID_PARAMS', 'class_id is required')
  }

  const report = await buildAcademicReport({
    schoolId: context.user.schoolId as string,
    classId,
    termId,
    examId,
  })

  return buildReportResponse({
    schoolId: context.user.schoolId as string,
    format,
    report,
  })
}
