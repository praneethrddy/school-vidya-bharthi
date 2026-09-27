import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import { ExamTable } from '../exam-table'
import { ExamForm } from '../exam-form'
import { GradeEntryGrid } from '../grade-entry-grid'
import { GradeSummary } from '../grade-summary'
import { ReportCardGenerator } from '../report-card-generator'

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
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

const mockExams = [
  {
    id: 'e1',
    name: 'Mid Term Exam',
    class_name: 'Grade 10',
    term_name: 'Term 1',
    start_date: '2026-05-15T00:00:00Z',
    end_date: '2026-05-20T00:00:00Z',
    subjects_count: 5,
    grades_entered_count: 150,
  },
]

const mockClasses = [
  { id: 'c1', name: 'Grade 10A' },
  { id: 'c2', name: 'Grade 9B' },
]

const mockTerms = [
  { id: 't1', name: 'Term 1' },
]

const mockSubjects = [
  { id: 'sub1', name: 'Mathematics', class_id: 'c1' },
  { id: 'sub2', name: 'Science', class_id: 'c1' },
]

const mockGrades = [
  {
    grade_id: 'g1',
    student_id: 's1',
    student_name: 'Aarav Mehta',
    roll_number: '12',
    marks_obtained: 85,
    grade: 'A',
    remarks: 'Good',
    is_pass: true,
  },
  {
    grade_id: null,
    student_id: 's2',
    student_name: 'Diya Sharma',
    roll_number: '15',
    marks_obtained: null,
    grade: null,
    remarks: null,
    is_pass: null,
  },
]

describe('Grades Module Components', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(window, 'confirm').mockImplementation(() => true)
  })

  describe('ExamTable', () => {
    it('renders exam list correctly (TEST-COMP-025)', () => {
      render(
        <ExamTable
          exams={mockExams}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          canEdit={true}
          canDelete={true}
        />
      )

      expect(screen.getByText('Mid Term Exam')).toBeInTheDocument()
      expect(screen.getByText('Grade 10')).toBeInTheDocument()
      expect(screen.getByText('Term 1')).toBeInTheDocument()
      expect(screen.getByText('5')).toBeInTheDocument() // subjects count
    })
  })

  describe('ExamForm', () => {
    it('validates required fields (TEST-COMP-026)', async () => {
      render(
        <ExamForm
          classes={mockClasses}
          terms={mockTerms}
          subjects={mockSubjects}
          academicYearId="ay1"
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />
      )

      const submitBtn = screen.getByRole('button', { name: /Create Exam/i })
      fireEvent.click(submitBtn)

      // Validation errors should be visible since Hook Form validation is async
      await waitFor(() => {
        expect(screen.getByText('Exam name is required')).toBeInTheDocument()
        expect(screen.getByText('Class is required')).toBeInTheDocument()
        expect(screen.getByText('Term is required')).toBeInTheDocument()
      })
    })
  })

  describe('GradeEntryGrid', () => {
    it('renders student rows with marks input (TEST-COMP-027)', () => {
      render(
        <GradeEntryGrid
          grades={mockGrades}
          maxMarks={100}
          passingMarks={35}
          onSave={vi.fn()}
        />
      )

      expect(screen.getByText('Aarav Mehta')).toBeInTheDocument()
      expect(screen.getByText('Diya Sharma')).toBeInTheDocument()
      expect(screen.getAllByPlaceholderText('/ 100')[0]).toBeInTheDocument()
    })

    it('validates marks <= max_marks (TEST-COMP-028)', async () => {
      render(
        <GradeEntryGrid
          grades={mockGrades}
          maxMarks={100}
          passingMarks={35}
          onSave={vi.fn()}
        />
      )

      const inputs = screen.getAllByPlaceholderText('/ 100')
      // Try to enter 105 (exceeding maxMarks = 100) for Diya
      fireEvent.change(inputs[1], { target: { value: '105' } })

      expect(screen.getByText('Invalid')).toBeInTheDocument()
    })
  })

  describe('GradeSummary', () => {
    it('shows grade distribution correctly (TEST-COMP-029)', () => {
      const mockSummary = {
        total_students: 40,
        entered: 38,
        pending: 2,
        pass_count: 35,
        fail_count: 3,
        highest: 98,
        lowest: 24,
        average: 76.5,
        class_pass_percentage: 92.1,
      }

      render(<GradeSummary summary={mockSummary} />)

      expect(screen.getByText('Entries Progress')).toBeInTheDocument()
      expect(screen.getByText('38')).toBeInTheDocument()
      expect(screen.getByText('Pass Rate')).toBeInTheDocument()
      expect(screen.getByText('92.1%')).toBeInTheDocument()
      expect(screen.getByText('Highest:')).toBeInTheDocument()
      expect(screen.getByText('98')).toBeInTheDocument()
      expect(screen.getByText('Lowest:')).toBeInTheDocument()
      expect(screen.getByText('24')).toBeInTheDocument()
    })
  })

  describe('ReportCardGenerator', () => {
    it('triggers PDF generation or lists students (TEST-COMP-030)', async () => {
      const handleGenerateBulk = vi.fn()
      global.fetch = vi.fn().mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              data: [
                {
                  student_id: 's1',
                  student_name: 'Aarav Mehta',
                  roll_number: '12',
                  has_grades: true,
                  download_url: '/download/s1.pdf',
                },
              ],
            }),
        })
      )

      render(
        <ReportCardGenerator
          classId="c1"
          termId="t1"
          onGenerateBulk={handleGenerateBulk}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Aarav Mehta')).toBeInTheDocument()
        expect(screen.getByText('Grades Available')).toBeInTheDocument()
      })

      const generateBtn = screen.getByRole('button', { name: /Generate All Missing Reports/i })
      fireEvent.click(generateBtn)

      expect(handleGenerateBulk).toHaveBeenCalled()
    })
  })
})
