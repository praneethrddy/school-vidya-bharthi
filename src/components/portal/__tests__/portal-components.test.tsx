import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { AttendanceCalendar } from '../attendance-calendar'
import { AttendanceStats } from '../attendance-stats'
import { AttendanceTrendChart } from '../attendance-trend-chart'
import { GradesTable } from '../grades-table'
import { GradePerformanceCard } from '../grade-performance-card'
import { SubjectChart } from '../subject-chart'
import { ExamTrendChart } from '../exam-trend-chart'
import { FeeBreakdownTable } from '../fee-breakdown-table'
import { FeeSummaryCard } from '../fee-summary-card'
import { FeeStatusBadge } from '../fee-status-badge'
import { PaymentHistoryTable } from '../payment-history-table'
import { TimetablePeriodCard } from '../timetable-period-card'
import { TodaySchedule } from '../today-schedule'
import { AnnouncementFeed } from '../announcement-feed'
import { ProfileHeader } from '../profile-header'
import { ProfileForm } from '../profile-form'
import { PhotoUpload } from '../photo-upload'
import { PasswordChangeForm } from '../password-change-form'
import { ProfileClient } from '../profile-client'

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    getAll: () => [],
  })),
}))

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}))

vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: any) => <div>{children}</div>,
  PopoverTrigger: ({ children }: any) => <div>{children}</div>,
  PopoverContent: ({ children }: any) => <div>{children}</div>,
}))

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line-series" />,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar-series" />,
  CartesianGrid: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  Legend: () => null,
  ReferenceLine: () => null,
}))

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: any) => <div>{children}</div>,
  TabsList: ({ children }: any) => <div>{children}</div>,
  TabsTrigger: ({ children, value }: any) => <button data-testid={`tab-${value}`}>{children}</button>,
  TabsContent: ({ children }: any) => <div>{children}</div>,
}))

