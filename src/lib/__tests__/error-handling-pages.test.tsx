import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string
    children: React.ReactNode
    [key: string]: unknown
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

import RootErrorPage from '@/app/error'
import RootNotFoundPage from '@/app/not-found'
import RootLoadingPage from '@/app/loading'
import PortalErrorPage from '@/app/(portal)/error'
import PortalNotFoundPage from '@/app/(portal)/not-found'
import PortalLoadingPage from '@/app/(portal)/loading'
import PortalAttendanceLoading from '@/app/(portal)/attendance/loading'
import PortalDashboardLoading from '@/app/(portal)/dashboard/loading'
import PortalFeesLoading from '@/app/(portal)/fees/loading'
import PortalGradesLoading from '@/app/(portal)/grades/loading'
import PortalNotificationsLoading from '@/app/(portal)/notifications/loading'
import PortalProfileLoading from '@/app/(portal)/profile/loading'
import PortalTimetableLoading from '@/app/(portal)/timetable/loading'
import AdminAdmissionsLoading from '@/app/admin/admissions/loading'
import AdminAttendanceLoading from '@/app/admin/attendance/loading'
import AdminDashboardLoading from '@/app/admin/dashboard/loading'
import AdminFeesLoading from '@/app/admin/fees/loading'
import AdminGradesLoading from '@/app/admin/grades/loading'
import AdminImportLoading from '@/app/admin/import/loading'
import AdminReportsLoading from '@/app/admin/reports/loading'
import AdminSettingsLoading from '@/app/admin/settings/loading'
import AdminStaffLoading from '@/app/admin/staff/loading'
import AdminStaffDetailLoading from '@/app/admin/staff/[id]/loading'

describe('error and loading pages', () => {
  it('TEST-ERR-001 global error page renders message and retry action', () => {
    const reset = vi.fn()
    render(
      <RootErrorPage
        error={
          {
            message: 'Global route failed',
          } as Error
        }
        reset={reset}
      />
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByText('Global route failed')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Try Again' }))
    expect(reset).toHaveBeenCalledTimes(1)
  })

  it('TEST-ERR-002 portal error page renders with recovery controls', () => {
    const reset = vi.fn()
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <PortalErrorPage
        error={
          {
            message: 'Portal failed',
          } as Error
        }
        reset={reset}
      />
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByText('Portal failed')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to Dashboard' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(reset).toHaveBeenCalledTimes(1)
    consoleSpy.mockRestore()
  })

  it('TEST-ERR-003 global and portal not-found pages render fallback content', () => {
    const { unmount } = render(<RootNotFoundPage />)
    expect(screen.getByText('404')).toBeInTheDocument()
    expect(screen.getByText('Page not found')).toBeInTheDocument()
    unmount()

    render(<PortalNotFoundPage />)
    expect(screen.getByText('Page not found')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Return to Dashboard' })).toBeInTheDocument()
  })

  it('TEST-ERR-004 all loading.tsx files render without crashing', () => {
    const loadingComponents: Array<{
      id: string
      Component: React.ComponentType
    }> = [
      { id: 'app/loading.tsx', Component: RootLoadingPage },
      { id: 'app/(portal)/loading.tsx', Component: PortalLoadingPage },
      { id: 'app/(portal)/attendance/loading.tsx', Component: PortalAttendanceLoading },
      { id: 'app/(portal)/dashboard/loading.tsx', Component: PortalDashboardLoading },
      { id: 'app/(portal)/fees/loading.tsx', Component: PortalFeesLoading },
      { id: 'app/(portal)/grades/loading.tsx', Component: PortalGradesLoading },
      { id: 'app/(portal)/notifications/loading.tsx', Component: PortalNotificationsLoading },
      { id: 'app/(portal)/profile/loading.tsx', Component: PortalProfileLoading },
      { id: 'app/(portal)/timetable/loading.tsx', Component: PortalTimetableLoading },
      { id: 'app/admin/admissions/loading.tsx', Component: AdminAdmissionsLoading },
      { id: 'app/admin/attendance/loading.tsx', Component: AdminAttendanceLoading },
      { id: 'app/admin/dashboard/loading.tsx', Component: AdminDashboardLoading },
      { id: 'app/admin/fees/loading.tsx', Component: AdminFeesLoading },
      { id: 'app/admin/grades/loading.tsx', Component: AdminGradesLoading },
      { id: 'app/admin/import/loading.tsx', Component: AdminImportLoading },
      { id: 'app/admin/reports/loading.tsx', Component: AdminReportsLoading },
      { id: 'app/admin/settings/loading.tsx', Component: AdminSettingsLoading },
      { id: 'app/admin/staff/loading.tsx', Component: AdminStaffLoading },
      { id: 'app/admin/staff/[id]/loading.tsx', Component: AdminStaffDetailLoading },
    ]

    for (const { id, Component } of loadingComponents) {
      const { container, unmount } = render(<Component />)
      if (!container.firstElementChild) {
        throw new Error(`Loading component did not render root element: ${id}`)
      }
      unmount()
    }
  })
})
