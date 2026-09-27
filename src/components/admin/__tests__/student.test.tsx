import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import { toast } from 'sonner'
import { StudentTable } from '../student-table'
import { StudentFilters } from '../student-filters'
import { StudentForm } from '../student-form'
import { StudentDetailTabs } from '../student-detail-tabs'
import { ParentLinkDialog } from '../parent-link-dialog'
import { StudentFeeBalance } from '../student-fee-balance'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}))

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}))

// Mock shadcn ui components that use Radix UI Primitives
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => open ? <div data-testid="dialog">{children}</div> : null,
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

vi.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({ children }: any) => <div>{children}</div>,
  AlertDialogTrigger: ({ children }: any) => <div>{children}</div>,
  AlertDialogContent: ({ children }: any) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: any) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: any) => <div>{children}</div>,
  AlertDialogDescription: ({ children }: any) => <div>{children}</div>,
  AlertDialogFooter: ({ children }: any) => <div>{children}</div>,
  AlertDialogCancel: ({ children }: any) => <button>{children}</button>,
  AlertDialogAction: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
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

const mockStudents = [
  {
    id: 's1',
    name: 'Aarav Mehta',
    admission_number: 'ADM-001',
    class: 'Grade 10',
    section: 'A',
    gender: 'MALE',
    is_active: true,
    photo_url: null,
  },
  {
    id: 's2',
    name: 'Diya Sharma',
    admission_number: 'ADM-002',
    class: 'Grade 9',
    section: 'B',
    gender: 'FEMALE',
    is_active: false,
    photo_url: null,
  },
]

const mockClasses = [
  { id: 'c1', label: 'Grade 10A', academic_year_id: 'ay1' },
  { id: 'c2', label: 'Grade 9B', academic_year_id: 'ay1' },
]

const mockAcademicYears = [
  { id: 'ay1', name: '2025-2026' },
]

