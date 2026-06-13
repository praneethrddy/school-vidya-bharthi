import { describe, expect, it } from 'vitest'
import { getRedirectPath } from '../auth-redirect'

describe('getRedirectPath', () => {
  it('returns role-based redirect paths for all 8 supported roles', () => {
    expect(getRedirectPath('SUPER_ADMIN')).toBe('/super-admin/dashboard')
    expect(getRedirectPath('PRINCIPAL')).toBe('/admin/dashboard')
    expect(getRedirectPath('STAFF_ADMIN')).toBe('/admin/dashboard')
    expect(getRedirectPath('STUDENT_ADMIN')).toBe('/admin/dashboard')
    expect(getRedirectPath('ACCOUNTANT')).toBe('/admin/dashboard')
    expect(getRedirectPath('TEACHER')).toBe('/admin/dashboard')
    expect(getRedirectPath('STUDENT')).toBe('/dashboard')
    expect(getRedirectPath('PARENT')).toBe('/dashboard')
  })

  it('falls back to login for unknown roles', () => {
    expect(getRedirectPath('UNKNOWN_ROLE')).toBe('/login')
    expect(getRedirectPath('')).toBe('/login')
  })
})
