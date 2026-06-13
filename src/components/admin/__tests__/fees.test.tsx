import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import { toast } from 'sonner'
import { FeeStructureTable } from '../fee-structure-table'
import { PaymentForm } from '../payment-form'
import { PaymentHistoryTable } from '../payment-history-table'
import { ConcessionForm } from '../concession-form'
import { ConcessionApproval } from '../concession-approval'
import { DefaulterTable } from '../defaulter-table'

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}))

// Mock dialog/alert-dialog
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogDescription: ({ children }: any) => <p>{children}</p>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
}))

vi.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({ children, open }: any) => open ? <div>{children}</div> : null,
  AlertDialogTrigger: ({ children }: any) => <>{children}</>,
  AlertDialogContent: ({ children }: any) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: any) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: any) => <h2>{children}</h2>,
  AlertDialogDescription: ({ children }: any) => <p>{children}</p>,
  AlertDialogFooter: ({ children }: any) => <div>{children}</div>,
  AlertDialogCancel: ({ children }: any) => <button>{children}</button>,
  AlertDialogAction: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
}))

// Mock select
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

const mockAcademicYears = [{ id: 'ay1', name: '2025-2026' }]
const mockClasses = [{ id: 'c1', name: 'Grade 10A' }]
const mockCategories = [{ id: 'cat1', name: 'Tuition Fee' }]

const mockStructures = [
  {
    id: 'fs1',
    academic_year_id: 'ay1',
    academic_year_name: '2025-2026',
    class_id: 'c1',
    class_name: 'Grade 10A',
    fee_category_id: 'cat1',
    category_name: 'Tuition Fee',
    amount: 12000,
    due_date: '2026-06-01',
    frequency: 'QUARTERLY' as const,
  },
]

const mockStudentLookup = [
  { id: 's1', name: 'Aarav Mehta', admission_number: 'ADM-001', class_name: 'Grade 10A' },
]

const mockFeeBalance = {
  student: { id: 's1', name: 'Aarav Mehta', class_name: 'Grade 10A' },
  balances: [
    {
      fee_structure_id: 'fs1',
      category_name: 'Tuition Fee',
      total_amount: 12000,
      concession_amount: 0,
      total_paid: 5000,
      balance_due: 7000,
      status: 'OUTSTANDING' as const,
      due_date: '2026-06-01',
      payments: [],
    },
  ],
  total_due: 12000,
  total_paid: 5000,
  total_balance: 7000,
}

