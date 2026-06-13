import * as XLSX from 'xlsx'
import type { ReportPayload } from '@/lib/report-types'

function getFileName(report: ReportPayload): string {
  const suffix = new Date().toISOString().replace(/[:.]/g, '-')
  return `${report.report_type}-report-${suffix}.xlsx`
}

function appendSheet(workbook: XLSX.WorkBook, name: string, rows: Array<Array<string | number>>) {
  const sheet = XLSX.utils.aoa_to_sheet(rows)
  XLSX.utils.book_append_sheet(workbook, sheet, name.slice(0, 31))
}

export async function generateReportExcel(report: ReportPayload): Promise<{
  buffer: Buffer
  fileName: string
  contentType: string
}> {
  const workbook = XLSX.utils.book_new()

  switch (report.report_type) {
    case 'attendance':
      appendSheet(workbook, 'Summary', [
        ['Report Type', 'Attendance'],
        ['Period From', report.period.from],
        ['Period To', report.period.to],
        ['Class', `${report.class.name}${report.class.section ? ` ${report.class.section}` : ''}`],
        ['Average Attendance %', report.data.overall.average_attendance],
        ['Best Student', report.data.overall.best_attendance_student],
        ['Needs Attention', report.data.overall.worst_attendance_student],
      ])
      appendSheet(workbook, 'Student Wise', [
        ['Student', 'Roll Number', 'Total Days', 'Present', 'Absent', 'Late', 'Half Day', 'Attendance %'],
        ...report.data.student_wise.map((student) => [
          student.student_name,
          student.roll_number,
          student.total_days,
          student.present,
          student.absent,
          student.late,
          student.half_day,
          student.percentage,
        ]),
      ])
      appendSheet(workbook, 'Daily Summary', [
        ['Date', 'Present', 'Absent', 'Attendance %'],
        ...report.data.daily_summary.map((day) => [
          day.date,
          day.present,
          day.absent,
          day.percentage,
        ]),
      ])
      break
    case 'staff_attendance':
      appendSheet(workbook, 'Summary', [
        ['Report Type', 'Staff Attendance'],
        ['Period From', report.period.from],
        ['Period To', report.period.to],
        ['Department', report.department || 'All Departments'],
        ['Average Attendance %', report.data.overall.average_attendance],
        ['Best Staff Member', report.data.overall.best_attendance_staff],
        ['Needs Attention', report.data.overall.worst_attendance_staff],
      ])
      appendSheet(workbook, 'Staff Wise', [
        ['Staff', 'Employee Code', 'Total Days', 'Present', 'Absent', 'Late', 'Half Day', 'Leave', 'Attendance %'],
        ...report.data.staff_wise.map((staffMember) => [
          staffMember.staff_name,
          staffMember.employee_code,
          staffMember.total_days,
          staffMember.present,
          staffMember.absent,
          staffMember.late,
          staffMember.half_day,
          staffMember.leave,
          staffMember.percentage,
        ]),
      ])
      appendSheet(workbook, 'Daily Summary', [
        ['Date', 'Present', 'Absent', 'Attendance %'],
        ...report.data.daily_summary.map((day) => [
          day.date,
          day.present,
          day.absent,
          day.percentage,
        ]),
      ])
      break
    case 'academic':
      appendSheet(workbook, 'Summary', [
        ['Report Type', 'Academic'],
        ['Class', `${report.class.name}${report.class.section ? ` ${report.class.section}` : ''}`],
        ['Term', report.term.name || 'All Terms'],
        ['Exam', report.exam.name || 'All Exams'],
        ['Overall Average %', report.data.summary.overall_average],
        ['Overall Pass %', report.data.summary.overall_pass_percentage],
        ['Students Evaluated', report.data.summary.students_evaluated],
      ])
      appendSheet(workbook, 'Subject Performance', [
        ['Subject', 'Average', 'Highest', 'Lowest', 'Pass %', 'Fail %', 'Students Evaluated'],
        ...report.data.subject_performance.map((subject) => [
          subject.subject_name,
          subject.average_marks,
          subject.highest_marks,
          subject.lowest_marks,
          subject.pass_percentage,
          subject.fail_percentage,
          subject.students_evaluated,
        ]),
      ])
      appendSheet(workbook, 'Toppers', [
        ['Rank', 'Student', 'Roll Number', 'Total Marks', 'Total Max Marks', 'Percentage'],
        ...report.data.toppers.map((topper) => [
          topper.rank,
          topper.student_name,
          topper.roll_number,
          topper.total_marks,
          topper.total_max_marks,
          topper.percentage,
        ]),
      ])
      appendSheet(workbook, 'Grade Distribution', [
        ['Grade', 'Count', 'Percentage'],
        ...report.data.grade_distribution.map((item) => [item.grade, item.count, item.percentage]),
      ])
      appendSheet(workbook, 'Exam Comparison', [
        ['Exam', 'Average Percentage', 'Pass Percentage'],
        ...report.data.exam_comparison.map((item) => [
          item.exam_name,
          item.average_percentage,
          item.pass_percentage,
        ]),
      ])
      break
    case 'financial':
      appendSheet(workbook, 'Summary', [
        ['Report Type', 'Financial'],
        ['Period From', report.period.from],
        ['Period To', report.period.to],
        ['Total Expected', report.data.total_expected],
        ['Total Collected', report.data.total_collected],
        ['Total Outstanding', report.data.total_outstanding],
        ['Collection Percentage', report.data.collection_percentage],
        ['Defaulter Count', report.data.defaulter_count],
        ['Defaulter Outstanding', report.data.total_defaulter_outstanding],
      ])
      appendSheet(workbook, 'Class Breakdown', [
        ['Class', 'Expected', 'Collected', 'Outstanding', 'Collection %'],
        ...report.data.class_wise_collection.map((item) => [
          item.name,
          item.expected,
          item.collected,
          item.outstanding,
          item.collection_percentage,
        ]),
      ])
      appendSheet(workbook, 'Category Breakdown', [
        ['Category', 'Expected', 'Collected', 'Outstanding', 'Collection %'],
        ...report.data.category_wise_collection.map((item) => [
          item.name,
          item.expected,
          item.collected,
          item.outstanding,
          item.collection_percentage,
        ]),
      ])
      appendSheet(workbook, 'Monthly Trend', [
        ['Month', 'Collected'],
        ...report.data.month_wise_trend.map((item) => [item.month, item.collected]),
      ])
      break
  }

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer

  return {
    buffer,
    fileName: getFileName(report),
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  }
}
