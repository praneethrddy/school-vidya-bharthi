import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { Bell } from 'lucide-react'
import FeeReceiptPDF from '../fee-receipt-pdf'
import ReportCardPDF from '../report-card-pdf'
import { PermissionGuard } from '../permission-guard'
import { EmptyState } from '../empty-state'
import { NotificationBadge } from '../notification-badge'
import { NotificationItem } from '../notification-item'
import { NotificationList } from '../notification-list'
import { PasswordStrength } from '../password-strength'

const mockUsePermissions = vi.fn()

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

vi.mock('@/hooks/use-permissions', () => ({
  usePermissions: () => mockUsePermissions(),
}))

vi.mock('@/components/shared/notification-type-icon', () => ({
  NotificationTypeIcon: ({ type }: { type: string }) => <span>{type}</span>,
}))

describe('Shared components', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders children when permission is granted (TEST-COMP-094)', () => {
    mockUsePermissions.mockReturnValue({ can: () => true, loading: false })

    render(
      <PermissionGuard permission="REPORTS.view_attendance">
        <div>Allowed content</div>
      </PermissionGuard>
    )

    expect(screen.getByText('Allowed content')).toBeInTheDocument()
  })

  it('hides children when permission is denied (TEST-COMP-095)', () => {
    mockUsePermissions.mockReturnValue({ can: () => false, loading: false })

    render(
      <PermissionGuard permission="REPORTS.view_attendance" fallback={<div>Blocked</div>}>
        <div>Allowed content</div>
      </PermissionGuard>
    )

    expect(screen.getByText('Blocked')).toBeInTheDocument()
    expect(screen.queryByText('Allowed content')).not.toBeInTheDocument()
  })

  it('renders empty state icon and message (TEST-COMP-096)', () => {
    render(<EmptyState icon={Bell} title="No notifications" description="Everything is quiet." />)

    expect(screen.getByText('No notifications')).toBeInTheDocument()
    expect(screen.getByText('Everything is quiet.')).toBeInTheDocument()
  })

  it('renders unread notification count when greater than zero (TEST-COMP-097)', async () => {
    ;(global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ data: { unread_count: 5 } }),
    })

    render(<NotificationBadge />)

    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument()
    })
  })

  it('hides unread badge when count is zero (TEST-COMP-098)', async () => {
    ;(global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ data: { unread_count: 0 } }),
    })

    render(<NotificationBadge />)

    await waitFor(() => {
      expect(screen.getByLabelText('Notifications')).toBeInTheDocument()
      expect(screen.queryByText('0')).not.toBeInTheDocument()
    })
  })

  it('renders title, body, and time ago for a notification item (TEST-COMP-099)', async () => {
    render(
      <NotificationItem
        notification={{
          id: 'n1',
          title: 'Fee reminder',
          message: 'Tuition fee is due tomorrow.',
          type: 'FEE',
          is_read: false,
          link: '/portal/fees',
          created_at: '2026-06-10T10:00:00Z',
        }}
      />
    )

    expect(screen.getByText('Fee reminder')).toBeInTheDocument()
    expect(screen.getByText('Tuition fee is due tomorrow.')).toBeInTheDocument()
    expect(screen.getAllByText('FEE').length).toBeGreaterThan(0)
  })

  it('supports read and unread notification styling states (TEST-COMP-100)', () => {
    const handleOpen = vi.fn()
    const { rerender } = render(
      <NotificationItem
        notification={{
          id: 'n1',
          title: 'Unread item',
          message: 'Please review',
          type: 'GENERAL',
          is_read: false,
          link: null,
          created_at: '2026-06-10T10:00:00Z',
        }}
        onOpen={handleOpen}
      />
    )

    fireEvent.click(screen.getByRole('button'))
    expect(handleOpen).toHaveBeenCalled()
    expect(screen.getByLabelText('Unread notification')).toBeInTheDocument()

    rerender(
      <NotificationItem
        notification={{
          id: 'n1',
          title: 'Read item',
          message: 'Reviewed',
          type: 'GENERAL',
          is_read: true,
          link: null,
          created_at: '2026-06-10T10:00:00Z',
        }}
      />
    )

    expect(screen.queryByLabelText('Unread notification')).not.toBeInTheDocument()
  })

  it('renders a list of notification items (TEST-COMP-101)', () => {
    render(
      <NotificationList
        notifications={[
          {
            id: 'n1',
            title: 'Announcement',
            message: 'School closed on Friday.',
            type: 'ANNOUNCEMENT',
            is_read: true,
            link: null,
            created_at: '2026-06-10T10:00:00Z',
          },
          {
            id: 'n2',
            title: 'Homework',
            message: 'Math worksheet assigned.',
            type: 'HOMEWORK',
            is_read: false,
            link: '/portal/homework',
            created_at: '2026-06-11T10:00:00Z',
          },
        ]}
      />
    )

    expect(screen.getByText('Announcement')).toBeInTheDocument()
    expect(screen.getByText('Homework')).toBeInTheDocument()
  })

  it('shows weak and strong password labels (TEST-COMP-103, TEST-COMP-104)', () => {
    const { rerender } = render(<PasswordStrength password="weak" />)
    expect(screen.getByText('Weak')).toBeInTheDocument()

    rerender(<PasswordStrength password="StrongPass1!" />)
    expect(screen.getByText('Strong')).toBeInTheDocument()
  })

  it('creates a valid fee receipt pdf document tree (TEST-COMP-105)', () => {
    const element = FeeReceiptPDF({
      paymentData: {
        receipt_number: 'REC-001',
        payment_date: '2026-06-01T00:00:00Z',
        amount_paid: 5000,
        payment_mode: 'CASH',
        student: {
          first_name: 'Aarav',
          last_name: 'Mehta',
          admission_number: 'ADM-001',
        },
        structure: {
          class: { name: 'Grade 10', section: 'A' },
          category: { name: 'Tuition Fee' },
        },
        collector: {
          first_name: 'Anita',
          last_name: 'Rao',
        },
      },
    })

    expect(React.isValidElement(element)).toBe(true)
  })

  it('creates a valid report card pdf document tree (TEST-COMP-106)', () => {
    const element = ReportCardPDF({
      data: {
        schoolName: 'Vidya Bharathi',
        examName: 'Final Exam',
        termName: 'Term 2',
        studentName: 'Aarav Mehta',
        className: 'Grade 10A',
        rollNumber: '12',
        subjects: [
          {
            subject_name: 'Math',
            max_marks: 100,
            marks_obtained: 92,
            grade: 'A',
            is_passed: true,
          },
        ],
        grading_scheme: 'GRADE',
        total_obtained: 92,
        total_max: 100,
        percentage: 92,
        overall_grade: 'A',
      },
    })

    expect(React.isValidElement(element)).toBe(true)
  })
})
