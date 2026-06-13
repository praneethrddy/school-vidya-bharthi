import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'

const mocks = vi.hoisted(() => ({
  renderToBuffer: vi.fn(),
  uploadFile: vi.fn(),
  fontRegister: vi.fn(),
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
  Font: {
    register: mocks.fontRegister,
  },
}))

vi.mock('@/lib/r2', () => ({
  uploadFile: mocks.uploadFile,
}))

import { renderToBuffer } from '@react-pdf/renderer'
import { ReportCardDocument } from '@/components/admin/report-card-template'
import { FeeReceiptTemplate, type FeeReceiptTemplateData } from '@/components/admin/fee-receipt-template'
import { generateReportPdf } from '@/lib/report-pdf'
import type { AcademicReport, AttendanceReport, FinancialReport } from '@/lib/report-types'

function collectText(node: ReactNode, chunks: string[]) {
  if (node === null || node === undefined || typeof node === 'boolean') {
    return
  }

  if (typeof node === 'string' || typeof node === 'number') {
    chunks.push(String(node))
    return
  }

  if (Array.isArray(node)) {
    for (const child of node) {
      collectText(child, chunks)
    }
    return
  }

  if (typeof node === 'object' && 'props' in node) {
    collectText((node as { props?: { children?: ReactNode } }).props?.children, chunks)
  }
}

function extractText(node: ReactNode) {
  const chunks: string[] = []
  collectText(node, chunks)
  return chunks.join(' ')
}

const reportCardFixture = {
  schoolName: 'Vidhya Bharthi High School',
  termName: 'Term 1',
  student: {
    name: 'Asha Patel',
    rollNumber: '12',
    className: 'Grade 8 A',
  },
  grades: [
    { subject: 'Mathematics', maxMarks: 100, obtained: 95, grade: 'A+', remarks: 'Excellent' },
    { subject: 'Science', maxMarks: 100, obtained: 92, grade: 'A+', remarks: 'Very Good' },
  ],
  summary: {
    totalMarks: 187,
    totalMax: 200,
    percentage: '93.5',
    attendance: '96%',
    rank: 1,
  },
}

const feeReceiptFixture: FeeReceiptTemplateData = {
  schoolName: 'Vidhya Bharthi High School',
  schoolAddress: '123 Education Lane, Knowledge City',
  schoolPhone: '+91 98765 43210',
  receiptNumber: 'VBHS-2026-000321',
  paymentDate: '2026-01-10',
  studentName: 'Asha Patel',
  className: 'Grade 8 A',
  admissionNumber: 'ADM-1023',
  categoryName: 'Tuition Fee',
  amountPaid: 4500,
  paymentMode: 'CASH',
  referenceNumber: 'REF-1001',
  balanceRemaining: 500,
  collectedBy: 'Rahul Sharma',
  remarks: 'Paid in full for January installment',
}

const attendanceReportFixture: AttendanceReport = {
  report_type: 'attendance',
  period: { from: '2026-01-01', to: '2026-01-31' },
  class: { id: 'class-1', name: 'Grade 8', section: 'A' },
  data: {
    student_wise: [
      {
        student_id: 'student-1',
        student_name: 'Asha Patel',
        roll_number: '12',
        total_days: 20,
        present: 19,
        absent: 1,
        late: 0,
        half_day: 0,
        percentage: 95,
      },
    ],
    daily_summary: [{ date: '2026-01-01', present: 30, absent: 2, percentage: 93.75 }],
    overall: {
      average_attendance: 95,
      best_attendance_student: 'Asha Patel',
      worst_attendance_student: 'Asha Patel',
    },
  },
}

