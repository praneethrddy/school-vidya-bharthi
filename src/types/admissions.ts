export type AdmissionStatus =
  | 'APPLIED'
  | 'SHORTLISTED'
  | 'TESTING'
  | 'ADMITTED'
  | 'REJECTED'
  | 'WAITLIST'

export interface AdmissionListItem {
  id: string
  applicant_name: string
  date_of_birth: string
  gender: 'MALE' | 'FEMALE' | 'OTHER'
  applying_for_class: string
  parent_name: string
  parent_phone: string
  parent_email: string | null
  status: AdmissionStatus
  applied_at: string
  processed_by: string | null
  decided_by: string | null
  remarks: string | null
  documents_url: string[]
}

export interface AdmissionDetail extends AdmissionListItem {
  academic_year_id: string
  address: string | null
  previous_school: string | null
  decided_at: string | null
  timeline: AdmissionTimelineItem[]
}

export interface AdmissionTimelineItem {
  id: string
  from_status: AdmissionStatus | null
  to_status: AdmissionStatus | null
  actor_id: string
  created_at: string
  remarks: string | null
}

export interface AdmissionListResponse {
  admissions: AdmissionListItem[]
  pagination: {
    total: number
    page: number
    limit: number
    total_pages: number
  }
  counts: Record<AdmissionStatus, number>
  current_academic_year_id: string | null
}

export interface AdmissionFiltersMeta {
  classes: Array<{ id: string; name: string; section: string | null; label: string }>
  academic_years: Array<{ id: string; name: string; is_current: boolean }>
}
