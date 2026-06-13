import { describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import {
  assignClassSchema,
  createStudentSchema,
  getRequestMetadata,
  isPrincipalRole,
  mapStudentRow,
  parentCreateSchema,
  parentLinkSchema,
  parseStudentListQuery,
  studentAccountSchema,
  studentOrderBy,
  updateStudentSchema,
} from '@/lib/student-management'

const classId = '11111111-1111-1111-1111-111111111111'
const yearId = '22222222-2222-2222-2222-222222222222'
const parentId = '33333333-3333-3333-3333-333333333333'

describe('student-management', () => {
  it('TEST-SM-001 createStudentSchema validates all required fields', () => {
    const result = createStudentSchema.safeParse({
      admission_number: 'ADM-1002',
      first_name: 'Sneha',
      last_name: 'Patel',
      date_of_birth: '2011-09-20',
      class_id: classId,
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.first_name).toBe('Sneha')
      expect(result.data.class_id).toBe(classId)
      expect(result.data.is_active).toBe(true)
    }
  })

  it('TEST-SM-002 updateStudentSchema allows partial updates', () => {
    const validPartial = updateStudentSchema.safeParse({
      first_name: 'Updated',
      class_id: classId,
    })
    const invalidEmpty = updateStudentSchema.safeParse({})

    expect(validPartial.success).toBe(true)
    expect(invalidEmpty.success).toBe(false)
  })

  it('TEST-SM-003 assignClassSchema validates UUID class_id', () => {
    const valid = assignClassSchema.safeParse({
      class_id: classId,
      academic_year_id: yearId,
    })
    const invalid = assignClassSchema.safeParse({
      class_id: 'grade-6-a',
    })

    expect(valid.success).toBe(true)
    expect(invalid.success).toBe(false)
  })

  it('TEST-SM-004 parentCreateSchema validates phone min length', () => {
    const invalid = parentCreateSchema.safeParse({
      first_name: 'Asha',
      last_name: 'Sharma',
      phone: '12345',
    })
    const valid = parentCreateSchema.safeParse({
      first_name: 'Asha',
      last_name: 'Sharma',
      phone: '123456',
    })

    expect(invalid.success).toBe(false)
    expect(valid.success).toBe(true)
  })

  it('TEST-SM-005 parentLinkSchema requires exactly one existing/create parent mode', () => {
    const bothProvided = parentLinkSchema.safeParse({
      existing_parent_id: parentId,
      create_parent: {
        first_name: 'Ravi',
        last_name: 'Sharma',
        phone: '9999999999',
      },
    })
    const noneProvided = parentLinkSchema.safeParse({})
    const existingOnly = parentLinkSchema.safeParse({ existing_parent_id: parentId })
    const createOnly = parentLinkSchema.safeParse({
      create_parent: {
        first_name: 'Ravi',
        last_name: 'Sharma',
        phone: '9999999999',
      },
    })

    expect(bothProvided.success).toBe(false)
    expect(noneProvided.success).toBe(false)
    expect(existingOnly.success).toBe(true)
    expect(createOnly.success).toBe(true)
  })

  it('TEST-SM-006 studentAccountSchema requires email when create_user=true', () => {
    const invalid = studentAccountSchema.safeParse({
      create_user: true,
    })

    expect(invalid.success).toBe(false)
    if (!invalid.success) {
      expect(invalid.error.issues.some((issue) => issue.path.join('.') === 'email')).toBe(true)
    }
  })

  it('TEST-SM-007 studentAccountSchema requires password when auto_generate=false', () => {
    const invalid = studentAccountSchema.safeParse({
      create_user: true,
      email: 'student@example.com',
      auto_generate_password: false,
    })

    expect(invalid.success).toBe(false)
    if (!invalid.success) {
      expect(invalid.error.issues.some((issue) => issue.path.join('.') === 'password')).toBe(true)
    }
  })

  it('TEST-SM-008 parseStudentListQuery parses all URL search params', () => {
    const parsed = parseStudentListQuery(
      new URLSearchParams({
        search: 'aditya',
        parent_search: 'sharma',
        class_id: classId,
        gender: 'MALE',
        is_active: 'true',
        page: '2',
        limit: '10',
        sort_by: 'admission_number',
        sort_order: 'desc',
      })
    )

    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.search).toBe('aditya')
      expect(parsed.data.parent_search).toBe('sharma')
      expect(parsed.data.class_id).toBe(classId)
      expect(parsed.data.gender).toBe('MALE')
      expect(parsed.data.is_active).toBe('true')
      expect(parsed.data.page).toBe(2)
      expect(parsed.data.limit).toBe(10)
      expect(parsed.data.sort_by).toBe('admission_number')
      expect(parsed.data.sort_order).toBe('desc')
    }
  })

  it('TEST-SM-009 studentOrderBy maps sort keys correctly', () => {
    expect(studentOrderBy('name', 'asc')).toEqual([{ first_name: 'asc' }, { last_name: 'asc' }])
    expect(studentOrderBy('admission_number', 'desc')).toEqual([{ admission_number: 'desc' }])
    expect(studentOrderBy('class', 'asc')).toEqual([
      { class: { name: 'asc' } },
      { class: { section: 'asc' } },
      { first_name: 'asc' },
    ])
  })

  it('TEST-SM-010 mapStudentRow formats list item shape', () => {
    const mapped = mapStudentRow({
      id: 'student-1',
      admission_number: 'ADM-1234',
      first_name: 'Aarav',
      last_name: 'Sharma',
      class_id: classId,
      class: {
        name: 'Grade 6',
        section: 'A',
      },
      gender: 'MALE',
      is_active: true,
      photo_url: null,
    })

    expect(mapped).toEqual({
      id: 'student-1',
      admission_number: 'ADM-1234',
      name: 'Aarav Sharma',
      class_id: classId,
      class: 'Grade 6',
      section: 'A',
      gender: 'MALE',
      is_active: true,
      photo_url: null,
    })
  })

  it('TEST-SM-011 isPrincipalRole returns true for PRINCIPAL and SUPER_ADMIN', () => {
    expect(isPrincipalRole('PRINCIPAL')).toBe(true)
    expect(isPrincipalRole('SUPER_ADMIN')).toBe(true)
    expect(isPrincipalRole('STUDENT_ADMIN')).toBe(false)
  })

  it('TEST-SM-012 getRequestMetadata extracts first forwarded IP and user-agent', () => {
    const request = new NextRequest('http://localhost/api/students', {
      headers: {
        'x-forwarded-for': '10.0.0.1, 10.0.0.2',
        'x-real-ip': '10.0.0.9',
        'user-agent': 'vitest-agent',
      },
    })

    expect(getRequestMetadata(request)).toEqual({
      ip_address: '10.0.0.1',
      user_agent: 'vitest-agent',
    })
  })
})
