import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import { generateReportExcel } from '@/lib/report-excel'
import type { AttendanceReport } from '@/lib/report-types'

describe('generateReportExcel', () => {
  it('creates a workbook with attendance summary sheets and Excel content type', async () => {
    const report: AttendanceReport = {
      report_type: 'attendance',
      period: {
        from: '2025-06-01',
        to: '2025-06-07',
      },
      class: {
        id: 'class-1',
        name: 'Grade 6',
        section: 'A',
      },
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
        daily_summary: [
          {
            date: '2025-06-01',
            present: 1,
            absent: 0,
            percentage: 100,
          },
        ],
        overall: {
          average_attendance: 100,
          best_attendance_student: 'Asha Patel',
          worst_attendance_student: 'Asha Patel',
        },
      },
    }

    const result = await generateReportExcel(report)
    const workbook = XLSX.read(result.buffer, { type: 'buffer' })

    expect(result.fileName).toMatch(/attendance-report-.*\.xlsx$/)
    expect(result.contentType).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    expect(workbook.SheetNames).toEqual(['Summary', 'Student Wise', 'Daily Summary'])
    expect(workbook.Sheets['Student Wise']['A2'].v).toBe('Asha Patel')
  })
})
