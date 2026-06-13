import { describe, expect, it } from 'vitest'
import { adminNavItems } from '@/lib/admin-nav'

describe('admin-nav configuration', () => {
  it('TEST-ANAV-001 contains the expected admin dashboard menu items', () => {
    expect(adminNavItems.map((item) => item.key)).toEqual([
      'dashboard',
      'students',
      'staff',
      'attendance',
      'grades',
      'fees',
      'imports',
      'timetable',
      'admissions',
      'library',
      'transport',
      'circulars',
      'reports',
      'settings',
      'permissions',
    ])
  })

  it('TEST-ANAV-002 maps permissions correctly for representative nav items', () => {
    expect(adminNavItems.find((item) => item.key === 'attendance')).toEqual(
      expect.objectContaining({
        permissions: ['ATTENDANCE.view_all', 'ATTENDANCE.view_own_class'],
      })
    )
    expect(adminNavItems.find((item) => item.key === 'grades')).toEqual(
      expect.objectContaining({
        permissions: ['GRADES.view_all', 'GRADES.view_own_subject'],
      })
    )
    expect(adminNavItems.find((item) => item.key === 'reports')).toEqual(
      expect.objectContaining({
        permissions: ['REPORTS.view_attendance', 'REPORTS.view_academic', 'REPORTS.view_financial'],
      })
    )
  })

  it('TEST-ANAV-003 permissions=null items are unrestricted unless principalOnly', () => {
    const unrestricted = adminNavItems.filter((item) => item.permissions === null)
    expect(unrestricted.map((item) => item.key)).toEqual(['dashboard', 'permissions'])
    expect(unrestricted.find((item) => item.key === 'dashboard')?.principalOnly).toBeUndefined()
  })

  it('TEST-ANAV-004 permissions nav item is flagged as principalOnly', () => {
    const permissionsItem = adminNavItems.find((item) => item.key === 'permissions')
    expect(permissionsItem).toEqual(
      expect.objectContaining({
        href: '/admin/permissions',
        permissions: null,
        principalOnly: true,
      })
    )
    expect(adminNavItems.filter((item) => item.principalOnly).map((item) => item.key)).toEqual([
      'permissions',
    ])
  })
})
