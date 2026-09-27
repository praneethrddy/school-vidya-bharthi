import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

const mocks = vi.hoisted(() => ({
  getAuthorizedReportContext: vi.fn(),
  parseReportFormat: vi.fn(),
  buildAcademicReport: vi.fn(),
  buildReportResponse: vi.fn(),
}))

vi.mock('@/lib/report-route-utils', () => ({
  getAuthorizedReportContext: mocks.getAuthorizedReportContext,
  parseReportFormat: mocks.parseReportFormat,
  buildReportResponse: mocks.buildReportResponse,
}))

vi.mock('@/lib/reports', () => ({
  buildAcademicReport: mocks.buildAcademicReport,
}))

vi.mock('@/lib/api-helpers', () => ({
  errorResponse: (code: string, message: string, status = 400) =>
    NextResponse.json({ success: false, error: { code, message } }, { status }),
}))

import { GET } from '../route'

describe('/api/admin/reports/academic GET', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mocks.getAuthorizedReportContext.mockResolvedValue({
      ok: true,
      user: { schoolId: 'school-1' },
    })

    mocks.parseReportFormat.mockReturnValue('json')

    mocks.buildAcademicReport.mockResolvedValue({
      report_type: 'academic',
      class: { id: 'class-1', name: 'Grade 6', section: 'A' },
      term: { id: 'term-1', name: 'Term 1' },
      exam: { id: 'exam-1', name: 'Unit Test' },
      data: {
        subject_performance: [],
        toppers: [],
        grade_distribution: [],
        exam_comparison: [],
        summary: { overall_average: 0, overall_pass_percentage: 0, students_evaluated: 0 },
      },
    })

    mocks.buildReportResponse.mockResolvedValue(
      NextResponse.json({
        success: true,
        data: { report_type: 'academic' },
      })
    )
  })

  it('returns auth failure when permission check fails', async () => {
    mocks.getAuthorizedReportContext.mockResolvedValueOnce({
      ok: false,
      response: NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Missing permission' } },
        { status: 403 }
      ),
    })

    const response = await GET(new NextRequest('http://localhost/api/admin/reports/academic?class_id=class-1'))
    const payload = await response.json()

    expect(response.status).toBe(403)
    expect(payload.error.code).toBe('FORBIDDEN')
  })

  it('returns 400 when class_id is missing', async () => {
    const response = await GET(new NextRequest('http://localhost/api/admin/reports/academic'))
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload).toEqual(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'INVALID_PARAMS', message: expect.stringContaining('class_id') }),
      })
    )
    expect(mocks.buildAcademicReport).not.toHaveBeenCalled()
  })

  it('builds academic report with filters and delegates response', async () => {
    const response = await GET(
      new NextRequest(
        'http://localhost/api/admin/reports/academic?class_id=class-1&term_id=term-1&exam_id=exam-1&format=json'
      )
    )
    const payload = await response.json()

    expect(mocks.parseReportFormat).toHaveBeenCalledWith('json')
    expect(mocks.buildAcademicReport).toHaveBeenCalledWith({
      schoolId: 'school-1',
      classId: 'class-1',
      termId: 'term-1',
      examId: 'exam-1',
    })
    expect(mocks.buildReportResponse).toHaveBeenCalledWith(
      expect.objectContaining({ schoolId: 'school-1', format: 'json' })
    )
    expect(payload.success).toBe(true)
    expect(payload.data.report_type).toBe('academic')
  })
})
