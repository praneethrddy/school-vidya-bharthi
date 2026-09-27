import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextResponse } from 'next/server'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  hasPermission: vi.fn(),
  generateReportExcel: vi.fn(),
  generateReportPdf: vi.fn(),
  getSchoolReportContext: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  auth: mocks.auth,
}))

vi.mock('@/lib/permissions', () => ({
  hasPermission: mocks.hasPermission,
}))

vi.mock('@/lib/report-excel', () => ({
  generateReportExcel: mocks.generateReportExcel,
}))

vi.mock('@/lib/report-pdf', () => ({
  generateReportPdf: mocks.generateReportPdf,
}))

vi.mock('@/lib/reports', () => ({
  getSchoolReportContext: mocks.getSchoolReportContext,
}))

import {
  buildReportResponse,
  getAuthorizedReportContext,
  parseReportFormat,
  validateDateRange,
} from '@/lib/report-route-utils'

describe('report-route-utils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.hasPermission.mockResolvedValue(true)
  })

  it('getAuthorizedReportContext returns 401 when no session exists', async () => {
    mocks.auth.mockResolvedValue(null)

    const result = await getAuthorizedReportContext(['REPORTS.view_attendance'])

    expect(result.ok).toBe(false)
    if (!result.ok) {
      const payload = await result.response.json()
      expect(result.response.status).toBe(401)
      expect(payload.error.code).toBe('UNAUTHORIZED')
    }
  })

  it('getAuthorizedReportContext returns 400 when school context is missing', async () => {
    mocks.auth.mockResolvedValue({
      user: {
        id: 'user-1',
        role: 'PRINCIPAL',
        schoolId: null,
      },
    })

    const result = await getAuthorizedReportContext(['REPORTS.view_attendance'])

    expect(result.ok).toBe(false)
    if (!result.ok) {
      const payload = await result.response.json()
      expect(result.response.status).toBe(400)
      expect(payload.error.code).toBe('SCHOOL_REQUIRED')
    }
  })

  it('getAuthorizedReportContext returns 403 when required permission is missing', async () => {
    mocks.auth.mockResolvedValue({
      user: {
        id: 'user-1',
        role: 'ACCOUNTANT',
        schoolId: 'school-1',
      },
    })
    mocks.hasPermission.mockResolvedValue(false)

    const result = await getAuthorizedReportContext(['REPORTS.view_financial'])

    expect(result.ok).toBe(false)
    if (!result.ok) {
      const payload = await result.response.json()
      expect(result.response.status).toBe(403)
      expect(payload.error.code).toBe('FORBIDDEN')
      expect(payload.error.message).toContain('REPORTS.view_financial')
    }
  })

  it('getAuthorizedReportContext resolves user when session and permissions are valid', async () => {
    mocks.auth.mockResolvedValue({
      user: {
        id: 'user-1',
        role: 'PRINCIPAL',
        schoolId: 'school-1',
      },
    })

    const result = await getAuthorizedReportContext([
      'REPORTS.view_attendance',
      'REPORTS.view_academic',
    ])

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.user).toEqual(
        expect.objectContaining({ id: 'user-1', role: 'PRINCIPAL', schoolId: 'school-1' })
      )
    }
    expect(mocks.hasPermission).toHaveBeenCalledTimes(2)
  })

  it('parseReportFormat supports pdf, excel, and defaults invalid values to json', () => {
    expect(parseReportFormat('pdf')).toBe('pdf')
    expect(parseReportFormat('excel')).toBe('excel')
    expect(parseReportFormat('json')).toBe('json')
    expect(parseReportFormat('invalid')).toBe('json')
    expect(parseReportFormat(null)).toBe('json')
  })

  it('validateDateRange rejects missing date params', async () => {
    const result = validateDateRange(null, '2026-01-31')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      const payload = await result.response.json()
      expect(result.response.status).toBe(400)
      expect(payload.error.code).toBe('INVALID_PARAMS')
    }
  })

  it('validateDateRange rejects invalid date values', async () => {
    const result = validateDateRange('invalid', '2026-01-31')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      const payload = await result.response.json()
      expect(payload.error.code).toBe('INVALID_DATE')
    }
  })

  it('validateDateRange rejects when from date is after to date', async () => {
    const result = validateDateRange('2026-02-01', '2026-01-31')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      const payload = await result.response.json()
      expect(payload.error.code).toBe('INVALID_DATE_RANGE')
    }
  })

  it('buildReportResponse returns JSON payload for json format', async () => {
    const report = {
      report_type: 'attendance',
      period: { from: '2026-01-01', to: '2026-01-31' },
      class: { id: 'class-1', name: 'Grade 6', section: 'A' },
      data: {
        student_wise: [],
        daily_summary: [],
        overall: {
          average_attendance: 0,
          best_attendance_student: 'N/A',
          worst_attendance_student: 'N/A',
        },
      },
    } as const

    const response = await buildReportResponse({
      schoolId: 'school-1',
      format: 'json',
      report,
    })
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({ report_type: 'attendance' }),
      })
    )
  })

  it('buildReportResponse returns uploaded PDF metadata for pdf format', async () => {
    const report = {
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
    } as const

    mocks.getSchoolReportContext.mockResolvedValue({
      id: 'school-1',
      name: 'Vidhya Bharthi',
      slug: 'vbhs',
    })
    mocks.generateReportPdf.mockResolvedValue({
      buffer: Buffer.from('pdf-data'),
      url: 'https://example.com/report.pdf',
      fileName: 'financial-report.pdf',
    })

    const response = await buildReportResponse({
      schoolId: 'school-1',
      format: 'pdf',
      report,
    })
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          url: 'https://example.com/report.pdf',
          file_name: 'financial-report.pdf',
        }),
      })
    )
    expect(mocks.generateReportPdf).toHaveBeenCalledWith(
      expect.objectContaining({
        schoolName: 'Vidhya Bharthi',
        schoolSlug: 'vbhs',
        report,
      })
    )
  })

  it('buildReportResponse returns binary excel response for excel format', async () => {
    const buffer = Buffer.from('excel-data')
    mocks.generateReportExcel.mockResolvedValue({
      buffer,
      fileName: 'attendance-report.xlsx',
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })

    const response = await buildReportResponse({
      schoolId: 'school-1',
      format: 'excel',
      report: {
        report_type: 'attendance',
        period: { from: '2026-01-01', to: '2026-01-31' },
        class: { id: 'class-1', name: 'Grade 6', section: 'A' },
        data: {
          student_wise: [],
          daily_summary: [],
          overall: {
            average_attendance: 0,
            best_attendance_student: 'N/A',
            worst_attendance_student: 'N/A',
          },
        },
      },
    })

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    expect(response.headers.get('Content-Disposition')).toContain('attendance-report.xlsx')

    const data = Buffer.from(await response.arrayBuffer())
    expect(data.equals(buffer)).toBe(true)
  })
})
