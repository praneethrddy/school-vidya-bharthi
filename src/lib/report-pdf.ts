import { renderToBuffer, Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import { createElement, type ReactNode } from 'react'
import { uploadFile } from '@/lib/r2'
import type { ReportPayload } from '@/lib/report-types'

const styles = StyleSheet.create({
  page: {
    padding: 28,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#0f172a',
  },
  header: {
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
  },
  schoolName: {
    fontSize: 20,
    fontWeight: 700,
  },
  reportTitle: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: 700,
  },
  reportMeta: {
    marginTop: 2,
    color: '#475569',
  },
  section: {
    marginTop: 12,
  },
  sectionTitle: {
    marginBottom: 6,
    fontSize: 12,
    fontWeight: 700,
  },
  summaryGrid: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  summaryCard: {
    width: '31%',
    padding: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    backgroundColor: '#f8fafc',
  },
  summaryLabel: {
    color: '#64748b',
    fontSize: 9,
  },
  summaryValue: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: 700,
  },
  table: {
    display: 'flex',
    width: 'auto',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderBottomWidth: 0,
  },
  row: {
    display: 'flex',
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
  },
  headerCell: {
    backgroundColor: '#e2e8f0',
    fontWeight: 700,
  },
  cell: {
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRightWidth: 1,
    borderRightColor: '#cbd5e1',
  },
  bodyText: {
    color: '#334155',
  },
})

function titleForReport(report: ReportPayload): string {
  switch (report.report_type) {
    case 'attendance':
      return 'Attendance Report'
    case 'staff_attendance':
      return 'Staff Attendance Report'
    case 'academic':
      return 'Academic Performance Report'
    case 'financial':
      return 'Financial Collection Report'
  }
}

function getFileName(report: ReportPayload): string {
  const suffix = new Date().toISOString().replace(/[:.]/g, '-')
  return `${report.report_type}-report-${suffix}.pdf`
}

function h(type: any, props?: Record<string, unknown> | null, ...children: ReactNode[]) {
  return createElement(type, props, ...children)
}

function text(content: string, style?: any) {
  return h(Text, { style }, content)
}

function view(children: ReactNode[], style?: any) {
  return h(View, { style }, ...children)
}

function renderSummary(items: Array<{ label: string; value: string }>) {
  return view(
    items.map((item) =>
      view(
        [text(item.label, styles.summaryLabel), text(item.value, styles.summaryValue)],
        styles.summaryCard
      )
    ),
    styles.summaryGrid
  )
}

function renderTable(headers: string[], rows: string[][], widths?: string[]) {
  const widthValues = widths || headers.map(() => `${Math.floor(100 / headers.length)}%`)

  return view(
    [
      view(
        headers.map((header, index) =>
          view([text(header, styles.headerCell)], [styles.cell, { width: widthValues[index] }])
        ),
        styles.row
      ),
      ...rows.map((row, rowIndex) =>
        view(
          row.map((cell, index) =>
            view([text(cell, styles.bodyText)], [styles.cell, { width: widthValues[index] }])
          ),
          { ...styles.row, backgroundColor: rowIndex % 2 === 0 ? '#ffffff' : '#f8fafc' }
        )
      ),
    ],
    styles.table
  )
}

