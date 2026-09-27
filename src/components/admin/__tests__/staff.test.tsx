import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import { StaffTable } from '../staff-table'
import { StaffFilters } from '../staff-filters'
import { StaffForm } from '../staff-form'
import { StaffDetailTabs } from '../staff-detail-tabs'
import { SubjectAssignment } from '../subject-assignment'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}))

// Mock shadcn ui components that use Radix UI Primitives
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => open ? <div data-testid="dialog">{children}</div> : null,
  DialogTrigger: ({ children }: any) => <>{children}</>,
  DialogContent: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogDescription: ({ children }: any) => <p>{children}</p>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
}))

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: any) => (
    <select data-testid="select" value={value || ''} onChange={(e) => onValueChange(e.target.value)}>
      {children}
    </select>
  ),
  SelectTrigger: ({ children }: any) => <div data-testid="select-trigger">{children}</div>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
  SelectContent: ({ children }: any) => <>{children}</>,
  SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
}))

vi.mock('@/components/ui/switch', () => ({
  Switch: ({ checked, onCheckedChange, id }: any) => (
    <input
      type="checkbox"
      id={id}
      data-testid="switch"
      checked={checked || false}
      onChange={(e) => onCheckedChange(e.target.checked)}
    />
  ),
}))

vi.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({ checked, onCheckedChange, id, 'aria-label': ariaLabel }: any) => (
    <input
      type="checkbox"
      id={id}
      aria-label={ariaLabel}
      data-testid="checkbox"
      checked={checked || false}
      onChange={(e) => onCheckedChange ? onCheckedChange(e.target.checked) : null}
    />
  ),
}))

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children, value, onValueChange }: any) => (
    <div data-testid="tabs" onClick={(e: any) => {
      const button = e.target.closest('button');
      if (button) {
        const val = button.getAttribute('data-value');
        if (val && onValueChange) onValueChange(val);
      }
    }}>{children}</div>
  ),
  TabsList: ({ children }: any) => <div>{children}</div>,
  TabsTrigger: ({ children, value }: any) => (
    <button type="button" data-value={value} data-testid={`tab-trigger-${value}`}>{children}</button>
  ),
  TabsContent: ({ children, value }: any) => (
    <div data-testid={`tab-content-${value}`}>{children}</div>
  ),
}))

vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: any) => <div>{children}</div>,
  PopoverTrigger: ({ children }: any) => <>{children}</>,
  PopoverContent: ({ children }: any) => <div data-testid="popover-content">{children}</div>,
}))

vi.mock('@/components/ui/calendar', () => ({
  Calendar: () => <div data-testid="calendar">Mock Calendar</div>,
}))

const mockStaff = [
  {
    id: 'st1',
    employee_code: 'EMP-001',
    first_name: 'Rohit',
    last_name: 'Sharma',
    name: 'Rohit Sharma',
    designation: 'Senior Teacher',
    department: 'Mathematics',
    user_role: 'TEACHER',
    is_active: true,
    photo_url: null,
  },
  {
    id: 'st2',
    employee_code: 'EMP-002',
    first_name: 'Anjali',
    last_name: 'Rao',
    name: 'Anjali Rao',
    designation: 'Principal',
    department: 'Administration',
    user_role: 'STAFF_ADMIN',
    is_active: false,
    photo_url: null,
  },
]

