import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import { AdminDashboardClient } from '../admin-dashboard-client'
import { AttendanceChart } from '../attendance-chart'
import { EnrollmentChart } from '../enrollment-chart'
import { FeeCollectionChart } from '../fee-collection-chart'
import { ActivityFeed } from '../activity-feed'
import { QuickActions } from '../quick-actions'

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
}))

// Mock recharts responsive container and charts to prevent JSDOM errors
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  PieChart: ({ children }: any) => <div>{children}</div>,
  Pie: () => <div data-testid="pie-chart">Pie Chart Component</div>,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
}))

const mockDashboardData = {
  school: { name: 'Vidhya Bharthi High School' },
  generated_at: '2026-05-30T00:00:00Z',
  visible_sections: {
    enrollment: true,
    attendance: true,
    fee_collection: true,
    recent_payments: true,
    pending_actions: true,
    recent_activity: true,
    teacher_summary: false,
  },
  enrollment: {
    total_students: 520,
    total_staff: 35,
    total_classes: 12,
    class_wise: [
      { class_id: 'c1', class_name: 'Grade 10A', student_count: 45 },
      { class_id: 'c2', class_name: 'Grade 9B', student_count: 42 },
    ],
  },
  today_attendance: {
    total_students: 520,
    present: 480,
    absent: 30,
    late: 10,
    percentage: 94.2,
    not_marked: 0,
  },
  fee_collection: {
    total_expected: 5000000,
    total_collected: 3500000,
    total_outstanding: 1500000,
    collection_percentage: 70,
    this_month_collected: 500000,
  },
  quick_actions: [
    {
      key: 'mark-attendance',
      label: 'Mark Attendance',
      description: 'Take daily attendance',
      href: '/admin/attendance',
      icon: 'attendance' as const,
    },
  ],
  recent_payments: [
    {
      id: 'p1',
      student_name: 'Rahul Dravid',
      receipt_number: 'REC-001',
      amount: 15000,
      date: '2026-05-28T10:00:00Z',
    },
  ],
  recent_activity: [
    {
      id: 'act1',
      action: 'UPDATE',
      entity_type: 'STUDENT',
      user_name: 'Super Admin',
      timestamp: '2026-05-30T00:00:00Z',
    },
  ],
  pending_actions: {
    pending_admissions: 5,
    pending_concessions: 2,
    overdue_books: 12,
  },
}

describe('Dashboard Module Components', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('AdminDashboardClient', () => {
    it('renders welcome message and metric cards (TEST-COMP-053)', () => {
      render(
        <AdminDashboardClient
          user={{ name: 'Praneeth', role: 'SUPER_ADMIN' }}
          initialData={mockDashboardData}
        />
      )

      expect(screen.getByText(/Welcome, Praneeth/i)).toBeInTheDocument()
      expect(screen.getByText(/Vidhya Bharthi High School/i)).toBeInTheDocument()
      expect(screen.getByText('Total Students')).toBeInTheDocument()
      expect(screen.getAllByText('Today\'s Attendance').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Fee Collection').length).toBeGreaterThan(0)
      expect(screen.getByText('Pending Actions')).toBeInTheDocument()
    })
  })

  describe('AttendanceChart', () => {
    it('renders donut chart (TEST-COMP-055)', () => {
      render(
        <AttendanceChart
          attendance={mockDashboardData.today_attendance}
          title="Today's Attendance"
        />
      )

      expect(screen.getByText('Today\'s Attendance')).toBeInTheDocument()
      expect(screen.getByText('94.2%')).toBeInTheDocument()
      expect(screen.getByTestId('pie-chart')).toBeInTheDocument()
    })
  })

  describe('EnrollmentChart', () => {
    it('renders bar chart and metrics (TEST-COMP-056)', () => {
      render(<EnrollmentChart enrollment={mockDashboardData.enrollment} />)

      expect(screen.getByText('Enrollment Breakdown')).toBeInTheDocument()
      expect(screen.getByText('520')).toBeInTheDocument()
      expect(screen.getByText('35')).toBeInTheDocument()
      expect(screen.getByText('12')).toBeInTheDocument()
    })
  })

  describe('FeeCollectionChart', () => {
    it('renders collected vs outstanding (TEST-COMP-057)', () => {
      render(<FeeCollectionChart feeCollection={mockDashboardData.fee_collection} />)

      expect(screen.getByText('Expected')).toBeInTheDocument()
      expect(screen.getByText('Collected')).toBeInTheDocument()
      expect(screen.getByText('Outstanding')).toBeInTheDocument()
      expect(screen.getByText('70%')).toBeInTheDocument()
    })
  })

  describe('ActivityFeed', () => {
    it('renders recent activity items (TEST-COMP-058)', () => {
      render(<ActivityFeed activity={mockDashboardData.recent_activity} />)

      expect(screen.getByText('Recent Activity')).toBeInTheDocument()
      expect(screen.getByText(/UPDATE/i)).toBeInTheDocument()
      expect(screen.getByText(/on STUDENT/i)).toBeInTheDocument()
      expect(screen.getByText(/Super Admin/i)).toBeInTheDocument()
    })
  })

  describe('QuickActions', () => {
    it('renders action buttons (TEST-COMP-059)', () => {
      render(<QuickActions actions={mockDashboardData.quick_actions} />)

      expect(screen.getByText('Mark Attendance')).toBeInTheDocument()
      expect(screen.getByText('Take daily attendance')).toBeInTheDocument()
    })
  })
})
