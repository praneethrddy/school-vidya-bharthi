import { describe, expect, it } from 'vitest'
import {
  applyStaffFilters,
  calculateStaffWorkload,
  createStaffSchema,
  parseStaffListQuery,
} from '@/lib/staff-management'

describe('staff-management utilities', () => {
  it('validates role restrictions during account creation (no PRINCIPAL/SUPER_ADMIN)', () => {
    const parsed = createStaffSchema.safeParse({
      employee_code: 'EMP-1',
      first_name: 'Anika',
      last_name: 'Rao',
      create_account: true,
      email: 'anika@school.com',
      role: 'PRINCIPAL',
      auto_generate_password: true,
    })

    expect(parsed.success).toBe(false)
  })

  it('computes total workload from assigned subject periods', () => {
    const workload = calculateStaffWorkload([
      { subject: { periods_per_week: 5 } },
      { subject: { periods_per_week: 4 } },
      { subject: { periods_per_week: null } },
    ])

    expect(workload).toBe(9)
  })

  it('applies staff list filter logic for search, department, designation, active-only', () => {
    const rows = [
      {
        first_name: 'Anika',
        last_name: 'Rao',
        employee_code: 'EMP-101',
        department: 'Science',
        designation: 'Teacher',
        is_active: true,
      },
      {
        first_name: 'Ravi',
        last_name: 'Kumar',
        employee_code: 'EMP-102',
        department: 'Accounts',
        designation: 'Accountant',
        is_active: false,
      },
    ]

    const result = applyStaffFilters(rows, {
      search: 'ani',
      department: 'Science',
      designation: 'Teacher',
      isActiveOnly: true,
    })

    expect(result).toHaveLength(1)
    expect(result[0].employee_code).toBe('EMP-101')
  })

  it('parses list query defaults and supports all-status filter', () => {
    const params = new URLSearchParams({
      page: '2',
      limit: '10',
      is_active: 'all',
      sort_by: 'department',
      sort_order: 'asc',
    })

    const parsed = parseStaffListQuery(params)
    expect(parsed.success).toBe(true)
    if (!parsed.success) {
      return
    }

    expect(parsed.data.page).toBe(2)
    expect(parsed.data.limit).toBe(10)
    expect(parsed.data.is_active).toBe('all')
    expect(parsed.data.sort_by).toBe('department')
    expect(parsed.data.sort_order).toBe('asc')
  })
})

