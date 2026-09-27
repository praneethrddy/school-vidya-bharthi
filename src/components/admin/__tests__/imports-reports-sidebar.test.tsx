import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { BarChart3 } from 'lucide-react'
import { ImportWizard } from '../import-wizard'
import { ImportTypeSelector } from '../import-type-selector'
import { CsvUpload } from '../csv-upload'
import { ColumnMapper } from '../column-mapper'
import { ImportPreview } from '../import-preview'
import { ImportResults } from '../import-results'
import { ReportsDashboard } from '../reports-dashboard'
import { ReportSelector } from '../report-selector'
import { ReportFilters } from '../report-filters'
import { ExportButtons } from '../export-buttons'
import { AdminSidebar } from '../admin-sidebar'

const mockUsePermissions = vi.fn()
const mockUsePathname = vi.fn()

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

vi.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}))

vi.mock('@/hooks/use-permissions', () => ({
  usePermissions: () => mockUsePermissions(),
}))

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
  },
}))

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: any) => (
    <select
      data-testid="select"
      value={value || ''}
      onChange={(event) => onValueChange?.(event.target.value)}
    >
      {children}
    </select>
  ),
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
  SelectContent: ({ children }: any) => <>{children}</>,
  SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
}))

vi.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({ checked, onCheckedChange, id }: any) => (
    <input
      id={id}
      type="checkbox"
      checked={Boolean(checked)}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
    />
  ),
}))

