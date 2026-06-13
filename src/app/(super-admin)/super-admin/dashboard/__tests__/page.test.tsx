import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  getPlatformAnalytics: vi.fn(),
  listPlatformSchools: vi.fn(),
  platformMetricsProps: vi.fn(),
  schoolTableProps: vi.fn(),
}))

vi.mock('@/lib/saas', () => ({
  getPlatformAnalytics: mocks.getPlatformAnalytics,
  listPlatformSchools: mocks.listPlatformSchools,
}))

vi.mock('@/components/super-admin/platform-metrics', () => ({
  PlatformMetrics: (props: unknown) => {
    mocks.platformMetricsProps(props)
    return <div data-testid="platform-metrics">Platform metrics</div>
  },
}))

vi.mock('@/components/super-admin/school-table', () => ({
  SchoolTable: (props: unknown) => {
    mocks.schoolTableProps(props)
    return <div data-testid="school-table">School table</div>
  },
}))

import SuperAdminDashboardPage from '../page'

describe('super-admin dashboard page', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mocks.getPlatformAnalytics.mockResolvedValue({
      total_schools: 12,
      active_schools: 10,
      suspended_schools: 2,
      total_users: 680,
      total_students: 6100,
      total_staff: 410,
      total_mrr: 2450000,
    })

    mocks.listPlatformSchools.mockResolvedValue(
      Array.from({ length: 6 }, (_, index) => ({
        id: `school-${index + 1}`,
        name: `School ${index + 1}`,
        slug: `school-${index + 1}`,
        email: `school${index + 1}@example.com`,
        logo_url: null,
        city: 'Bengaluru',
        state: 'Karnataka',
        is_active: true,
        created_at: '2026-01-01T00:00:00.000Z',
        principal_email: `principal${index + 1}@example.com`,
        student_count: 300 + index,
        staff_count: 25 + index,
        user_count: 30 + index,
        total_revenue: 100000 + index,
        custom_domain: null,
        platform_plan: 'GROWTH',
        platform_status: 'TRIAL',
      }))
    )
  })

  it('TEST-SA-001: dashboard page renders and passes top 5 schools to table', async () => {
    const view = await SuperAdminDashboardPage()
    render(view)

    expect(screen.getByText('Recent Tenants')).toBeInTheDocument()
    expect(screen.getByText('Platform Pulse')).toBeInTheDocument()
    expect(screen.getByTestId('platform-metrics')).toBeInTheDocument()
    expect(screen.getByTestId('school-table')).toBeInTheDocument()

    const platformMetricsInput = mocks.platformMetricsProps.mock.calls[0]?.[0] as {
      analytics?: unknown
    }
    expect(platformMetricsInput.analytics).toEqual(
      expect.objectContaining({
        total_schools: 12,
        active_schools: 10,
      })
    )

    const schoolTableInput = mocks.schoolTableProps.mock.calls[0]?.[0] as {
      initialSchools?: unknown[]
    }
    expect(schoolTableInput.initialSchools).toHaveLength(5)
  })
})