function renderAttendanceSections(report: Extract<ReportPayload, { report_type: 'attendance' }>) {
  return [
    view(
      [
        text('Overview', styles.sectionTitle),
        renderSummary([
          { label: 'Class', value: `${report.class.name}${report.class.section ? ` ${report.class.section}` : ''}` },
          { label: 'Average Attendance', value: `${report.data.overall.average_attendance}%` },
          { label: 'Best Student', value: report.data.overall.best_attendance_student },
          { label: 'Needs Attention', value: report.data.overall.worst_attendance_student },
        ]),
      ],
      styles.section
    ),
    view(
      [
        text('Student-wise Breakdown', styles.sectionTitle),
        renderTable(
          ['Student', 'Roll', 'Days', 'Present', 'Absent', 'Late', 'Half Day', 'Attendance %'],
          report.data.student_wise.map((student) => [
            student.student_name,
            student.roll_number || '-',
            String(student.total_days),
            String(student.present),
            String(student.absent),
            String(student.late),
            String(student.half_day),
            `${student.percentage}%`,
          ]),
          ['24%', '10%', '8%', '10%', '10%', '8%', '10%', '12%']
        ),
      ],
      styles.section
    ),
    view(
      [
        text('Daily Summary', styles.sectionTitle),
        renderTable(
          ['Date', 'Present', 'Absent', 'Attendance %'],
          report.data.daily_summary.map((day) => [
            day.date,
            String(day.present),
            String(day.absent),
            `${day.percentage}%`,
          ]),
          ['34%', '18%', '18%', '30%']
        ),
      ],
      styles.section
    ),
  ]
}

function renderStaffAttendanceSections(
  report: Extract<ReportPayload, { report_type: 'staff_attendance' }>
) {
  return [
    view(
      [
        text('Overview', styles.sectionTitle),
        renderSummary([
          { label: 'Department', value: report.department || 'All Departments' },
          { label: 'Average Attendance', value: `${report.data.overall.average_attendance}%` },
          { label: 'Best Staff Member', value: report.data.overall.best_attendance_staff },
          { label: 'Needs Attention', value: report.data.overall.worst_attendance_staff },
        ]),
      ],
      styles.section
    ),
    view(
      [
        text('Staff-wise Breakdown', styles.sectionTitle),
        renderTable(
          ['Staff', 'Code', 'Days', 'Present', 'Absent', 'Late', 'Half Day', 'Leave', 'Attendance %'],
          report.data.staff_wise.map((staffMember) => [
            staffMember.staff_name,
            staffMember.employee_code || '-',
            String(staffMember.total_days),
            String(staffMember.present),
            String(staffMember.absent),
            String(staffMember.late),
            String(staffMember.half_day),
            String(staffMember.leave),
            `${staffMember.percentage}%`,
          ]),
          ['22%', '9%', '8%', '8%', '8%', '8%', '10%', '8%', '12%']
        ),
      ],
      styles.section
    ),
  ]
}

function renderAcademicSections(report: Extract<ReportPayload, { report_type: 'academic' }>) {
  return [
    view(
      [
        text('Overview', styles.sectionTitle),
        renderSummary([
          {
            label: 'Class',
            value: `${report.class.name}${report.class.section ? ` ${report.class.section}` : ''}`,
          },
          { label: 'Term', value: report.term.name || 'All Terms' },
          { label: 'Exam', value: report.exam.name || 'All Exams' },
          { label: 'Overall Average', value: `${report.data.summary.overall_average}%` },
          {
            label: 'Pass Percentage',
            value: `${report.data.summary.overall_pass_percentage}%`,
          },
          {
            label: 'Students Evaluated',
            value: String(report.data.summary.students_evaluated),
          },
        ]),
      ],
      styles.section
    ),
    view(
      [
        text('Subject Performance', styles.sectionTitle),
        renderTable(
          ['Subject', 'Avg', 'High', 'Low', 'Pass %', 'Students'],
          report.data.subject_performance.map((subject) => [
            subject.subject_name,
            String(subject.average_marks),
            String(subject.highest_marks),
            String(subject.lowest_marks),
            `${subject.pass_percentage}%`,
            String(subject.students_evaluated),
          ]),
          ['34%', '12%', '12%', '12%', '15%', '15%']
        ),
      ],
      styles.section
    ),
    view(
      [
        text('Class Toppers', styles.sectionTitle),
        renderTable(
          ['Rank', 'Student', 'Roll', 'Marks', 'Percentage'],
          report.data.toppers.map((topper) => [
            `#${topper.rank}`,
            topper.student_name,
            topper.roll_number || '-',
            `${topper.total_marks}/${topper.total_max_marks}`,
            `${topper.percentage}%`,
          ]),
          ['12%', '36%', '16%', '18%', '18%']
        ),
      ],
      styles.section
    ),
    view(
      [
        text('Grade Distribution', styles.sectionTitle),
        renderTable(
          ['Grade', 'Students', 'Percentage'],
          report.data.grade_distribution.map((bucket) => [
            bucket.grade,
            String(bucket.count),
            `${bucket.percentage}%`,
          ]),
          ['34%', '33%', '33%']
        ),
      ],
      styles.section
    ),
  ]
}

