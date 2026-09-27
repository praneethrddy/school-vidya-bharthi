export type SortBy = 'name' | 'admission_number' | 'class'
export type SortOrder = 'asc' | 'desc'

export interface StudentListItem {
  id: string
  admission_number: string
  name: string
  class_id: string | null
  class: string | null
  section: string | null
  gender: 'MALE' | 'FEMALE' | 'OTHER' | null
  is_active: boolean
  photo_url: string | null
}

export interface ClassOption {
  id: string
  name: string
  section: string | null
  label: string
  academic_year_id: string
}

export interface AcademicYearOption {
  id: string
  name: string
  is_current: boolean
}

export interface StudentParentLink {
  id: string
  first_name: string
  last_name: string
  name: string
  relation: 'FATHER' | 'MOTHER' | 'GUARDIAN' | null
  email: string | null
  phone: string | null
  is_primary: boolean
  linked_at: string
}

export interface StudentDetail {
  id: string
  admission_number: string
  first_name: string
  last_name: string
  name: string
  gender: 'MALE' | 'FEMALE' | 'OTHER' | null
  date_of_birth: string
  blood_group: string | null
  phone: string | null
  address: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  photo_url: string | null
  class_id: string | null
  class: { id: string; name: string; section: string | null } | null
  academic_year_id: string | null
  academic_year: { id: string; name: string } | null
  admission_date: string | null
  roll_number: string | null
  is_active: boolean
  user: { id: string; email: string; is_active: boolean } | null
  parents: StudentParentLink[]
  created_at: string
  updated_at: string
}

export interface StudentAttendanceSummary {
  total_records: number
  present: number
  absent: number
  late: number
  half_day: number
  holiday: number
}

export interface StudentGradesSummary {
  records: number
  exams: number
  average_marks: number
}

export interface StudentFeesSummary {
  payment_count: number
  total_paid: number
  latest_payment: {
    payment_date: string
    amount_paid: number
    receipt_number: string
  } | null
}

export interface StudentActivityItem {
  id: string
  action: string
  actor_email: string
  actor_role: string
  old_value: unknown
  new_value: unknown
  created_at: string
}

export interface StudentDetailResponsePayload {
  student: StudentDetail
  summaries: {
    attendance: StudentAttendanceSummary
    grades: StudentGradesSummary
    fees: StudentFeesSummary
  }
  activity: StudentActivityItem[]
}

export interface ParentSearchResult {
  id: string
  first_name: string
  last_name: string
  relation: 'FATHER' | 'MOTHER' | 'GUARDIAN' | null
  email: string | null
  name: string
}

