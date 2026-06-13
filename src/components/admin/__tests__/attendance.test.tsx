import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { AttendanceGrid } from '../attendance-grid'
import { AttendanceDatePicker } from '../attendance-date-picker'
import { AttendanceChart } from '../attendance-chart'
import { ClassAttendanceSummary } from '../class-attendance-summary'
import { StaffAttendanceGrid } from '../staff-attendance-grid'

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
}))

// Mock recharts responsive container and charts to prevent rendering failure under pure jsdom
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  PieChart: ({ children }: any) => <div>{children}</div>,
  Pie: () => <div data-testid="pie-chart">Pie Chart Component</div>,
  Tooltip: () => null,
}))

// Mock popover
vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: any) => <div>{children}</div>,
  PopoverTrigger: ({ children }: any) => <>{children}</>,
  PopoverContent: ({ children }: any) => <div data-testid="popover-content">{children}</div>,
}))

vi.mock('@/components/ui/calendar', () => ({
  Calendar: ({ selected, onSelect }: any) => (
    <button data-testid="select-date" onClick={() => onSelect(new Date('2026-05-15'))}>
      Select Date
    </button>
  ),
}))

const mockStudentRecords = [
  {
    student_id: 's1',
    student_name: 'Aarav Mehta',
    roll_number: '12',
    photo_url: null,
    status: 'PRESENT' as const,
    remarks: null,
    id: null,
  },
  {
    student_id: 's2',
    student_name: 'Diya Sharma',
    roll_number: '15',
    photo_url: null,
    status: null,
    remarks: null,
    id: null,
  },
]

const mockStaffRecords = [
  {
    staff_id: 'st1',
    employee_code: 'EMP-001',
    name: 'Rohit Sharma',
    department: 'Mathematics',
    designation: 'Senior Teacher',
    photo_url: null,
    status: 'PRESENT' as const,
    check_in: null,
    check_out: null,
    remarks: null,
    id: null,
  },
]

const mockClassSummaries = [
  {
    class_id: 'c1',
    class_name: 'Grade 10A',
    total_students: 40,
    present: 35,
    absent: 3,
    late: 2,
    half_day: 0,
    is_marked: true,
    marked_by: 'Anjali Rao',
    marked_at: '2026-05-30T10:00:00Z',
  },
  {
    class_id: 'c2',
    class_name: 'Grade 9B',
    total_students: 30,
    present: 0,
    absent: 0,
    late: 0,
    half_day: 0,
    is_marked: false,
    marked_by: null,
    marked_at: null,
  },
]

describe('Attendance Module Components', () => {
  describe('AttendanceGrid', () => {
    it('renders student rows with status toggles (TEST-COMP-019)', () => {
      render(
        <AttendanceGrid
          records={mockStudentRecords}
          onChange={vi.fn()}
          onMarkAll={vi.fn()}
          isMarked={false}
        />
      )

      expect(screen.getByText('Aarav Mehta')).toBeInTheDocument()
      expect(screen.getByText('Diya Sharma')).toBeInTheDocument()
      expect(screen.getByText('12')).toBeInTheDocument()
      expect(screen.getByText('15')).toBeInTheDocument()
    })

    it('marks present/absent/late on click (TEST-COMP-020)', () => {
      const handleChange = vi.fn()
      render(
        <AttendanceGrid
          records={mockStudentRecords}
          onChange={handleChange}
          onMarkAll={vi.fn()}
          isMarked={false}
        />
      )

      // Get attendance toggles (should render buttons for PRESENT/ABSENT/LATE)
      // Since it renders buttons inside AttendanceToggle, click ABSENT for Diya
      const toggles = screen.getAllByRole('button')
      // Mark All Present (0), Mark All Absent (1), Diya Remarks (4), etc. Let's find ABSENT button.
      const absentBtns = screen.getAllByText('A')
      fireEvent.click(absentBtns[1]) // Second ABSENT button corresponding to Diya

      expect(handleChange).toHaveBeenCalledWith('s2', { status: 'ABSENT' })
    })
  })

  describe('AttendanceDatePicker', () => {
    it('allows date selection (TEST-COMP-021)', () => {
      const handleChange = vi.fn()
      render(
        <AttendanceDatePicker
          date={new Date('2026-05-30')}
          onChange={handleChange}
        />
      )

      const selectDateBtn = screen.getByTestId('select-date')
      fireEvent.click(selectDateBtn)

      expect(handleChange).toHaveBeenCalled()
    })
  })

  describe('AttendanceChart', () => {
    it('renders pie chart with correct data (TEST-COMP-022)', () => {
      const mockAttendanceSummary = {
        total_students: 100,
        present: 90,
        absent: 5,
        late: 5,
        percentage: 95,
        not_marked: 2,
      }

      render(
        <AttendanceChart
          attendance={mockAttendanceSummary}
          title="Attendance Summary"
        />
      )

      expect(screen.getByText('Attendance Summary')).toBeInTheDocument()
      expect(screen.getByText('90')).toBeInTheDocument() // Present count
      expect(screen.getByText('95%')).toBeInTheDocument() // Percentage
      expect(screen.getByTestId('pie-chart')).toBeInTheDocument()
    })
  })

  describe('ClassAttendanceSummary', () => {
    it('shows present/absent/late counts (TEST-COMP-023)', () => {
      render(
        <ClassAttendanceSummary
          classes={mockClassSummaries}
          onClassSelect={vi.fn()}
        />
      )

      expect(screen.getByText('Grade 10A')).toBeInTheDocument()
      expect(screen.getByText('Grade 9B')).toBeInTheDocument()
      expect(screen.getByText('Pending')).toBeInTheDocument()
      expect(screen.getByText('Present: 37')).toBeInTheDocument() // 35 present + 2 late
      expect(screen.getByText('Absent: 3')).toBeInTheDocument()
    })
  })

  describe('StaffAttendanceGrid', () => {
    it('renders staff attendance grid (TEST-COMP-024)', () => {
      render(
        <StaffAttendanceGrid
          records={mockStaffRecords}
          onChange={vi.fn()}
          onMarkAll={vi.fn()}
          isMarked={true}
        />
      )

      expect(screen.getByText('Rohit Sharma')).toBeInTheDocument()
      expect(screen.getByText('EMP-001')).toBeInTheDocument()
      expect(screen.getByText('LEV')).toBeInTheDocument() // Leave button label
    })
  })
})