describe('Staff Module Components', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('StaffTable', () => {
    it('renders rows and handles empty state (TEST-COMP-013)', () => {
      const { rerender } = render(
        <StaffTable
          data={mockStaff}
          loading={false}
          page={1}
          limit={10}
          total={2}
          sortBy="first_name"
          sortOrder="asc"
          canEdit={true}
          canDelete={true}
          onSortChange={vi.fn()}
          onPageChange={vi.fn()}
          onLimitChange={vi.fn()}
          onView={vi.fn()}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />
      )

      expect(screen.getByText('Rohit Sharma')).toBeInTheDocument()
      expect(screen.getByText('Anjali Rao')).toBeInTheDocument()
      expect(screen.getByText('EMP-001')).toBeInTheDocument()
      expect(screen.getByText('EMP-002')).toBeInTheDocument()

      // Empty State
      rerender(
        <StaffTable
          data={[]}
          loading={false}
          page={1}
          limit={10}
          total={0}
          sortBy="first_name"
          sortOrder="asc"
          canEdit={true}
          canDelete={true}
          onSortChange={vi.fn()}
          onPageChange={vi.fn()}
          onLimitChange={vi.fn()}
          onView={vi.fn()}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />
      )

      expect(screen.getByText('No staff members found.')).toBeInTheDocument()
    })
  })

  describe('StaffFilters', () => {
    it('renders department, designation selects (TEST-COMP-014)', () => {
      render(
        <StaffFilters
          canCreate={true}
          search=""
          department="ALL"
          designation="ALL"
          isActiveOnly={false}
          departments={['Mathematics', 'Science']}
          designations={['Teacher', 'Principal']}
          onSearchChange={vi.fn()}
          onDepartmentChange={vi.fn()}
          onDesignationChange={vi.fn()}
          onActiveOnlyChange={vi.fn()}
          onAddStaff={vi.fn()}
          onExport={vi.fn()}
        />
      )

      expect(screen.getByLabelText('Search Staff')).toBeInTheDocument()
      const selects = screen.getAllByTestId('select')
      expect(selects.length).toBe(2) // Department, Designation
    })
  })

  describe('StaffForm', () => {
    it('renders all fields (TEST-COMP-015)', () => {
      render(
        <StaffForm
          onSubmit={vi.fn()}
          isEditMode={false}
          onCancel={vi.fn()}
        />
      )

      expect(screen.getByLabelText(/First Name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Last Name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Employee Code/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Department/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Designation/i)).toBeInTheDocument()
    })

    it('create_account toggle shows/hides account fields (TEST-COMP-016)', async () => {
      render(
        <StaffForm
          onSubmit={vi.fn()}
          isEditMode={false}
          onCancel={vi.fn()}
        />
      )

      // Account settings should be hidden initially
      expect(screen.queryByLabelText(/Email Address/i)).not.toBeInTheDocument()

      // Toggle Create Account switch
      const switchEl = screen.getByTestId('switch')
      fireEvent.click(switchEl)

      // Account fields should show up
      expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument()
      expect(screen.getByText('System Role')).toBeInTheDocument()
    })
  })

  describe('StaffDetailTabs', () => {
    const mockStaffDetail = {
      id: 'st1',
      first_name: 'Rohit',
      last_name: 'Sharma',
      employee_code: 'EMP-001',
      designation: 'Senior Teacher',
      department: 'Mathematics',
      gender: 'MALE',
      date_of_birth: '1985-05-15T00:00:00.000Z',
      qualification: 'M.Sc., B.Ed.',
      phone: '9876543212',
      address: '456 Lane',
      date_of_joining: '2015-06-01T00:00:00.000Z',
      is_active: true,
      user: { email: 'rohit@school.com', role: 'TEACHER' },
    }

    const mockAttendanceSummary = {
      total_records: 120,
      present: 115,
      absent: 2,
      late: 1,
      half_day: 1,
      leave: 1,
    }

    it('renders info, subjects, schedule tabs (TEST-COMP-017)', () => {
      render(
        <StaffDetailTabs
          staff={mockStaffDetail}
          assignments={[]}
          classesTaught={[]}
          allClasses={[]}
          allSubjects={[]}
          academicYears={[]}
          attendanceSummary={mockAttendanceSummary}
          activity={[]}
          canEdit={true}
          canManageAccounts={true}
          onEditClick={vi.fn()}
          onAddAssignment={vi.fn()}
          onRemoveAssignment={vi.fn()}
          onSetClassTeacher={vi.fn()}
          onCreateAccount={vi.fn()}
          onResetPassword={vi.fn()}
        />
      )

      expect(screen.getByText('Rohit Sharma')).toBeInTheDocument()
      expect(screen.getByTestId('tab-trigger-overview')).toBeInTheDocument()
      expect(screen.getByTestId('tab-trigger-workload')).toBeInTheDocument()
      expect(screen.getByTestId('tab-trigger-attendance')).toBeInTheDocument()
      expect(screen.getByTestId('tab-trigger-activity')).toBeInTheDocument()
    })
  })

  describe('SubjectAssignment', () => {
    const mockAssignments = [
      {
        id: 'asg1',
        subject: { name: 'Algebra', code: 'ALG', class: { name: 'Grade 10', section: 'A' }, periods_per_week: 4 },
        academic_year: { name: '2025-2026' },
      },
    ]

    const mockClassesTaught = [
      { id: 'c1', name: 'Grade 10', section: 'A', academic_year: { name: '2025-2026' } },
    ]

    it('renders subject checkboxes/rows correctly (TEST-COMP-018)', () => {
      render(
        <SubjectAssignment
          assignments={mockAssignments}
          classesTaught={mockClassesTaught}
          classes={[]}
          subjects={[]}
          academicYears={[]}
          canEdit={true}
          onAddAssignment={vi.fn()}
          onRemoveAssignment={vi.fn()}
          onSetClassTeacher={vi.fn()}
        />
      )

      expect(screen.getByText('Algebra (ALG)')).toBeInTheDocument()
      expect(screen.getByText('Grade 10 A')).toBeInTheDocument()
      expect(screen.getByText('4 periods/wk')).toBeInTheDocument()
      expect(screen.getByText('Currently Class Teacher For:')).toBeInTheDocument()
    })
  })
})
