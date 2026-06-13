import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  renderToBuffer: vi.fn(),
  uploadFile: vi.fn(),
}))

vi.mock('@react-pdf/renderer', () => ({
  renderToBuffer: mocks.renderToBuffer,
  Document: 'Document',
  Page: 'Page',
  Text: 'Text',
  View: 'View',
  StyleSheet: {
    create: (styles: Record<string, unknown>) => styles,
  },
}))

vi.mock('@/lib/r2', () => ({
  uploadFile: mocks.uploadFile,
}))

import { generateReportPdf } from '@/lib/report-pdf'

describe('generateReportPdf', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.renderToBuffer.mockResolvedValue(Buffer.from('pdf-buffer'))
    mocks.uploadFile.mockResolvedValue('https://r2.example.com/reports/test.pdf')
  })

  it('produces a pdf buffer and uploads to expected report path', async () => {
    const result = await generateReportPdf({
      schoolName: 'Vidhya Bharthi High School',
      schoolSlug: 'vbhs',
      report: {
        report_type: 'attendance',
        period: { from: '2026-01-01', to: '2026-01-31' },
        class: { id: 'class-1', name: 'Grade 6', section: 'A' },
        data: {
          student_wise: [
            {
              student_id: 'student-1',
              student_name: 'Asha Patel',
              roll_number: '1',
              total_days: 5,
              present: 5,
              absent: 0,
              late: 0,
              half_day: 0,
              percentage: 100,
            },
          ],
          daily_summary: [{ date: '2026-01-01', present: 1, absent: 0, percentage: 100 }],
          overall: {
            average_attendance: 100,
            best_attendance_student: 'Asha Patel',
            worst_attendance_student: 'Asha Patel',
          },
        },
      },
    })

    expect(result.fileName).toMatch(/^attendance-report-.*\.pdf$/)
    expect(result.url).toBe('https://r2.example.com/reports/test.pdf')
    expect(result.buffer.equals(Buffer.from('pdf-buffer'))).toBe(true)

    expect(mocks.uploadFile).toHaveBeenCalledWith(
      expect.stringMatching(/^reports\/vbhs\/attendance\/attendance-report-.*\.pdf$/),
      expect.any(Buffer),
      'application/pdf'
    )
  })
})
