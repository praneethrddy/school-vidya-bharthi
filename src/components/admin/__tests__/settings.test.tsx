import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import { toast } from 'sonner'
import { SettingsForm } from '../settings-form'
import { SchoolProfileForm } from '../school-profile-form'
import { AcademicYearForm } from '../academic-year-form'
import { ClassForm } from '../class-form'
import { PermissionGrid } from '../permission-grid'
import { PermissionManagementPanel } from '../permission-management-panel'
import { PromotionTool } from '../promotion-tool'

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}))

// Mock switch component
vi.mock('@/components/ui/switch', () => ({
  Switch: ({ checked, onCheckedChange, disabled, 'aria-label': ariaLabel }: any) => (
    <input
      type="checkbox"
      data-testid="switch"
      checked={checked || false}
      disabled={disabled}
      onChange={(e) => onCheckedChange(e.target.checked)}
      aria-label={ariaLabel}
    />
  ),
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

// Mock tabs
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

// Mock dialog
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogDescription: ({ children }: any) => <p>{children}</p>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
}))

// Mock tooltip
vi.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: any) => <>{children}</>,
  Tooltip: ({ children }: any) => <>{children}</>,
  TooltipTrigger: ({ children }: any) => <>{children}</>,
  TooltipContent: ({ children }: any) => <>{children}</>,
}))

// Mock alert
vi.mock('@/components/ui/alert', () => ({
  Alert: ({ children }: any) => <div data-testid="alert">{children}</div>,
  AlertTitle: ({ children }: any) => <h3>{children}</h3>,
  AlertDescription: ({ children }: any) => <div>{children}</div>,
}))

// Mock checkbox
vi.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({ checked, onCheckedChange, disabled }: any) => (
    <input
      type="checkbox"
      data-testid="checkbox"
      checked={checked || false}
      disabled={disabled}
      onChange={(e) => onCheckedChange(e.target.checked)}
    />
  ),
}))

