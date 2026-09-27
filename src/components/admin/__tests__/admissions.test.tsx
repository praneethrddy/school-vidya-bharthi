import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import { toast } from 'sonner'
import { AdmissionForm } from '../admission-form'
import { AdmissionCard } from '../admission-card'
import { AdmissionDetail } from '../admission-detail'
import { AdmissionStatusActions } from '../admission-status-actions'
import { AdmissionConvertDialog } from '../admission-convert-dialog'
import { AdmissionDocuments } from '../admission-documents'
import { AdmissionTimeline } from '../admission-timeline'
import { AdmissionsPipeline } from '../admissions-pipeline'
import type { AdmissionListItem, AdmissionDetail as AdmissionDetailType } from '@/types/admissions'

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
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

const mockAdmissionItem: AdmissionListItem = {
  id: 'adm1',
  applicant_name: 'Rohit Sharma',
  date_of_birth: '2016-08-12',
  gender: 'MALE',
  applying_for_class: 'Grade 5',
  parent_name: 'Karan Sharma',
  parent_phone: '9876543210',
  status: 'APPLIED',
  applied_at: '2026-05-01T10:00:00Z',
}

const mockAdmissionDetail: AdmissionDetailType = {
  ...mockAdmissionItem,
  parent_email: 'karan@gmail.com',
  address: 'Mumbai, India',
  previous_school: 'Little Stars Academy',
  remarks: 'Needs basic training',
  documents_url: ['http://example.com/birth_cert.pdf'],
  timeline: [
    {
      id: 'tl1',
      admission_id: 'adm1',
      from_status: null,
      to_status: 'APPLIED',
      remarks: 'Application submitted',
      created_by_email: 'karan@gmail.com',
      created_at: '2026-05-01T10:00:00Z',
    },
  ],
}

