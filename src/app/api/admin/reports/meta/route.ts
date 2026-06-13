import { NextRequest } from 'next/server'
import { successResponse } from '@/lib/api-helpers'
import { getAuthorizedReportContext } from '@/lib/report-route-utils'
import { getReportsMeta } from '@/lib/reports'

export async function GET(_request: NextRequest) {
  const context = await getAuthorizedReportContext([
    'REPORTS.view_attendance',
  ])

  if (!context.ok) {
    const academicContext = await getAuthorizedReportContext(['REPORTS.view_academic'])
    if (!academicContext.ok) {
      const financialContext = await getAuthorizedReportContext(['REPORTS.view_financial'])
      if (!financialContext.ok) {
        return context.response
      }

      const meta = await getReportsMeta(financialContext.user.schoolId as string)
      return successResponse(meta)
    }

    const meta = await getReportsMeta(academicContext.user.schoolId as string)
    return successResponse(meta)
  }

  const meta = await getReportsMeta(context.user.schoolId as string)
  return successResponse(meta)
}