describe('Fees Module Components', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('FeeStructureTable', () => {
    it('renders fee structure rows (TEST-COMP-031)', () => {
      render(
        <FeeStructureTable
          structures={mockStructures}
          academicYears={mockAcademicYears}
          classes={mockClasses}
          categories={mockCategories}
          selectedAcademicYearId="ay1"
          selectedClassId="c1"
          canConfigure={true}
          onAcademicYearChange={vi.fn()}
          onClassChange={vi.fn()}
          onSaveStructure={vi.fn()}
          onDeleteStructure={vi.fn()}
          onCreateCategory={vi.fn()}
        />
      )

      expect(screen.getByText('Tuition Fee')).toBeInTheDocument()
      expect(screen.getByText('₹12,000')).toBeInTheDocument()
      expect(screen.getByText('2026-06-01')).toBeInTheDocument()
      expect(screen.getByText('QUARTERLY')).toBeInTheDocument()
    })
  })

  describe('PaymentForm', () => {
    it('validates amount > 0 (TEST-COMP-032)', async () => {
      render(
        <PaymentForm
          onSearchStudents={vi.fn().mockResolvedValue(mockStudentLookup)}
          onFetchBalance={vi.fn().mockResolvedValue(mockFeeBalance)}
          onRecordPayment={vi.fn()}
        />
      )

      // Enter search text and trigger search
      fireEvent.change(screen.getByPlaceholderText(/Search by student name/i), { target: { value: 'Aarav' } })
      fireEvent.click(screen.getByRole('button', { name: /Search/i }))

      await waitFor(() => {
        expect(screen.getByText('Aarav Mehta')).toBeInTheDocument()
      })

      // Select student
      fireEvent.click(screen.getByRole('button', { name: /Aarav Mehta/i }))

      await waitFor(() => {
        expect(screen.queryByText('Loading fee balance details...')).not.toBeInTheDocument() // Loaded
      })

      // Click pay structure button
      const payBtn = screen.getByRole('button', { name: /^Pay$/ })
      fireEvent.click(payBtn)

      // Set invalid amount 0
      fireEvent.change(screen.getByPlaceholderText('Enter amount'), { target: { value: '0' } })

      // Receive Payment click
      fireEvent.click(screen.getByRole('button', { name: /Receive Payment/i }))

      expect(toast.error).toHaveBeenCalledWith('Enter a valid amount greater than 0')
    })

    it('renders payment mode selector (TEST-COMP-033)', () => {
      render(
        <PaymentForm
          onSearchStudents={vi.fn()}
          onFetchBalance={vi.fn()}
          onRecordPayment={vi.fn()}
        />
      )

      expect(screen.getByText('Payment Mode')).toBeInTheDocument()
      const select = screen.getByTestId('select')
      expect(select).toBeInTheDocument()
    })
  })

  describe('PaymentHistoryTable', () => {
    it('renders payment rows with receipt link (TEST-COMP-034)', () => {
      const mockPayments = [
        {
          id: 'p1',
          receipt_number: 'REC-0001',
          student_name: 'Aarav Mehta',
          class_name: 'Grade 10A',
          amount_paid: 5000,
          payment_mode: 'CASH',
          payment_date: '2026-05-20',
          collected_by: 'Accountant',
          receipt_url: '/receipts/REC-0001.pdf',
        },
      ]

      render(<PaymentHistoryTable payments={mockPayments} />)

      expect(screen.getByText('REC-0001')).toBeInTheDocument()
      expect(screen.getByText('Aarav Mehta')).toBeInTheDocument()
      expect(screen.getByText('₹5,000')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /View/i })).toBeInTheDocument()
    })
  })

  describe('ConcessionForm', () => {
    it('validates concession amount (TEST-COMP-035)', async () => {
      render(
        <ConcessionForm
          onSearchStudents={vi.fn().mockResolvedValue(mockStudentLookup)}
          onFetchBalance={vi.fn().mockResolvedValue(mockFeeBalance)}
          onCreateConcession={vi.fn()}
        />
      )

      // Enter search text and trigger search
      fireEvent.change(screen.getByPlaceholderText(/Search by student name/i), { target: { value: 'Aarav' } })
      fireEvent.click(screen.getByRole('button', { name: /Search/i }))

      await waitFor(() => {
        expect(screen.getByText('Aarav Mehta')).toBeInTheDocument()
      })

      // Select student
      fireEvent.click(screen.getByRole('button', { name: /Aarav Mehta/i }))

      await waitFor(() => {
        expect(screen.getAllByTestId('select').length).toBeGreaterThan(0)
      })

      // Set concession type percentage and set value to 150 (invalid)
      const selects = screen.getAllByTestId('select')
      fireEvent.change(selects[0], { target: { value: 'fs1' } }) // select structure
      fireEvent.change(selects[1], { target: { value: 'PERCENTAGE' } }) // select concession type

      fireEvent.change(screen.getByPlaceholderText(/e.g. 15/i), { target: { value: '150' } })
      fireEvent.change(screen.getByPlaceholderText(/Provide detailed reason/i), { target: { value: 'Need support' } })

      // Submit
      fireEvent.click(screen.getByRole('button', { name: /Create Request/i }))

      expect(toast.error).toHaveBeenCalledWith('Percentage concession must be 100 or less')
    })
  })

  describe('ConcessionApproval', () => {
    it('renders approve/reject buttons for Principal (TEST-COMP-036)', () => {
      const mockConcessions = [
        {
          id: 'con1',
          student_name: 'Aarav Mehta',
          class_name: 'Grade 10A',
          category_name: 'Tuition Fee',
          concession_type: 'PERCENTAGE' as const,
          concession_value: 20,
          reason: 'Need support',
          status: 'PENDING' as const,
          requested_by_email: 'accountant@school.com',
          created_at: '2026-05-25T00:00:00Z',
        },
      ]

      render(
        <ConcessionApproval
          concessions={mockConcessions}
          canApprove={true}
          onDecision={vi.fn()}
        />
      )

      expect(screen.getByText('Approve')).toBeInTheDocument()
      expect(screen.getByText('Reject')).toBeInTheDocument()
      expect(screen.getByText('Reason: Need support')).toBeInTheDocument()
    })
  })

  describe('DefaulterTable', () => {
    it('renders defaulter list with amounts (TEST-COMP-037)', () => {
      const mockDefaulters = [
        {
          student_id: 's1',
          student_name: 'Diya Sharma',
          class_name: 'Grade 9B',
          parent_name: 'Rajesh Sharma',
          parent_phone: '9876543210',
          total_due: 12000,
          total_paid: 4000,
          balance: 8000,
          overdue_categories: ['Tuition Fee'],
        },
      ]

      render(<DefaulterTable defaulters={mockDefaulters} totalOutstanding={8000} />)

      expect(screen.getByText('Diya Sharma')).toBeInTheDocument()
      expect(screen.getByText('Grade 9B')).toBeInTheDocument()
      expect(screen.getAllByText('₹8,000')[0]).toBeInTheDocument() // total outstanding & balance due
    })
  })
})
