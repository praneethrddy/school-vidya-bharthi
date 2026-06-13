import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

const mocks = vi.hoisted(() => ({
  getAuthorizedReportContext: vi.fn(),
  parseReportFormat: vi.fn(),
  validateDateRange: vi.fn(),
  buildFinancialReport: vi.fn(),
  buildReportResponse: vi.fn(),
}))

vi.mock('@/lib/report-route-utils', () => ({
  getAuthorizedReportContext: mocks.getAuthorizedReportContext,
  parseReportFormat: mocks.parseReportFormat,
  validateDateRange: mocks.validateDateRange,
  buildReportResponse: mocks.buildReportResponse,
}))

vi.mock('@/lib/reports', () => ({
  buildFinancialReport: mocks.buildFinancialReport,
}))

import { GET } from '../route'

describe('/api/admin/reports/financial GET', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mocks.getAuthorizedReportContext.mockResolvedValue({
      ok: true,
      user: { schoolId: 'school-1' },
    })

    mocks.parseReportFormat.mockReturnValue('json')
    mocks.validateDateRange.mockReturnValue({ ok: true })

    mocks.buildFinancialReport.mockResolvedValue({
      report_type: 'financial',
      period: { from: '2026-01-01', to: '2026-01-31' },
      filters: { class_id: null, fee_category_id: null },
      data: {
        total_expected: 0,
        total_collected: 0,
        total_outstanding: 0,
        collection_percentage: 0,
        class_wise_collection: [],
        category_wise_collection: [],
        month_wise_trend: [],
        defaulter_count: 0,
        total_defaulter_outstanding: 0,
      },
    })

    mocks.buildReportResponse.mockResolvedValue(
      NextResponse.json({
        success: true,
        data: { report_type: 'financial' },
      })
    )
  })

  it('enforces RBAC for financial report access', async () => {
    mocks.getAuthorizedReportContext.mockResolvedValueOnce({
      ok: false,
      response: NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Missing REPORTS.view_financial permission' } },
        { status: 403 }
      ),
    })

    const response = await GET(
      new NextRequest('http://localhost/api/admin/reports/financial?date_from=2026-01-01&date_to=2026-01-31')
    )
    const payload = await response.json()

    expect(response.status).toBe(403)
    expect(payload.error.code).toBe('FORBIDDEN')
    expect(mocks.buildFinancialReport).not.toHaveBeenCalled()
  })

  it('returns validation error for invalid date ranges', async () => {
    mocks.validateDateRange.mockReturnValueOnce({
      ok: false,
      response: NextResponse.json(
        { success: false, error: { code: 'INVALID_DATE_RANGE', message: 'date_from cannot be after date_to' } },
        { status: 400 }
      ),
    })

    const response = await GET(
      new NextRequest('http://localhost/api/admin/reports/financial?date_from=2026-02-01&date_to=2026-01-31')
    )
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.error.code).toBe('INVALID_DATE_RANGE')
  })

  it('returns 400 when date params are missing', async () => {
    mocks.validateDateRange.mockReturnValueOnce({
      ok: false,
      response: NextResponse.json(
        { success: false, error: { code: 'INVALID_PARAMS', message: 'date_from and date_to are required' } },
        { status: 400 }
      ),
    })

    const response = await GET(new NextRequest('http://localhost/api/admin/reports/financial'))
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.error.code).toBe('INVALID_PARAMS')
    expect(mocks.buildFinancialReport).not.toHaveBeenCalled()
  })

  it('builds financial report with filters and format', async () => {
    mocks.parseReportFormat.mockReturnValueOnce('pdf')

    const response = await GET(
      new NextRequest(
        'http://localhost/api/admin/reports/financial?date_from=2026-01-01&date_to=2026-01-31&class_id=class-1&fee_category_id=cat-1&format=pdf'
      )
    )
    const payload = await response.json()

    expect(mocks.parseReportFormat).toHaveBeenCalledWith('pdf')
    expect(mocks.buildFinancialReport).toHaveBeenCalledWith({
      schoolId: 'school-1',
      dateFrom: '2026-01-01',
      dateTo: '2026-01-31',
      classId: 'class-1',
      feeCategoryId: 'cat-1',
    })
    expect(mocks.buildReportResponse).toHaveBeenCalledWith(
      expect.objectContaining({ schoolId: 'school-1', format: 'pdf' })
    )
    expect(payload.success).toBe(true)
    expect(payload.data.report_type).toBe('financial')
  })
})
