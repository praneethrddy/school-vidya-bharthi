export type ReportFormat = 'json' | 'pdf' | 'excel'

export interface ReportPeriod {
  from: string
  to: string
}

export interface ReportClassInfo {
  id: string
  name: string
  section: string | null
}

export interface AttendanceStudentWiseItem {
  student_id: string
  student_name: string
  roll_number: string
  total_days: number
  present: number
  absent: number
  late: number
  half_day: number
  percentage: number
}

export interface AttendanceDailySummaryItem {
  date: string
  present: number
  absent: number
  percentage: number
}

export interface AttendanceReportData {
  student_wise: AttendanceStudentWiseItem[]
  daily_summary: AttendanceDailySummaryItem[]
  overall: {
    average_attendance: number
    best_attendance_student: string
    worst_attendance_student: string
  }
}

export interface AttendanceReport {
  report_type: 'attendance'
  period: ReportPeriod
  class: ReportClassInfo
  data: AttendanceReportData
}

export interface StaffAttendanceWiseItem {
  staff_id: string
  staff_name: string
  employee_code: string
  total_days: number
  present: number
  absent: number
  late: number
  half_day: number
  leave: number
  percentage: number
}

export interface StaffAttendanceReport {
  report_type: 'staff_attendance'
  period: ReportPeriod
  department: string | null
  data: {
    staff_wise: StaffAttendanceWiseItem[]
    daily_summary: AttendanceDailySummaryItem[]
    overall: {
      average_attendance: number
      best_attendance_staff: string
      worst_attendance_staff: string
    }
  }
}

export interface AcademicSubjectPerformanceItem {
  subject_id: string
  subject_name: string
  pass_percentage: number
  fail_percentage: number
  highest_marks: number
  lowest_marks: number
  average_marks: number
  max_marks: number
  passing_marks: number
  students_evaluated: number
}

export interface AcademicTopperItem {
  rank: number
  student_id: string
  student_name: string
  roll_number: string
  total_marks: number
  total_max_marks: number
  percentage: number
}

export interface AcademicGradeDistributionItem {
  grade: string
  count: number
  percentage: number
}

export interface AcademicExamComparisonItem {
  exam_id: string
  exam_name: string
  average_percentage: number
  pass_percentage: number
}

export interface AcademicReport {
  report_type: 'academic'
  class: ReportClassInfo
  term: {
    id: string | null
    name: string | null
  }
  exam: {
    id: string | null
    name: string | null
  }
  data: {
    subject_performance: AcademicSubjectPerformanceItem[]
    toppers: AcademicTopperItem[]
    grade_distribution: AcademicGradeDistributionItem[]
    exam_comparison: AcademicExamComparisonItem[]
    summary: {
      overall_average: number
      overall_pass_percentage: number
      students_evaluated: number
    }
  }
}

export interface FinancialBreakdownItem {
  id: string
  name: string
  expected: number
  collected: number
  outstanding: number
  collection_percentage: number
}

export interface FinancialTrendItem {
  month: string
  collected: number
}

export interface FinancialReport {
  report_type: 'financial'
  period: ReportPeriod
  filters: {
    class_id: string | null
    fee_category_id: string | null
  }
  data: {
    total_expected: number
    total_collected: number
    total_outstanding: number
    collection_percentage: number
    class_wise_collection: FinancialBreakdownItem[]
    category_wise_collection: FinancialBreakdownItem[]
    month_wise_trend: FinancialTrendItem[]
    defaulter_count: number
    total_defaulter_outstanding: number
  }
}

export interface ReportMetaPayload {
  school: {
    id: string
    name: string
  }
  current_academic_year_id: string | null
  classes: Array<{
    id: string
    name: string
    section: string | null
    academic_year_id: string
  }>
  terms: Array<{
    id: string
    name: string
    academic_year_id: string
  }>
  exams: Array<{
    id: string
    name: string
    class_id: string
    term_id: string
  }>
  fee_categories: Array<{
    id: string
    name: string
  }>
}

export type ReportPayload =
  | AttendanceReport
  | StaffAttendanceReport
  | AcademicReport
  | FinancialReport
