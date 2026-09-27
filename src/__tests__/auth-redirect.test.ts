import { expect, test } from 'vitest'
import { getRedirectPath } from '@/lib/auth-redirect'
import { Role } from '@prisma/client'

test('getRedirectPath returns platform dashboard for super admin', () => {
  expect(getRedirectPath(Role.SUPER_ADMIN)).toBe('/super-admin/dashboard')
})

test('getRedirectPath returns admin dashboard for school admin roles', () => {
  expect(getRedirectPath(Role.PRINCIPAL)).toBe('/admin/dashboard')
  expect(getRedirectPath(Role.STAFF_ADMIN)).toBe('/admin/dashboard')
  expect(getRedirectPath(Role.STUDENT_ADMIN)).toBe('/admin/dashboard')
  expect(getRedirectPath(Role.ACCOUNTANT)).toBe('/admin/dashboard')
  expect(getRedirectPath(Role.TEACHER)).toBe('/admin/dashboard')
})

test('getRedirectPath returns portal dashboard for student/parent roles', () => {
  expect(getRedirectPath(Role.STUDENT)).toBe('/dashboard')
  expect(getRedirectPath(Role.PARENT)).toBe('/dashboard')
})

test('getRedirectPath returns login for unknown roles', () => {
  expect(getRedirectPath('UNKNOWN_ROLE')).toBe('/login')
  expect(getRedirectPath('')).toBe('/login')
})
