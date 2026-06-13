import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

const mocks = vi.hoisted(() => ({
  getAuthorizedReportContext: vi.fn(),
  parseReportFormat: vi.fn(),
  validateDateRange: vi.fn(),
  buildAttendanceReport: vi.fn(),
  buildReportResponse: vi.fn(),
}))

vi.mock('@/lib/report-route-utils', () => ({
  getAuthorizedReportContext: mocks.getAuthorizedReportContext,
  parseReportFormat: mocks.parseReportFormat,
  validateDateRange: mocks.validateDateRange,
  buildReportResponse: mocks.buildReportResponse,
}))

vi.mock('@/lib/reports', () => ({
  buildAttendanceReport: mocks.buildAttendanceReport,
}))

vi.mock('@/lib/api-helpers', () => ({
  errorResponse: (code: string, message: string, status = 400) =>
    NextResponse.json({ success: false, error: { code, message } }, { status }),
}))

import { GET } from '../route'

describe('/api/admin/reports/attendance GET', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mocks.getAuthorizedReportContext.mockResolvedValue({
      ok: true,
      user: {
        schoolId: 'school-1',
      },
    })

    mocks.parseReportFormat.mockReturnValue('json')
    mocks.validateDateRange.mockReturnValue({ ok: true })

    mocks.buildAttendanceReport.mockResolvedValue({
      report_type: 'attendance',
      period: { from: '2026-01-01', to: '2026-01-31' },
      class: { id: 'class-1', name: 'Grade 6', section: 'A' },
      data: { student_wise: [], daily_summary: [], overall: {} },
    })

    mocks.buildReportResponse.mockResolvedValue(
      NextResponse.json({
        success: true,
        data: {
          report_type: 'attendance',
        },
      })
    )
  })

  it('returns auth failure response when session is missing', async () => {
    mocks.getAuthorizedReportContext.mockResolvedValueOnce({
      ok: false,
      response: NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not logged in' } },
        { status: 401 }
      ),
    })

    const response = await GET(
      new NextRequest('http://localhost/api/admin/reports/attendance?class_id=class-1&date_from=2026-01-01&date_to=2026-01-31')
    )
    const payload = await response.json()

    expect(response.status).toBe(401)
    expect(payload.error.code).toBe('UNAUTHORIZED')
    expect(mocks.buildAttendanceReport).not.toHaveBeenCalled()
  })

  it('returns 400 when class_id is missing', async () => {
    const response = await GET(
      new NextRequest('http://localhost/api/admin/reports/attendance?date_from=2026-01-01&date_to=2026-01-31')
    )
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload).toEqual(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'INVALID_PARAMS', message: expect.stringContaining('class_id') }),
      })
    )
  })

  it('returns date validation errors from helper', async () => {
    mocks.validateDateRange.mockReturnValueOnce({
      ok: false,
      response: NextResponse.json(
        { success: false, error: { code: 'INVALID_DATE_RANGE', message: 'date_from cannot be after date_to' } },
        { status: 400 }
      ),
    })

    const response = await GET(
      new NextRequest('http://localhost/api/admin/reports/attendance?class_id=class-1&date_from=2026-02-01&date_to=2026-01-01')
    )
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.error.code).toBe('INVALID_DATE_RANGE')
    expect(mocks.buildAttendanceReport).not.toHaveBeenCalled()
  })

  it('builds report and passes parsed json format by default', async () => {
    const response = await GET(
      new NextRequest(
        'http://localhost/api/admin/reports/attendance?class_id=class-1&date_from=2026-01-01&date_to=2026-01-31'
      )
    )
    const payload = await response.json()

    expect(mocks.parseReportFormat).toHaveBeenCalledWith(null)
    expect(mocks.buildAttendanceReport).toHaveBeenCalledWith({
      schoolId: 'school-1',
      classId: 'class-1',
      dateFrom: '2026-01-01',
      dateTo: '2026-01-31',
    })
    expect(mocks.buildReportResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        schoolId: 'school-1',
        format: 'json',
        report: expect.objectContaining({ report_type: 'attendance' }),
      })
    )
    expect(payload).toEqual(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({ report_type: 'attendance' }),
      })
    )
  })

  it('supports explicit pdf and excel format delegation', async () => {
    mocks.parseReportFormat.mockReturnValueOnce('pdf').mockReturnValueOnce('excel')

    await GET(
      new NextRequest(
        'http://localhost/api/admin/reports/attendance?class_id=class-1&date_from=2026-01-01&date_to=2026-01-31&format=pdf'
      )
    )

    await GET(
      new NextRequest(
        'http://localhost/api/admin/reports/attendance?class_id=class-1&date_from=2026-01-01&date_to=2026-01-31&format=excel'
      )
    )

    expect(mocks.parseReportFormat).toHaveBeenNthCalledWith(1, 'pdf')
    expect(mocks.parseReportFormat).toHaveBeenNthCalledWith(2, 'excel')
    expect(mocks.buildReportResponse).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ format: 'pdf' })
    )
    expect(mocks.buildReportResponse).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ format: 'excel' })
    )
  })
})
