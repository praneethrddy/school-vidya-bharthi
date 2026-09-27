import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

const mocks = vi.hoisted(() => ({
  getAuthorizedReportContext: vi.fn(),
  parseReportFormat: vi.fn(),
  validateDateRange: vi.fn(),
  buildStaffAttendanceReport: vi.fn(),
  buildReportResponse: vi.fn(),
}))

vi.mock('@/lib/report-route-utils', () => ({
  getAuthorizedReportContext: mocks.getAuthorizedReportContext,
  parseReportFormat: mocks.parseReportFormat,
  validateDateRange: mocks.validateDateRange,
  buildReportResponse: mocks.buildReportResponse,
}))

vi.mock('@/lib/reports', () => ({
  buildStaffAttendanceReport: mocks.buildStaffAttendanceReport,
}))

import { GET } from '../route'

describe('/api/admin/reports/staff-attendance GET', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mocks.getAuthorizedReportContext.mockResolvedValue({
      ok: true,
      user: { schoolId: 'school-1' },
    })

    mocks.parseReportFormat.mockReturnValue('json')
    mocks.validateDateRange.mockReturnValue({ ok: true })

    mocks.buildStaffAttendanceReport.mockResolvedValue({
      report_type: 'staff_attendance',
      period: { from: '2026-01-01', to: '2026-01-31' },
      department: null,
      data: {
        staff_wise: [],
        daily_summary: [],
        overall: {
          average_attendance: 0,
          best_attendance_staff: 'N/A',
          worst_attendance_staff: 'N/A',
        },
      },
    })

    mocks.buildReportResponse.mockResolvedValue(
      NextResponse.json({
        success: true,
        data: { report_type: 'staff_attendance' },
      })
    )
  })

  it('requires attendance and staff permissions', async () => {
    await GET(
      new NextRequest('http://localhost/api/admin/reports/staff-attendance?date_from=2026-01-01&date_to=2026-01-31')
    )

    expect(mocks.getAuthorizedReportContext).toHaveBeenCalledWith([
      'REPORTS.view_attendance',
      'STAFF.view',
    ])
  })

  it('returns authorization failures directly', async () => {
    mocks.getAuthorizedReportContext.mockResolvedValueOnce({
      ok: false,
      response: NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Missing STAFF.view permission' } },
        { status: 403 }
      ),
    })

    const response = await GET(
      new NextRequest('http://localhost/api/admin/reports/staff-attendance?date_from=2026-01-01&date_to=2026-01-31')
    )
    const payload = await response.json()

    expect(response.status).toBe(403)
    expect(payload.error.code).toBe('FORBIDDEN')
    expect(mocks.buildStaffAttendanceReport).not.toHaveBeenCalled()
  })

  it('returns date validation errors', async () => {
    mocks.validateDateRange.mockReturnValueOnce({
      ok: false,
      response: NextResponse.json(
        { success: false, error: { code: 'INVALID_PARAMS', message: 'date_from and date_to are required' } },
        { status: 400 }
      ),
    })

    const response = await GET(new NextRequest('http://localhost/api/admin/reports/staff-attendance'))
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.error.code).toBe('INVALID_PARAMS')
  })

  it('builds staff attendance report with optional department filter', async () => {
    mocks.parseReportFormat.mockReturnValueOnce('excel')

    const response = await GET(
      new NextRequest(
        'http://localhost/api/admin/reports/staff-attendance?date_from=2026-01-01&date_to=2026-01-31&department=Science&format=excel'
      )
    )
    const payload = await response.json()

    expect(mocks.parseReportFormat).toHaveBeenCalledWith('excel')
    expect(mocks.buildStaffAttendanceReport).toHaveBeenCalledWith({
      schoolId: 'school-1',
      dateFrom: '2026-01-01',
      dateTo: '2026-01-31',
      department: 'Science',
    })
    expect(mocks.buildReportResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        schoolId: 'school-1',
        format: 'excel',
        report: expect.objectContaining({ report_type: 'staff_attendance' }),
      })
    )
    expect(payload.success).toBe(true)
  })
})