describe('Portal components', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
    global.URL.createObjectURL = vi.fn(() => 'blob:preview')
    global.URL.revokeObjectURL = vi.fn()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders attendance calendar month grid and status colors (TEST-COMP-073)', () => {
    const handleMonthChange = vi.fn()

    render(
      <AttendanceCalendar
        currentMonth={new Date('2026-06-01')}
        onMonthChange={handleMonthChange}
        records={[
          { date: '2026-06-15', status: 'PRESENT', remarks: 'On time' },
          { date: '2026-06-16', status: 'ABSENT' },
        ]}
      />
    )

    expect(screen.getByText('June 2026')).toBeInTheDocument()
    expect(screen.getAllByText('Present').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Absent').length).toBeGreaterThan(0)

    fireEvent.click(screen.getAllByRole('button')[0])
    expect(handleMonthChange).toHaveBeenCalled()
  })

  it('renders attendance percentages and counts (TEST-COMP-074)', () => {
    render(
      <AttendanceStats
        summary={{
          total_working_days: 20,
          present: 18,
          absent: 1,
          late: 1,
          half_day: 0,
          holidays: 2,
          percentage: 95,
        }}
      />
    )

    expect(screen.getByText('Working Days')).toBeInTheDocument()
    expect(screen.getByText('20')).toBeInTheDocument()
    expect(screen.getByText('95%')).toBeInTheDocument()
  })

  it('renders attendance trend line chart (TEST-COMP-075)', () => {
    render(
      <AttendanceTrendChart
        data={[
          { month: 'Apr', percentage: 91 },
          { month: 'May', percentage: 94 },
        ]}
      />
    )

    expect(screen.getByText('Attendance Trend')).toBeInTheDocument()
    expect(screen.getByTestId('line-chart')).toBeInTheDocument()
  })

  it('renders subject rows with marks (TEST-COMP-076)', () => {
    render(
      <GradesTable
        subjects={[
          {
            subject_name: 'Mathematics',
            subject_code: 'MTH',
            max_marks: 100,
            marks_obtained: 88,
            grade: 'A',
            is_passed: true,
          },
        ]}
        totalMax={100}
        totalObtained={88}
        percentage={88}
        overallGrade="A"
        gradingScheme="GRADE"
      />
    )

    expect(screen.getByText('Mathematics')).toBeInTheDocument()
    expect(screen.getAllByText('88').length).toBeGreaterThan(0)
    expect(screen.getByText('Pass')).toBeInTheDocument()
  })

  it('renders grade performance badge and percentage (TEST-COMP-077)', () => {
    render(<GradePerformanceCard percentage={82} overallGrade="A" gradingScheme="GRADE" />)

    expect(screen.getByText('Overall Performance')).toBeInTheDocument()
    expect(screen.getByText('82%')).toBeInTheDocument()
    expect(screen.getByText(/Distinction \(Grade A\)/i)).toBeInTheDocument()
  })

  it('renders subject performance bar chart (TEST-COMP-078)', () => {
    render(
      <SubjectChart
        subjects={[
          {
            subject_name: 'Mathematics',
            marks_obtained: 88,
            max_marks: 100,
            passing_marks: 35,
          },
        ]}
      />
    )

    expect(screen.getByText('Subject-wise Performance')).toBeInTheDocument()
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
  })

  it('renders exam trend chart for multiple exams (TEST-COMP-079)', () => {
    render(
      <ExamTrendChart
        exams={[
          { name: 'Mid Term', percentage: 76, start_date: '2026-01-10' },
          { name: 'Final', percentage: 84, start_date: '2026-03-10' },
        ]}
      />
    )

    expect(screen.getByText('Academic Trend')).toBeInTheDocument()
    expect(screen.getByTestId('line-chart')).toBeInTheDocument()
  })

  it('renders fee categories with amounts and payment history (TEST-COMP-080)', () => {
    render(
      <FeeBreakdownTable
        feeDetails={[
          {
            fee_structure_id: 'fs1',
            category_name: 'Tuition Fee',
            amount: 10000,
            total_paid: 6000,
            balance: 4000,
            status: 'PARTIAL',
            concession: {
              type: 'PERCENTAGE',
              value: 10,
              deduction: 1000,
              status: 'APPROVED',
            },
            payments: [
              {
                id: 'p1',
                payment_date: '2026-06-01',
                receipt_number: 'REC-1',
                payment_mode: 'CASH',
                amount_paid: 6000,
              },
            ],
          },
        ]}
      />
    )

    expect(screen.getByText('Tuition Fee')).toBeInTheDocument()
    expect(screen.getByText('Partial')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Tuition Fee'))
    expect(screen.getByText('Payment History')).toBeInTheDocument()
    expect(screen.getByText('REC-1')).toBeInTheDocument()
  })

  it('renders total, paid, and balance summary (TEST-COMP-081)', () => {
    render(
      <FeeSummaryCard
        summary={{
          total_fees: 12000,
          total_concessions: 2000,
          total_paid: 7000,
          total_balance: 3000,
        }}
      />
    )

    expect(screen.getByText('Outstanding Balance')).toBeInTheDocument()
    expect(screen.getByText('Payment Progress')).toBeInTheDocument()
    expect(screen.getByText(/70%/i)).toBeInTheDocument()
  })

  it('renders correct badge label per fee status (TEST-COMP-082)', () => {
    const { rerender } = render(<FeeStatusBadge status="PAID" />)
    expect(screen.getByText('Paid')).toBeInTheDocument()

    rerender(<FeeStatusBadge status="OUTSTANDING" />)
    expect(screen.getByText('Outstanding')).toBeInTheDocument()
  })

  it('renders portal payment rows (TEST-COMP-083)', () => {
    render(
      <PaymentHistoryTable
        payments={[
          {
            id: 'p1',
            payment_date: '2026-06-02',
            receipt_number: 'REC-2',
            category_name: 'Transport',
            payment_mode: 'UPI',
            amount_paid: 2500,
          },
        ]}
      />
    )

    expect(screen.getByText('REC-2')).toBeInTheDocument()
    expect(screen.getByText('Transport')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Download/i })).toBeInTheDocument()
  })

  it('renders period subject and teacher details (TEST-COMP-086)', () => {
    render(
      <TimetablePeriodCard
        slot={{
          period_number: 1,
          start_time: '09:00',
          end_time: '09:40',
          subject_name: 'Science',
          subject_code: 'SCI',
          teacher_name: 'Meera Shah',
        }}
      />
    )

    expect(screen.getByText('Science')).toBeInTheDocument()
    expect(screen.getByText('Meera Shah')).toBeInTheDocument()
    expect(screen.getByText('Period 1')).toBeInTheDocument()
  })

  it('renders today schedule classes for the current day (TEST-COMP-087)', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-15T09:15:00Z'))
    ;(global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        schedule: {
          MON: [
            {
              period_number: 1,
              start_time: '09:00',
              end_time: '09:40',
              subject_name: 'English',
              teacher_name: 'Asha Patel',
            },
          ],
        },
      }),
    })

    const element = await TodaySchedule({ studentId: 's1' })
    render(element)

    expect(screen.getByText("Today's Schedule")).toBeInTheDocument()
    expect(screen.getByText('English')).toBeInTheDocument()
    expect(screen.getByText('Asha Patel')).toBeInTheDocument()
  })

  it('renders announcement cards with status badges (TEST-COMP-088)', () => {
    render(
      <AnnouncementFeed
        announcements={[
          {
            id: 'a1',
            title: 'PTM scheduled for Friday',
            type: 'GENERAL' as any,
            published_at: '2026-06-10T10:00:00Z',
          },
        ]}
      />
    )

    expect(screen.getByText('Recent Announcements')).toBeInTheDocument()
    expect(screen.getByText('PTM scheduled for Friday')).toBeInTheDocument()
    expect(screen.getByText('GENERAL')).toBeInTheDocument()
  })

  it('renders avatar, name, and role details (TEST-COMP-089)', () => {
    render(
      <ProfileHeader
        profile={{
          first_name: 'Aarav',
          last_name: 'Mehta',
          class_name: 'Grade 10A',
          roll_number: '12',
          photo_url: null,
        }}
        role="STUDENT"
        onPhotoUploadSuccess={vi.fn()}
      />
    )

    expect(screen.getByText('Aarav Mehta')).toBeInTheDocument()
    expect(screen.getByText(/Class: Grade 10A/i)).toBeInTheDocument()
    expect(screen.getByText('STUDENT')).toBeInTheDocument()
  })

  it('renders editable profile fields and saves updates (TEST-COMP-090)', async () => {
    const handleSuccess = vi.fn()
    ;(global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        profile: {
          phone: '9999999999',
        },
      }),
    })

    render(
      <ProfileForm
        role="PARENT"
        profile={{
          first_name: 'Rita',
          last_name: 'Patel',
          phone: '9876543210',
          address: 'Lake Road',
          occupation: 'Architect',
          alternate_phone: '1234567890',
          relation: 'MOTHER',
          email: 'rita@example.com',
          children: [],
        }}
        onSuccess={handleSuccess}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /Edit Profile/i }))
    fireEvent.change(screen.getByLabelText('Primary Phone'), {
      target: { value: '9999999999' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/profile',
        expect.objectContaining({ method: 'PATCH' })
      )
      expect(handleSuccess).toHaveBeenCalledWith({ phone: '9999999999' })
    })
  })

  it('renders photo upload with preview and upload action (TEST-COMP-091)', async () => {
    const handleUploadSuccess = vi.fn()
    ;(global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ photo_url: 'https://example.com/avatar.webp' }),
    })

    const { container } = render(
      <PhotoUpload
        name="Aarav Mehta"
        currentPhotoUrl={null}
        onUploadSuccess={handleUploadSuccess}
      />
    )

    fireEvent.click(container.querySelector('[aria-haspopup="dialog"]') as HTMLElement)

    await waitFor(() => {
      expect(screen.getByText('Update Profile Photo')).toBeInTheDocument()
    })

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['avatar'], 'avatar.png', { type: 'image/png' })
    fireEvent.change(fileInput, { target: { files: [file] } })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Save Photo/i })).toBeEnabled()
    })

    fireEvent.click(screen.getByRole('button', { name: /Save Photo/i }))

    await waitFor(() => {
      expect(handleUploadSuccess).toHaveBeenCalledWith('https://example.com/avatar.webp')
    })
  })

  it('validates current and new password confirmation (TEST-COMP-092)', async () => {
    render(<PasswordChangeForm />)

    fireEvent.change(screen.getByLabelText('Current Password'), {
      target: { value: 'Current@123' },
    })
    fireEvent.change(screen.getByLabelText('New Password'), {
      target: { value: 'NewPassword1!' },
    })
    fireEvent.change(screen.getByLabelText('Confirm New Password'), {
      target: { value: 'Mismatch1!' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Change Password/i }))

    await waitFor(() => {
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument()
      expect(screen.getByText('Strong')).toBeInTheDocument()
    })
  })

  it('orchestrates profile sections in the client shell (TEST-COMP-093)', () => {
    render(
      <ProfileClient
        role="PARENT"
        initialProfile={{
          first_name: 'Rita',
          last_name: 'Patel',
          phone: '9876543210',
          address: 'Lake Road',
          occupation: 'Architect',
          relation: 'MOTHER',
          email: 'rita@example.com',
          children: [],
        }}
      />
    )

    expect(screen.getByText('Profile Details')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Change Password' })).toBeInTheDocument()
    expect(screen.getByText('General Information')).toBeInTheDocument()
    expect(screen.getByText('Security')).toBeInTheDocument()
  })
})