describe('Admissions Module Components', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('AdmissionForm', () => {
    it('renders all sections when open (TEST-COMP-038)', () => {
      render(
        <AdmissionForm
          open={true}
          onOpenChange={vi.fn()}
          classOptions={[{ id: 'c1', label: 'Grade 5' }]}
          onCreated={vi.fn()}
        />
      )

      expect(screen.getByText('Add Application')).toBeInTheDocument()
      expect(screen.getByLabelText(/Applicant Name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Date of Birth/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Parent Name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Parent Phone/i)).toBeInTheDocument()
    })
  })

  describe('AdmissionCard', () => {
    it('renders status badge correctly (TEST-COMP-039)', () => {
      render(
        <AdmissionCard
          admission={mockAdmissionItem}
          role="REGISTRAR"
          canProcess={true}
          canShortlist={true}
          canScheduleTest={false}
          canAdmit={false}
          canReject={true}
          statusLoading={null}
          converting={false}
          onView={vi.fn()}
          onStatusChange={vi.fn()}
          onConvert={vi.fn()}
        />
      )

      expect(screen.getByText('Rohit Sharma')).toBeInTheDocument()
      expect(screen.getByText('Applying for Grade 5')).toBeInTheDocument()
      expect(screen.getByText('APPLIED')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Shortlist/i })).toBeInTheDocument()
    })
  })

  describe('AdmissionDetail', () => {
    it('renders full detail view (TEST-COMP-040)', async () => {
      global.fetch = vi.fn().mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: mockAdmissionDetail }),
        })
      )

      render(
        <AdmissionDetail
          open={true}
          admissionId="adm1"
          role="PRINCIPAL"
          canProcess={true}
          canShortlist={true}
          canScheduleTest={true}
          canAdmit={true}
          canReject={true}
          statusPending={null}
          convertingAdmissionId={null}
          onOpenChange={vi.fn()}
          onStatusChange={vi.fn()}
          onRequestConvert={vi.fn()}
          onDataChanged={vi.fn()}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Application Detail')).toBeInTheDocument()
        expect(screen.getByText('Little Stars Academy')).toBeInTheDocument()
        expect(screen.getByText('karan@gmail.com')).toBeInTheDocument()
        expect(screen.getByText('Mumbai, India')).toBeInTheDocument()
        expect(screen.getByText('birth_cert.pdf')).toBeInTheDocument()
      })
    })
  })

  describe('AdmissionStatusActions', () => {
    it('shows correct actions per status (TEST-COMP-041)', () => {
      const { rerender } = render(
        <AdmissionStatusActions
          status="APPLIED"
          role="REGISTRAR"
          canProcess={true}
          canShortlist={true}
          canScheduleTest={true}
          canAdmit={true}
          canReject={true}
          onStatusChange={vi.fn()}
        />
      )

      // APPLIED -> Shortlist action
      expect(screen.getByRole('button', { name: /Shortlist/i })).toBeInTheDocument()

      // SHORTLISTED -> Schedule Test action
      rerender(
        <AdmissionStatusActions
          status="SHORTLISTED"
          role="REGISTRAR"
          canProcess={true}
          canShortlist={true}
          canScheduleTest={true}
          canAdmit={true}
          canReject={true}
          onStatusChange={vi.fn()}
        />
      )
      expect(screen.getByRole('button', { name: /Schedule Test/i })).toBeInTheDocument()

      // TESTING -> Waitlist, Admit, Reject (Principal only)
      rerender(
        <AdmissionStatusActions
          status="TESTING"
          role="PRINCIPAL"
          canProcess={true}
          canShortlist={true}
          canScheduleTest={true}
          canAdmit={true}
          canReject={true}
          onStatusChange={vi.fn()}
        />
      )
      expect(screen.getByRole('button', { name: /Waitlist/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Admit/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Reject/i })).toBeInTheDocument()
    })
  })

  describe('AdmissionConvertDialog', () => {
    it('renders conversion form (TEST-COMP-042)', () => {
      render(
        <AdmissionConvertDialog
          open={true}
          admissionId="adm1"
          applicantName="Rohit Sharma"
          onOpenChange={vi.fn()}
          onConverted={vi.fn()}
        />
      )

      expect(screen.getByText('Convert To Student')).toBeInTheDocument()
      expect(screen.getByText(/This will create a student and parent record for Rohit Sharma/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Confirm Convert/i })).toBeInTheDocument()
    })
  })

  describe('AdmissionDocuments', () => {
    it('renders document upload (TEST-COMP-043)', () => {
      render(
        <AdmissionDocuments
          admissionId="adm1"
          documents={['http://example.com/birth_cert.pdf']}
          canUpload={true}
          onUploaded={vi.fn()}
        />
      )

      expect(screen.getByText('birth_cert.pdf')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Upload/i })).toBeInTheDocument()
    })
  })

  describe('AdmissionTimeline', () => {
    it('renders status history (TEST-COMP-044)', () => {
      render(<AdmissionTimeline timeline={mockAdmissionDetail.timeline} />)

      expect(screen.getByText('Status set to APPLIED')).toBeInTheDocument()
      expect(screen.getByText('Application submitted')).toBeInTheDocument()
    })
  })

  describe('AdmissionsPipeline', () => {
    it('renders pipeline columns (TEST-COMP-045)', () => {
      const mockCounts = {
        APPLIED: 1,
        SHORTLISTED: 0,
        TESTING: 0,
        ADMITTED: 0,
        REJECTED: 0,
        WAITLIST: 0,
      }

      render(
        <AdmissionsPipeline
          admissions={[mockAdmissionItem]}
          counts={mockCounts}
          activeStatus="APPLIED"
          loading={false}
          role="REGISTRAR"
          canProcess={true}
          canShortlist={true}
          canScheduleTest={true}
          canAdmit={false}
          canReject={true}
          statusPending={null}
          convertingAdmissionId={null}
          onStatusTabChange={vi.fn()}
          onView={vi.fn()}
          onStatusChange={vi.fn()}
          onConvert={vi.fn()}
        />
      )

      expect(screen.getAllByText('APPLIED')[0]).toBeInTheDocument()
      expect(screen.getByText('SHORTLISTED')).toBeInTheDocument()
      expect(screen.getByText('Rohit Sharma')).toBeInTheDocument()
    })
  })
})