describe('Admin import, reports, and sidebar components', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUsePathname.mockReturnValue('/admin/students')
    mockUsePermissions.mockReturnValue({
      can: () => true,
      loading: false,
      role: 'PRINCIPAL',
      permissions: [],
    })
  })

  it('renders import wizard step-by-step flow (TEST-COMP-060)', async () => {
    render(<ImportWizard />)

    expect(screen.getByText('Data Import Tools')).toBeInTheDocument()
    expect(screen.getByText('Step 1')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText(/Download Students Template/i)).toBeInTheDocument()
    })
  })

  it('renders all five import types and handles selection (TEST-COMP-061)', () => {
    const handleSelect = vi.fn()

    render(
      <ImportTypeSelector
        importTypes={['students', 'staff', 'parents', 'student_parents', 'fee_payments']}
        selectedType="students"
        onSelect={handleSelect}
      />
    )

    expect(screen.getByText('Students')).toBeInTheDocument()
    expect(screen.getByText('Staff')).toBeInTheDocument()
    expect(screen.getByText('Parents')).toBeInTheDocument()
    expect(screen.getByText('Student-Parent Links')).toBeInTheDocument()
    expect(screen.getByText('Fee Payment History')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Staff'))
    expect(handleSelect).toHaveBeenCalledWith('staff')
  })

  it('renders csv upload drag-drop zone and uploads a file (TEST-COMP-062)', async () => {
    const handleUpload = vi.fn()
    const file = new File(['name'], 'students.csv', { type: 'text/csv' })
    const { container } = render(
      <CsvUpload selectedFileName="students.csv" onUpload={handleUpload} />
    )

    expect(screen.getByText('Upload CSV')).toBeInTheDocument()
    expect(screen.getByText(/Selected file: students.csv/i)).toBeInTheDocument()

    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => {
      expect(handleUpload).toHaveBeenCalledWith(file)
    })
  })

  it('renders column mapping dropdowns and validates mapping (TEST-COMP-063)', () => {
    const handleValidate = vi.fn()

    render(
      <ColumnMapper
        importType="students"
        detectedColumns={['admission_number', 'first_name', 'class_name']}
        columnMapping={{
          admission_number: 'admission_number',
          first_name: 'first_name',
          class_name: 'class_name',
        }}
        onChange={vi.fn()}
        onValidate={handleValidate}
      />
    )

    expect(screen.getByText('Map Columns')).toBeInTheDocument()
    expect(screen.getByText('Admission Number')).toBeInTheDocument()
    expect(screen.getByText('First Name')).toBeInTheDocument()
    expect(screen.getAllByTestId('select').length).toBeGreaterThan(2)

    fireEvent.click(screen.getByRole('button', { name: /Validate Data/i }))
    expect(handleValidate).toHaveBeenCalled()
  })

  it('renders import preview table with validation summary (TEST-COMP-064)', () => {
    render(
      <ImportPreview
        validation={{
          total_rows: 4,
          valid_rows: 3,
          error_rows: 1,
          warnings: [],
          missing_required_fields: [],
          errors: [
            {
              row_number: 2,
              field: 'class_name',
              value: 'Unknown',
              error: 'Class not found',
            },
          ],
          preview: [
            {
              row_number: 1,
              data: {
                first_name: 'Aarav',
                class_name: 'Grade 10A',
              },
            },
          ],
        }}
      />
    )

    expect(screen.getByText('Total Rows')).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()
    expect(screen.getByText('Class not found')).toBeInTheDocument()
    expect(screen.getByText('Preview of Valid Rows')).toBeInTheDocument()
    expect(screen.getByText('Aarav')).toBeInTheDocument()
  })

  it('renders import results with success and error counts (TEST-COMP-065)', () => {
    const handleReset = vi.fn()

    render(
      <ImportResults
        result={{
          status: 'PARTIAL',
          total_processed: 4,
          successful: 3,
          failed: 1,
          failed_rows: [{ row_number: 5, error: 'Duplicate admission number', data: {} }],
          import_id: 'imp-1',
          created_accounts: 2,
        }}
        onReset={handleReset}
      />
    )

    expect(screen.getByText('Import Results')).toBeInTheDocument()
    expect(screen.getByText('PARTIAL')).toBeInTheDocument()
    expect(screen.getByText('Duplicate admission number')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Import More/i }))
    expect(handleReset).toHaveBeenCalled()
  })

  it('renders reports dashboard cards after metadata loads (TEST-COMP-066)', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          school: { id: 'sc1', name: 'Vidya Bharathi' },
          current_academic_year_id: 'ay1',
          classes: [{ id: 'c1', name: 'Grade 10', section: 'A', academic_year_id: 'ay1' }],
          terms: [{ id: 't1', name: 'Term 1', academic_year_id: 'ay1' }],
          exams: [{ id: 'e1', name: 'Mid Term', class_id: 'c1', term_id: 't1' }],
          fee_categories: [{ id: 'fc1', name: 'Tuition' }],
        },
      }),
    } as Response)

    render(<ReportsDashboard />)

    await waitFor(() => {
      expect(screen.getByText('Analytics & Reports')).toBeInTheDocument()
      expect(screen.getByText('Attendance Report')).toBeInTheDocument()
      expect(screen.getByText('Academic Performance')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Download PDF/i })).toBeDisabled()
      expect(screen.getByRole('button', { name: /Download Excel/i })).toBeDisabled()
    })
  })

  it('renders report selector items and supports selection (TEST-COMP-067)', () => {
    const handleSelect = vi.fn()

    render(
      <ReportSelector
        items={[
          {
            id: 'attendance',
            title: 'Attendance Report',
            description: 'Class trends',
            icon: BarChart3,
            available: true,
          },
          {
            id: 'financial',
            title: 'Financial Report',
            description: 'Collections',
            icon: BarChart3,
            available: false,
          },
        ]}
        selectedId="attendance"
        onSelect={handleSelect}
      />
    )

    expect(screen.getByText('Attendance Report')).toBeInTheDocument()
    expect(screen.queryByText('Financial Report')).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('Attendance Report'))
    expect(handleSelect).toHaveBeenCalledWith('attendance')
  })

  it('renders report filters with date range pickers (TEST-COMP-068)', () => {
    const handleChange = vi.fn()
    const handleGenerate = vi.fn()

    render(
      <ReportFilters
        reportType="financial"
        filters={{
          classId: 'c1',
          dateFrom: '2026-05-01',
          dateTo: '2026-05-31',
          termId: '',
          examId: '',
          feeCategoryId: '',
          department: '',
        }}
        meta={{
          school: { id: 'sc1', name: 'School' },
          current_academic_year_id: 'ay1',
          classes: [{ id: 'c1', name: 'Grade 10', section: 'A', academic_year_id: 'ay1' }],
          terms: [],
          exams: [],
          fee_categories: [{ id: 'fc1', name: 'Tuition' }],
        }}
        onChange={handleChange}
        onGenerate={handleGenerate}
      />
    )

    expect(screen.getByText('Filters')).toBeInTheDocument()
    expect(screen.getByDisplayValue('2026-05-01')).toBeInTheDocument()
    expect(screen.getByDisplayValue('2026-05-31')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Generate Report/i }))
    expect(handleGenerate).toHaveBeenCalled()
  })

  it('renders export buttons for pdf and excel downloads (TEST-COMP-069)', () => {
    const handlePdf = vi.fn()
    const handleExcel = vi.fn()

    render(
      <ExportButtons onDownloadPdf={handlePdf} onDownloadExcel={handleExcel} />
    )

    fireEvent.click(screen.getByRole('button', { name: /Download PDF/i }))
    fireEvent.click(screen.getByRole('button', { name: /Download Excel/i }))

    expect(handlePdf).toHaveBeenCalled()
    expect(handleExcel).toHaveBeenCalled()
  })

  it('renders admin sidebar items based on permissions (TEST-COMP-070)', () => {
    mockUsePermissions.mockReturnValue({
      can: (permission: string) =>
        ['STUDENTS.view', 'ATTENDANCE.view_all'].includes(permission),
      loading: false,
      role: 'STAFF_ADMIN',
      permissions: ['STUDENTS.view', 'ATTENDANCE.view_all'],
    })

    render(<AdminSidebar />)

    expect(screen.getAllByText('Dashboard').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Students').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Attendance').length).toBeGreaterThan(0)
    expect(screen.queryByText('Fees')).not.toBeInTheDocument()
  })
})