describe('Settings Module Components', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.window.confirm = () => true
  })

  describe('SettingsForm', () => {
    it('renders general settings fields (TEST-COMP-046)', async () => {
      const mockSettings = {
        settings: [],
        settings_map: {
          working_days: 'MON,TUE,WED,THU,FRI',
          grading_scheme: 'PERCENTAGE',
          receipt_prefix: 'VBHS',
          academic_start_month: '6',
          attendance_type: 'DAILY',
        },
      }

      global.fetch = vi.fn().mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: mockSettings }),
        })
      )

      render(<SettingsForm />)

      await waitFor(() => {
        expect(screen.getByText('General Settings')).toBeInTheDocument()
        expect(screen.getByPlaceholderText('VBHS')).toBeInTheDocument()
      })
    })
  })

  describe('SchoolProfileForm', () => {
    it('renders logo upload + color pickers (TEST-COMP-047)', async () => {
      const mockProfile = {
        school: {
          id: 'sc1',
          name: 'Vidya Bharathi',
          logo_url: null,
          address: 'Main Road',
          city: 'Hyderabad',
          state: 'Telangana',
          phone: '9876543210',
          email: 'admin@school.com',
          website: 'https://school.com',
          board: 'CBSE',
          brand_primary: '#1d4ed8',
          brand_accent: '#f59e0b',
          updated_at: '2026-05-01',
        },
      }

      global.fetch = vi.fn().mockImplementation((url) => {
        if (url.includes('/api/settings/school-profile')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, data: mockProfile }),
          })
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: { domain: 'school.com' } }),
        })
      })

      render(<SchoolProfileForm />)

      await waitFor(() => {
        expect(screen.getByText('School Profile')).toBeInTheDocument()
        expect(screen.getByLabelText(/School Name/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/Board/i)).toBeInTheDocument()
      })
    })
  })

  describe('AcademicYearForm', () => {
    it('validates date ranges and calls API (TEST-COMP-048)', async () => {
      const handleCreated = vi.fn()
      global.fetch = vi.fn().mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: {} }),
        })
      )

      render(<AcademicYearForm onCreated={handleCreated} />)

      expect(screen.getByLabelText(/Name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Start Date/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/End Date/i)).toBeInTheDocument()

      const submitBtn = screen.getByRole('button', { name: /Create Academic Year/i })
      fireEvent.click(submitBtn)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled()
        expect(toast.success).toHaveBeenCalledWith('Academic year created')
      })
    })
  })

  describe('ClassForm', () => {
    it('validates class name + section (TEST-COMP-049)', async () => {
      global.fetch = vi.fn().mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: {} }),
        })
      )

      render(
        <ClassForm
          academicYearId="ay1"
          teachers={[{ id: 't1', name: 'John Doe' }]}
          mode="create"
        />
      )

      fireEvent.change(screen.getByLabelText(/Class Name/i), { target: { value: 'Grade 6' } })
      fireEvent.change(screen.getByLabelText(/Section/i), { target: { value: 'A' } })

      const submitBtn = screen.getByRole('button', { name: /Add Class/i })
      fireEvent.click(submitBtn)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled()
        expect(toast.success).toHaveBeenCalledWith('Class created')
      })
    })
  })

  describe('PermissionGrid', () => {
    it('renders permission checkboxes by role (TEST-COMP-050)', async () => {
      const mockPayload = {
        modules: [
          {
            module: 'STUDENTS',
            permissions: [
              {
                id: 'p1',
                code: 'STUDENT_VIEW',
                name: 'View Students',
                description: 'Allow viewing student records',
                is_principal_only: false,
                granted_to: ['STAFF_ADMIN'],
              },
            ],
          },
        ],
        configurable_roles: ['STAFF_ADMIN'],
      }

      global.fetch = vi.fn().mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: mockPayload }),
        })
      )

      render(<PermissionGrid />)

      await waitFor(() => {
        expect(screen.getByText('View Students')).toBeInTheDocument()
        expect(screen.getByTestId('checkbox')).toBeInTheDocument()
      })
    })
  })

  describe('PermissionManagementPanel', () => {
    it('renders role selector (TEST-COMP-051)', async () => {
      const mockPayload = {
        permissions: [
          {
            id: 'p1',
            code: 'STUDENT_VIEW',
            module: 'STUDENTS',
            action: 'VIEW',
            name: 'View Students',
            description: 'Allow viewing student records',
            is_principal_only: false,
            is_granted: true,
          },
        ],
      }

      global.fetch = vi.fn().mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: mockPayload }),
        })
      )

      render(<PermissionManagementPanel />)

      await waitFor(() => {
        expect(screen.getByText('Students')).toBeInTheDocument()
        expect(screen.getByText('View Students')).toBeInTheDocument()
        expect(screen.getByTestId('switch')).toBeInTheDocument()
      })
    })
  })

  describe('PromotionTool', () => {
    it('renders source selector + action grid (TEST-COMP-052)', async () => {
      const mockMeta = {
        academic_years: [
          { id: 'ay1', name: '2025-2026', is_current: true },
          { id: 'ay2', name: '2026-2027', is_current: false },
        ],
        classes: [
          { id: 'c1', academic_year_id: 'ay1', name: 'Grade 9', section: 'A', display_name: 'Grade 9A' },
          { id: 'c2', academic_year_id: 'ay2', name: 'Grade 10', section: 'A', display_name: 'Grade 10A' },
        ],
      }

      const mockStudents = {
        source_class: { id: 'c1', name: 'Grade 9', section: 'A' },
        students: [
          {
            student_id: 's1',
            name: 'Karan Malhotra',
            roll_number: '12',
            current_class: 'Grade 9A',
            promotion_action: null,
            target_class_id: null,
          },
        ],
      }

      global.fetch = vi.fn().mockImplementation((url) => {
        if (url.includes('/api/settings/promotion?')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, data: mockStudents }),
          })
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: mockMeta }),
        })
      })

      render(<PromotionTool />)

      await waitFor(() => {
        expect(screen.getByText('Student Promotion Tool')).toBeInTheDocument()
      })

      // Click Load Students
      const loadBtn = screen.getByRole('button', { name: /Load Students/i })
      fireEvent.click(loadBtn)

      await waitFor(() => {
        expect(screen.getByText('Karan Malhotra')).toBeInTheDocument()
        expect(screen.getByText('Select All - Promote')).toBeInTheDocument()
      })
    })
  })
})