function renderFinancialSections(report: Extract<ReportPayload, { report_type: 'financial' }>) {
  return [
    view(
      [
        text('Overview', styles.sectionTitle),
        renderSummary([
          { label: 'Expected', value: `INR ${report.data.total_expected}` },
          { label: 'Collected', value: `INR ${report.data.total_collected}` },
          { label: 'Outstanding', value: `INR ${report.data.total_outstanding}` },
          { label: 'Collection %', value: `${report.data.collection_percentage}%` },
          { label: 'Defaulters', value: String(report.data.defaulter_count) },
          {
            label: 'Defaulter Outstanding',
            value: `INR ${report.data.total_defaulter_outstanding}`,
          },
        ]),
      ],
      styles.section
    ),
    view(
      [
        text('Class-wise Collection', styles.sectionTitle),
        renderTable(
          ['Class', 'Expected', 'Collected', 'Outstanding', 'Collection %'],
          report.data.class_wise_collection.map((item) => [
            item.name,
            `INR ${item.expected}`,
            `INR ${item.collected}`,
            `INR ${item.outstanding}`,
            `${item.collection_percentage}%`,
          ]),
          ['28%', '18%', '18%', '18%', '18%']
        ),
      ],
      styles.section
    ),
    view(
      [
        text('Category-wise Collection', styles.sectionTitle),
        renderTable(
          ['Category', 'Expected', 'Collected', 'Outstanding', 'Collection %'],
          report.data.category_wise_collection.map((item) => [
            item.name,
            `INR ${item.expected}`,
            `INR ${item.collected}`,
            `INR ${item.outstanding}`,
            `${item.collection_percentage}%`,
          ]),
          ['28%', '18%', '18%', '18%', '18%']
        ),
      ],
      styles.section
    ),
  ]
}

function renderReportBody(report: ReportPayload) {
  switch (report.report_type) {
    case 'attendance':
      return renderAttendanceSections(report)
    case 'staff_attendance':
      return renderStaffAttendanceSections(report)
    case 'academic':
      return renderAcademicSections(report)
    case 'financial':
      return renderFinancialSections(report)
  }
}

export async function generateReportPdf(params: {
  schoolName: string
  schoolSlug: string
  report: ReportPayload
}): Promise<{ buffer: Buffer; url: string; fileName: string }> {
  const fileName = getFileName(params.report)
  const generatedAt = new Date().toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })

  const periodText =
    'period' in params.report
      ? `${params.report.period.from} to ${params.report.period.to}`
      : params.report.report_type === 'academic'
        ? `${params.report.term.name || 'All terms'}${params.report.exam.name ? ` • ${params.report.exam.name}` : ''}`
        : ''

  const document = h(
    Document,
    null,
    h(
      Page,
      { size: 'A4', style: styles.page },
      view(
        [
          text(params.schoolName, styles.schoolName),
          text(titleForReport(params.report), styles.reportTitle),
          text(periodText, styles.reportMeta),
          text(`Generated ${generatedAt}`, styles.reportMeta),
        ],
        styles.header
      ),
      ...renderReportBody(params.report)
    )
  )

  const buffer = await renderToBuffer(document as any)
  const key = `reports/${params.schoolSlug}/${params.report.report_type}/${fileName}`
  const url = await uploadFile(key, buffer, 'application/pdf')

  return {
    buffer,
    url,
    fileName,
  }
}
