import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextResponse } from 'next/server'

const mocks = vi.hoisted(() => ({
  getAuthorizedReportContext: vi.fn(),
  getReportsMeta: vi.fn(),
}))

vi.mock('@/lib/report-route-utils', () => ({
  getAuthorizedReportContext: mocks.getAuthorizedReportContext,
}))

vi.mock('@/lib/reports', () => ({
  getReportsMeta: mocks.getReportsMeta,
}))

vi.mock('@/lib/api-helpers', () => ({
  successResponse: (data: unknown) => NextResponse.json({ success: true, data }, { status: 200 }),
}))

import { GET } from '../route'

describe('/api/admin/reports/meta GET', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getReportsMeta.mockResolvedValue({
      school: { id: 'school-1', name: 'Vidhya Bharthi' },
      current_academic_year_id: 'year-1',
      classes: [{ id: 'class-1', name: 'Grade 6', section: 'A', academic_year_id: 'year-1' }],
      terms: [{ id: 'term-1', name: 'Term 1', academic_year_id: 'year-1' }],
      exams: [{ id: 'exam-1', name: 'Unit Test', class_id: 'class-1', term_id: 'term-1' }],
      fee_categories: [{ id: 'cat-1', name: 'Tuition' }],
    })
  })

  it('returns metadata when attendance permission is granted', async () => {
    mocks.getAuthorizedReportContext.mockResolvedValue({
      ok: true,
      user: { schoolId: 'school-1' },
    })

    const response = await GET({} as never)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          school: expect.objectContaining({ id: 'school-1' }),
          classes: expect.any(Array),
          terms: expect.any(Array),
          exams: expect.any(Array),
          fee_categories: expect.any(Array),
        }),
      })
    )
    expect(mocks.getReportsMeta).toHaveBeenCalledWith('school-1')
    expect(mocks.getAuthorizedReportContext).toHaveBeenCalledWith(['REPORTS.view_attendance'])
  })

  it('falls back to academic permission when attendance permission is missing', async () => {
    mocks.getAuthorizedReportContext
      .mockResolvedValueOnce({
        ok: false,
        response: NextResponse.json(
          { success: false, error: { code: 'FORBIDDEN', message: 'Missing attendance' } },
          { status: 403 }
        ),
      })
      .mockResolvedValueOnce({
        ok: true,
        user: { schoolId: 'school-2' },
      })

    const response = await GET({} as never)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.success).toBe(true)
    expect(mocks.getReportsMeta).toHaveBeenCalledWith('school-2')
    expect(mocks.getAuthorizedReportContext).toHaveBeenNthCalledWith(2, ['REPORTS.view_academic'])
  })

  it('returns the original auth error when all report permissions are denied', async () => {
    const deniedResponse = NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Not logged in' } },
      { status: 401 }
    )

    mocks.getAuthorizedReportContext
      .mockResolvedValueOnce({ ok: false, response: deniedResponse })
      .mockResolvedValueOnce({
        ok: false,
        response: NextResponse.json(
          { success: false, error: { code: 'FORBIDDEN', message: 'Missing academic' } },
          { status: 403 }
        ),
      })
      .mockResolvedValueOnce({
        ok: false,
        response: NextResponse.json(
          { success: false, error: { code: 'FORBIDDEN', message: 'Missing financial' } },
          { status: 403 }
        ),
      })

    const response = await GET({} as never)
    const payload = await response.json()

    expect(response.status).toBe(401)
    expect(payload).toEqual(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'UNAUTHORIZED' }),
      })
    )
    expect(mocks.getReportsMeta).not.toHaveBeenCalled()
  })
})
