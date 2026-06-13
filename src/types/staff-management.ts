export type StaffSortBy = 'created_at' | 'first_name' | 'employee_code' | 'department'
export type StaffSortOrder = 'asc' | 'desc'

export interface StaffListItem {
  id: string
  employee_code: string | null
  first_name: string
  last_name: string
  name: string
  photo_url: string | null
  designation: string | null
  department: string | null
  is_active: boolean
  user_id: string | null
  user_email: string | null
  user_role: string | null
  user_is_active: boolean | null
  subjects_count: number
  created_at: string
  updated_at: string
}

export interface StaffListResponse {
  data: StaffListItem[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
  filters: {
    departments: string[]
    designations: string[]
  }
  search_note: string
}

export interface StaffAttendanceSummary {
  total_records: number
  present: number
  absent: number
  late: number
  half_day: number
  leave: number
}

export interface StaffActivityLogItem {
  id: string
  action: string
  entity_type: string
  entity_id: string
  old_value: unknown
  new_value: unknown
  actor_email: string
  actor_role: string
  created_at: string
}

export interface StaffDetailPayload {
  staff: {
    id: string
    school_id: string
    user_id: string | null
    employee_code: string | null
    first_name: string
    last_name: string
    gender: 'MALE' | 'FEMALE' | 'OTHER' | null
    date_of_birth: string | null
    phone: string | null
    address: string | null
    photo_url: string | null
    designation: string | null
    department: string | null
    date_of_joining: string | null
    qualification: string | null
    is_active: boolean
    created_at: string
    updated_at: string
    user: {
      id: string
      email: string
      role: string
      is_active: boolean
      last_login: string | null
    } | null
  }
  assignments: Array<{
    id: string
    school_id: string
    subject_id: string
    staff_id: string
    academic_year_id: string
    created_at: string
    subject: {
      id: string
      name: string
      code: string | null
      class_id: string
      periods_per_week: number | null
      class: {
        id: string
        name: string
        section: string | null
      }
    }
    academic_year: {
      id: string
      name: string
      is_current: boolean
    }
  }>
  classes_taught: Array<{
    id: string
    name: string
    section: string | null
    class_teacher_id: string | null
    academic_year: {
      id: string
      name: string
    }
  }>
  attendance_summary: StaffAttendanceSummary
  activity: StaffActivityLogItem[]
  lookups: {
    classes: Array<{
      id: string
      name: string
      section: string | null
      class_teacher_id: string | null
      academic_year_id: string
      academic_year: {
        id: string
        name: string
        is_current: boolean
      }
    }>
    subjects: Array<{
      id: string
      name: string
      code: string | null
      class_id: string
      periods_per_week: number | null
      class: {
        id: string
        name: string
        section: string | null
      }
    }>
    academic_years: Array<{
      id: string
      name: string
      is_current: boolean
    }>
  }
}