describe('Student Module Components', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('StudentTable', () => {
    it('renders rows for each student (TEST-COMP-001)', () => {
      render(
        <StudentTable
          students={mockStudents}
          loading={false}
          page={1}
          limit={10}
          total={2}
          sortBy="name"
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

      expect(screen.getByText('Aarav Mehta')).toBeInTheDocument()
      expect(screen.getByText('Diya Sharma')).toBeInTheDocument()
      expect(screen.getByText('ADM-001')).toBeInTheDocument()
      expect(screen.getByText('ADM-002')).toBeInTheDocument()
    })

    it('sorts by column click (TEST-COMP-002)', () => {
      const handleSortChange = vi.fn()
      render(
        <StudentTable
          students={mockStudents}
          loading={false}
          page={1}
          limit={10}
          total={2}
          sortBy="name"
          sortOrder="asc"
          canEdit={true}
          canDelete={true}
          onSortChange={handleSortChange}
          onPageChange={vi.fn()}
          onLimitChange={vi.fn()}
          onView={vi.fn()}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />
      )

      // Click sorting button for Name
      const nameSortBtn = screen.getByRole('button', { name: /Name/i })
      fireEvent.click(nameSortBtn)
      expect(handleSortChange).toHaveBeenCalledWith('name', 'desc')
    })

    it('shows empty state when no students (TEST-COMP-003)', () => {
      render(
        <StudentTable
          students={[]}
          loading={false}
          page={1}
          limit={10}
          total={0}
          sortBy="name"
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

      expect(screen.getByText('No students found')).toBeInTheDocument()
      expect(screen.getByText(/Start by adding your first student record/i)).toBeInTheDocument()
    })
  })

  describe('StudentFilters', () => {
    it('renders class, year, status dropdowns (TEST-COMP-004)', () => {
      render(
        <StudentFilters
          search=""
          classId="ALL"
          gender="ALL"
          status="ALL"
          classes={mockClasses}
          canCreate={true}
          onSearchChange={vi.fn()}
          onClassChange={vi.fn()}
          onGenderChange={vi.fn()}
          onStatusChange={vi.fn()}
          onAddStudent={vi.fn()}
          onExport={vi.fn()}
        />
      )

      const selects = screen.getAllByTestId('select')
      expect(selects.length).toBe(3) // Class, Gender, Status
    })

    it('onChange triggers callback with filter values (TEST-COMP-005)', () => {
      const handleSearch = vi.fn()
      const handleClass = vi.fn()
      render(
        <StudentFilters
          search=""
          classId="ALL"
          gender="ALL"
          status="ALL"
          classes={mockClasses}
          canCreate={true}
          onSearchChange={handleSearch}
          onClassChange={handleClass}
          onGenderChange={vi.fn()}
          onStatusChange={vi.fn()}
          onAddStudent={vi.fn()}
          onExport={vi.fn()}
        />
      )

      const searchInput = screen.getByPlaceholderText(/Search by student name/i)
      fireEvent.change(searchInput, { target: { value: 'Aarav' } })
      expect(handleSearch).toHaveBeenCalledWith('Aarav')

      const selects = screen.getAllByTestId('select')
      // First select is Class
      fireEvent.change(selects[0], { target: { value: 'c1' } })
      expect(handleClass).toHaveBeenCalledWith('c1')
    })
  })

  describe('StudentForm', () => {
    it('renders all required fields when open (TEST-COMP-006)', () => {
      render(
        <StudentForm
          open={true}
          mode="create"
          classes={mockClasses}
          academicYears={mockAcademicYears}
          initialStudent={null}
          onOpenChange={vi.fn()}
          onSaved={vi.fn()}
        />
      )

      expect(screen.getByLabelText(/Admission Number/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/First Name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Last Name/i)).toBeInTheDocument()
    })

    it('shows errors for empty fields when submitting invalid form (TEST-COMP-007)', async () => {
      render(
        <StudentForm
          open={true}
          mode="create"
          classes={mockClasses}
          academicYears={mockAcademicYears}
          initialStudent={null}
          onOpenChange={vi.fn()}
          onSaved={vi.fn()}
        />
      )

      const saveBtn = screen.getByRole('button', { name: /Create Student/i })
      fireEvent.click(saveBtn)

      expect(toast.error).toHaveBeenCalledWith('Admission number, name, and date of birth are required')
    })

    it('calls onSubmit with form data on successful save (TEST-COMP-008)', async () => {
      const handleSaved = vi.fn()
      global.fetch = vi.fn().mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: { message: 'Success' } }),
        })
      )

      const { container } = render(
        <StudentForm
          open={true}
          mode="create"
          classes={mockClasses}
          academicYears={mockAcademicYears}
          initialStudent={null}
          onOpenChange={vi.fn()}
          onSaved={handleSaved}
        />
      )

      fireEvent.change(screen.getByLabelText(/Admission Number/i), { target: { value: 'ADM-999' } })
      fireEvent.change(screen.getByLabelText(/First Name/i), { target: { value: 'Kabir' } })
      fireEvent.change(screen.getByLabelText(/Last Name/i), { target: { value: 'Singh' } })
      
      // Select class
      const selects = screen.getAllByTestId('select')
      fireEvent.change(selects[1], { target: { value: 'c1' } }) // index 1 is Class select

      // Set date of birth
      const dobInput = container.querySelector('input[type="date"]')!;
      fireEvent.change(dobInput, { target: { value: '2015-05-15' } })

      const saveBtn = screen.getByRole('button', { name: /Create Student/i })
      fireEvent.click(saveBtn)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled()
        expect(handleSaved).toHaveBeenCalled()
      })
    })
  })

  describe('StudentDetailTabs', () => {
    const mockStudentDetailPayload = {
      student: {
        id: 's1',
        name: 'Aarav Mehta',
        first_name: 'Aarav',
        last_name: 'Mehta',
        admission_number: 'ADM-001',
        gender: 'MALE',
        date_of_birth: '2010-01-01T00:00:00.000Z',
        blood_group: 'O+',
        phone: '9876543210',
        address: '123 Street',
        emergency_contact_name: 'Raj Mehta',
        emergency_contact_phone: '9876543211',
        class_id: 'c1',
        class: { name: 'Grade 10', section: 'A' },
        academic_year_id: 'ay1',
        academic_year: { name: '2025-2026' },
        roll_number: '12',
        admission_date: '2020-04-01T00:00:00.000Z',
        is_active: true,
        photo_url: null,
        user: { email: 'aarav@school.com' },
        parents: [],
      },
      summaries: {
        attendance: { total_records: 180, present: 170, absent: 5, late: 3, half_day: 2, holiday: 20 },
        grades: { records: 10, exams: 2, average_marks: 85.5 },
        fees: { payment_count: 3, total_paid: 15000, latest_payment: null },
      },
      activity: [],
    }

    beforeEach(() => {
      global.fetch = vi.fn().mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: mockStudentDetailPayload }),
        })
      )
    })

    it('renders correct tabs (Info, Fees, Grades, etc.) (TEST-COMP-009)', async () => {
      render(
        <StudentDetailTabs
          studentId="s1"
          classes={mockClasses}
          academicYears={mockAcademicYears}
          canEdit={true}
          canDelete={true}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Overview')).toBeInTheDocument()
        expect(screen.getByText('Parents')).toBeInTheDocument()
        expect(screen.getByText('Attendance')).toBeInTheDocument()
        expect(screen.getByText('Grades')).toBeInTheDocument()
        expect(screen.getByText('Fees')).toBeInTheDocument()
        expect(screen.getByText('Activity')).toBeInTheDocument()
      })
    })

    it('switches between tabs (TEST-COMP-010)', async () => {
      render(
        <StudentDetailTabs
          studentId="s1"
          classes={mockClasses}
          academicYears={mockAcademicYears}
          canEdit={true}
          canDelete={true}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Overview')).toBeInTheDocument()
      })

      const parentsTabBtn = screen.getByTestId('tab-trigger-parents')
      fireEvent.click(parentsTabBtn)
      expect(screen.getByText('Linked Parents')).toBeInTheDocument()

      const attendanceTabBtn = screen.getByTestId('tab-trigger-attendance')
      fireEvent.click(attendanceTabBtn)
      expect(screen.getByText('Attendance Summary')).toBeInTheDocument()
    })
  })

  describe('ParentLinkDialog', () => {
    it('opens and renders search input (TEST-COMP-011)', () => {
      render(
        <ParentLinkDialog
          studentId="s1"
          open={true}
          onOpenChange={vi.fn()}
          onLinked={vi.fn()}
        />
      )

      expect(screen.getByRole('heading', { name: 'Link Parent' })).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/Type parent name/i)).toBeInTheDocument()
    })
  })

  describe('StudentFeeBalance', () => {
    const mockBalanceData = {
      student: {
        id: 's1',
        name: 'Aarav Mehta',
        class_name: 'Grade 10A',
      },
      balances: [
        {
          fee_structure_id: 'fs1',
          category_name: 'Tuition Fee',
          total_amount: 10000,
          concession_amount: 1000,
          total_paid: 6000,
          balance_due: 3000,
          status: 'OUTSTANDING' as const,
          due_date: '2026-06-01',
          payments: [],
        },
      ],
      total_due: 9000,
      total_paid: 6000,
      total_balance: 3000,
    }

    it('displays balance correctly (TEST-COMP-012)', () => {
      render(
        <StudentFeeBalance
          data={mockBalanceData}
          loading={false}
          selectedStructureId={null}
          onSelectStructure={vi.fn()}
        />
      )

      expect(screen.getByText('Tuition Fee')).toBeInTheDocument()
      expect(screen.getByText('OUTSTANDING')).toBeInTheDocument()
      expect(screen.getByText('₹9,000')).toBeInTheDocument() // Net Payable
      expect(screen.getAllByText('₹6,000')[0]).toBeInTheDocument() // Collected
      expect(screen.getAllByText('₹3,000')[0]).toBeInTheDocument() // Balance
    })
  })
})
