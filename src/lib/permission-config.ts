export const APP_ROLES = [
  'SUPER_ADMIN',
  'PRINCIPAL',
  'STAFF_ADMIN',
  'STUDENT_ADMIN',
  'ACCOUNTANT',
  'TEACHER',
  'STUDENT',
  'PARENT',
] as const

export type AppRole = (typeof APP_ROLES)[number]

export const CONFIGURABLE_ROLES = [
  'STAFF_ADMIN',
  'STUDENT_ADMIN',
  'ACCOUNTANT',
  'TEACHER',
] as const

export type ConfigurableRole = (typeof CONFIGURABLE_ROLES)[number]

export const PERMISSION_MODULE_ORDER = [
  'ATTENDANCE',
  'GRADES',
  'FEES',
  'STUDENTS',
  'STAFF',
  'TIMETABLE',
  'HOMEWORK',
  'ANNOUNCEMENTS',
  'ADMISSIONS',
  'LIBRARY',
  'TRANSPORT',
  'REPORTS',
  'SETTINGS',
] as const

export const PRINCIPAL_ONLY_PERMISSION_CODES = [
  'ATTENDANCE.delete',
  'FEES.approve_concession',
  'FEES.configure_structure',
  'STUDENTS.delete',
  'STAFF.delete',
  'ADMISSIONS.admit',
  'ADMISSIONS.reject',
  'SETTINGS.manage_permissions',
] as const

export const PRINCIPAL_ONLY_PERMISSION_SET = new Set<string>(PRINCIPAL_ONLY_PERMISSION_CODES)

export const ROLE_PERMISSION_DEFAULTS: Record<ConfigurableRole, string[]> = {
  STAFF_ADMIN: ['STAFF.create', 'STAFF.view', 'STAFF.edit', 'ATTENDANCE.view_all'],
  STUDENT_ADMIN: [
    'STUDENTS.create',
    'STUDENTS.view',
    'STUDENTS.edit',
    'STUDENTS.promote',
    'STUDENTS.assign_class',
    'ADMISSIONS.create',
    'ADMISSIONS.view',
    'ADMISSIONS.process',
    'ADMISSIONS.shortlist',
    'ADMISSIONS.schedule_test',
  ],
  ACCOUNTANT: [
    'FEES.view_structure',
    'FEES.record_payment',
    'FEES.generate_receipt',
    'FEES.view_reports',
    'FEES.view_defaulters',
    'FEES.create_concession_request',
  ],
  TEACHER: [
    'ATTENDANCE.mark',
    'ATTENDANCE.view_own_class',
    'GRADES.enter',
    'GRADES.view_own_subject',
    'HOMEWORK.create',
    'HOMEWORK.view',
    'HOMEWORK.edit',
    'HOMEWORK.grade_submissions',
    'TIMETABLE.view',
  ],
}

export function isConfigurableRole(role: string): role is ConfigurableRole {
  return CONFIGURABLE_ROLES.includes(role as ConfigurableRole)
}

export function isAppRole(role: string): role is AppRole {
  return APP_ROLES.includes(role as AppRole)
}
