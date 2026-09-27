import { describe, expect, it } from 'vitest'
import type { ReportFormat, ReportPayload } from '@/lib/report-types'

describe('report-types', () => {
  it('supports expected report formats and payload unions at compile time', () => {
    const formats: ReportFormat[] = ['json', 'pdf', 'excel']

    const payloads: ReportPayload[] = [
      {
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
      {
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
      },
    ]

    expect(formats).toEqual(['json', 'pdf', 'excel'])
    expect(payloads).toHaveLength(2)
  })
})