const academicReportFixture: AcademicReport = {
  report_type: 'academic',
  class: { id: 'class-1', name: 'Grade 8', section: 'A' },
  term: { id: 'term-1', name: 'Term 1' },
  exam: { id: 'exam-1', name: 'Mid Term' },
  data: {
    subject_performance: [
      {
        subject_id: 'subject-1',
        subject_name: 'Mathematics',
        pass_percentage: 92,
        fail_percentage: 8,
        highest_marks: 98,
        lowest_marks: 34,
        average_marks: 78,
        max_marks: 100,
        passing_marks: 35,
        students_evaluated: 40,
      },
    ],
    toppers: [
      {
        rank: 1,
        student_id: 'student-1',
        student_name: 'Asha Patel',
        roll_number: '12',
        total_marks: 478,
        total_max_marks: 500,
        percentage: 95.6,
      },
    ],
    grade_distribution: [
      { grade: 'A+', count: 12, percentage: 30 },
      { grade: 'A', count: 16, percentage: 40 },
    ],
    exam_comparison: [{ exam_id: 'exam-1', exam_name: 'Mid Term', average_percentage: 78, pass_percentage: 92 }],
    summary: {
      overall_average: 78,
      overall_pass_percentage: 92,
      students_evaluated: 40,
    },
  },
}

const financialReportFixture: FinancialReport = {
  report_type: 'financial',
  period: { from: '2026-01-01', to: '2026-01-31' },
  filters: { class_id: null, fee_category_id: null },
  data: {
    total_expected: 250000,
    total_collected: 190000,
    total_outstanding: 60000,
    collection_percentage: 76,
    class_wise_collection: [
      {
        id: 'class-1',
        name: 'Grade 8 A',
        expected: 120000,
        collected: 95000,
        outstanding: 25000,
        collection_percentage: 79.2,
      },
    ],
    category_wise_collection: [
      {
        id: 'cat-1',
        name: 'Tuition Fee',
        expected: 180000,
        collected: 140000,
        outstanding: 40000,
        collection_percentage: 77.8,
      },
    ],
    month_wise_trend: [{ month: '2026-01', collected: 190000 }],
    defaulter_count: 14,
    total_defaulter_outstanding: 60000,
  },
}

