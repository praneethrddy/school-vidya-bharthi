import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import {
  ReportResponseSchema,
  ErrorResponseSchema,
} from '@/test/contracts/schemas'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  getAuthorizedReportContext: vi.fn(),
  buildAcademicReport: vi.fn(),
  buildReportResponse: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  auth: mocks.auth,
}))

vi.mock('@/lib/permissions', () => ({
  hasPermission: vi.fn(),
}))

vi.mock('@/lib/audit', () => ({
  createAuditLog: vi.fn(),
}))

vi.mock('@/lib/report-route-utils', () => ({
  getAuthorizedReportContext: mocks.getAuthorizedReportContext,
  parseReportFormat: (val: any) => val || 'json',
  buildReportResponse: mocks.buildReportResponse,
}))

vi.mock('@/lib/reports', () => ({
  buildAcademicReport: mocks.buildAcademicReport,
}))

import { GET } from '../academic/route'

describe('Academic Reports API Contract Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.auth.mockResolvedValue({
      user: { id: '00000000-0000-0000-0000-000000000000', role: 'PRINCIPAL', schoolId: '00000000-0000-0000-0000-000000000001' },
    })
    mocks.getAuthorizedReportContext.mockResolvedValue({
      ok: true,
      user: { id: '00000000-0000-0000-0000-000000000000', role: 'PRINCIPAL', schoolId: '00000000-0000-0000-0000-000000000001' },
    })
    mocks.buildReportResponse.mockImplementation(async ({ format, report }) => {
      return {
        status: 200,
        json: async () => ({ success: true, data: report }),
      } as any
    })
  })

  it('[TEST-CONTRACT-018] GET /api/admin/reports/academic returns valid ReportResponse shape (json)', async () => {
    mocks.buildAcademicReport.mockResolvedValue({
      report_type: 'academic',
      class: { id: '11111111-1111-1111-1111-111111111111', name: 'Grade 6', section: 'A' },
      term: { id: 'term-1', name: 'Term 1' },
      exam: { id: 'exam-1', name: 'Mid Term' },
      data: {
        subject_performance: [],
        toppers: [],
        grade_distribution: [],
        exam_comparison: [],
        summary: {
          overall_average: 82.5,
          overall_pass_percentage: 95.0,
          students_evaluated: 30,
        },
      },
    })

    const request = new NextRequest('http://localhost/api/admin/reports/academic?class_id=class-1&format=json')
    const response = await GET(request)
    const payload = await response.json()

    expect(response.status).toBe(200)
    const result = ReportResponseSchema.safeParse(payload)
    expect(result.success).toBe(true)
  })

  it('[TEST-CONTRACT-020] GET /api/admin/reports/academic fails with unauthorized error response shape', async () => {
    mocks.getAuthorizedReportContext.mockResolvedValue({
      ok: false,
      response: {
        status: 401,
        json: async () => ({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not logged in' } }),
      } as any,
    })
    const request = new NextRequest('http://localhost/api/admin/reports/academic?class_id=class-1&format=json')
    const response = await GET(request)
    const payload = await response.json()

    expect(response.status).toBe(401)
    const result = ErrorResponseSchema.safeParse(payload)
    expect(result.success).toBe(true)
  })
})
