export interface AdminNavItem {
  key: string
  label: string
  href: string
  permissions: string[] | null
  principalOnly?: boolean
}

export const adminNavItems: AdminNavItem[] = [
  { key: 'dashboard', label: 'Dashboard', href: '/admin/dashboard', permissions: null },
  { key: 'students', label: 'Students', href: '/admin/students', permissions: ['STUDENTS.view'] },
  { key: 'staff', label: 'Staff', href: '/admin/staff', permissions: ['STAFF.view'] },
  {
    key: 'attendance',
    label: 'Attendance',
    href: '/admin/attendance',
    permissions: ['ATTENDANCE.view_all', 'ATTENDANCE.view_own_class'],
  },
  {
    key: 'grades',
    label: 'Grades',
    href: '/admin/grades',
    permissions: ['GRADES.view_all', 'GRADES.view_own_subject'],
  },
  { key: 'fees', label: 'Fees', href: '/admin/fees', permissions: ['FEES.view_structure'] },
  {
    key: 'imports',
    label: 'Imports',
    href: '/admin/import',
    permissions: ['STUDENTS.create', 'STAFF.create', 'FEES.record_payment'],
  },
  {
    key: 'timetable',
    label: 'Timetable',
    href: '/admin/timetable',
    permissions: ['TIMETABLE.view'],
  },
  {
    key: 'admissions',
    label: 'Admissions',
    href: '/admin/admissions',
    permissions: ['ADMISSIONS.view'],
  },
  { key: 'library', label: 'Library', href: '/admin/library', permissions: ['LIBRARY.view'] },
  {
    key: 'transport',
    label: 'Transport',
    href: '/admin/transport',
    permissions: ['TRANSPORT.view'],
  },
  {
    key: 'circulars',
    label: 'Circulars',
    href: '/admin/circulars',
    permissions: ['ANNOUNCEMENTS.view'],
  },
  {
    key: 'reports',
    label: 'Reports',
    href: '/admin/reports',
    permissions: ['REPORTS.view_attendance', 'REPORTS.view_academic', 'REPORTS.view_financial'],
  },
  {
    key: 'settings',
    label: 'Settings',
    href: '/admin/settings',
    permissions: ['SETTINGS.manage_school_settings'],
  },
  {
    key: 'permissions',
    label: 'Permissions',
    href: '/admin/permissions',
    permissions: null,
    principalOnly: true,
  },
]