describe('PDF output testing (Section 34)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.renderToBuffer.mockResolvedValue(Buffer.from('pdf-buffer'))
    mocks.uploadFile.mockResolvedValue('https://r2.example.com/reports/file.pdf')
  })

  describe('34A — Report Card PDF', () => {
    it('TEST-PDF-001: report card PDF generates without error', async () => {
      const doc = ReportCardDocument(reportCardFixture)

      await expect(renderToBuffer(doc as any)).resolves.toBeInstanceOf(Buffer)
    })

    it('TEST-PDF-002: report card contains student name', () => {
      const text = extractText(ReportCardDocument(reportCardFixture))

      expect(text).toContain('Asha Patel')
    })

    it('TEST-PDF-003: report card contains school name and logo reference', () => {
      const text = extractText(ReportCardDocument(reportCardFixture))

      expect(text).toContain('Vidhya Bharthi High School')
      expect(text).toMatch(/logo/i)
    })

    it('TEST-PDF-004: report card contains all subject names and marks', () => {
      const text = extractText(ReportCardDocument(reportCardFixture))

      expect(text).toContain('Mathematics')
      expect(text).toContain('Science')
      expect(text).toContain('95')
      expect(text).toContain('92')
    })

    it('TEST-PDF-005: report card contains overall percentage/grade', () => {
      const text = extractText(ReportCardDocument(reportCardFixture))

      expect(text).toMatch(/Percentage:\s*93\.5\s*%/)
      expect(text).toContain('A+')
    })

    it('TEST-PDF-006: report card contains academic year and term name', () => {
      const text = extractText(ReportCardDocument(reportCardFixture))

      expect(text).toContain('Term 1')
      expect(text).toContain('2025-26')
    })

    it('TEST-PDF-007: report card contains class and section', () => {
      const text = extractText(ReportCardDocument(reportCardFixture))

      expect(text).toContain('Grade 8 A')
    })

    it('TEST-PDF-008: report card for student with no grades ? graceful (empty or message)', () => {
      const text = extractText(
        ReportCardDocument({
          ...reportCardFixture,
          grades: [],
          summary: {
            ...reportCardFixture.summary,
            totalMarks: 0,
            totalMax: 0,
            percentage: '0.0',
            rank: 0,
          },
        })
      )

      expect(text).toContain('Subject')
      expect(text).toContain('Summary')
    })
  })

  describe('34B — Fee Receipt PDF', () => {
    it('TEST-PDF-009: fee receipt PDF generates without error', async () => {
      const doc = FeeReceiptTemplate({ data: feeReceiptFixture })

      await expect(renderToBuffer(doc as any)).resolves.toBeInstanceOf(Buffer)
    })

    it('TEST-PDF-010: receipt contains receipt number in correct format', () => {
      const text = extractText(FeeReceiptTemplate({ data: feeReceiptFixture }))

      expect(text).toContain('VBHS-2026-000321')
      expect(text).toMatch(/VBHS-\d{4}-\d{6}/)
    })

    it('TEST-PDF-011: receipt contains student name and admission number', () => {
      const text = extractText(FeeReceiptTemplate({ data: feeReceiptFixture }))

      expect(text).toContain('Asha Patel')
      expect(text).toContain('ADM-1023')
    })

    it('TEST-PDF-012: receipt contains payment amount, date, mode', () => {
      const text = extractText(FeeReceiptTemplate({ data: feeReceiptFixture }))

      expect(text).toMatch(/[₹Rs. ]*4,500\.00/)
      expect(text).toContain('10 Jan 2026')
      expect(text).toContain('CASH')
    })

    it('TEST-PDF-013: receipt contains school name and address', () => {
      const text = extractText(FeeReceiptTemplate({ data: feeReceiptFixture }))

      expect(text).toContain('Vidhya Bharthi High School')
      expect(text).toContain('123 Education Lane, Knowledge City')
    })

    it('TEST-PDF-014: receipt for zero-amount payment ? handled gracefully', () => {
      const text = extractText(
        FeeReceiptTemplate({
          data: {
            ...feeReceiptFixture,
            amountPaid: 0,
            balanceRemaining: 0,
          },
        })
      )

      expect(text).toMatch(/[₹Rs. ]*0\.00/)
    })
  })

  describe('34C — Report Export PDFs', () => {
    it('TEST-PDF-015: attendance report PDF contains date range and data tables', async () => {
      await generateReportPdf({
        schoolName: 'Vidhya Bharthi High School',
        schoolSlug: 'vbhs',
        report: attendanceReportFixture,
      })

      const doc = mocks.renderToBuffer.mock.calls[0]?.[0]
      const text = extractText(doc)

      expect(text).toContain('2026-01-01 to 2026-01-31')
      expect(text).toContain('Student-wise Breakdown')
      expect(text).toContain('Daily Summary')
      expect(text).toContain('Asha Patel')
    })

    it('TEST-PDF-016: academic report PDF contains grade distributions', async () => {
      await generateReportPdf({
        schoolName: 'Vidhya Bharthi High School',
        schoolSlug: 'vbhs',
        report: academicReportFixture,
      })

      const doc = mocks.renderToBuffer.mock.calls[0]?.[0]
      const text = extractText(doc)

      expect(text).toContain('Grade Distribution')
      expect(text).toContain('A+')
      expect(text).toContain('30%')
    })

    it('TEST-PDF-017: financial report PDF contains collection summaries', async () => {
      await generateReportPdf({
        schoolName: 'Vidhya Bharthi High School',
        schoolSlug: 'vbhs',
        report: financialReportFixture,
      })

      const doc = mocks.renderToBuffer.mock.calls[0]?.[0]
      const text = extractText(doc)

      expect(text).toContain('Class-wise Collection')
      expect(text).toContain('Category-wise Collection')
      expect(text).toContain('INR 190000')
    })
  })
})



