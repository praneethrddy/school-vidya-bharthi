import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WelcomeCard } from '../welcome-card'
import { SummaryCard } from '../summary-card'
import { EmptyState } from '@/components/shared/empty-state'
import { Bell } from 'lucide-react'

// Mock the avatar component to avoid complex Radix UI errors in pure DOM tests
vi.mock('@/components/ui/avatar', () => ({
  Avatar: ({ children }: any) => <div data-testid="avatar">{children}</div>,
  AvatarFallback: ({ children }: any) => <div data-testid="avatar-fallback">{children}</div>,
  AvatarImage: () => <img data-testid="avatar-image" />,
}))

describe('Dashboard Components', () => {
  describe('WelcomeCard', () => {
    it('renders correctly with required props', () => {
      render(
        <WelcomeCard
          studentName="Rahul Kumar"
          className="Grade 10A"
          academicYear="2025-2026"
        />
      )

      expect(screen.getByText(/Welcome back, Rahul Kumar!/i)).toBeDefined()
      expect(screen.getByText('Grade 10A')).toBeDefined()
      expect(screen.getByText('Academic Year 2025-2026')).toBeDefined()
    })

    it('renders roll number if provided', () => {
      render(
        <WelcomeCard
          studentName="Rahul Kumar"
          className="Grade 10A"
          academicYear="2025-2026"
          rollNumber="15"
        />
      )

      expect(screen.getByText('Roll No: 15')).toBeDefined()
    })
  })

  describe('SummaryCard', () => {
    it('renders with value and subtitle', () => {
      render(
        <SummaryCard
          title="Attendance"
          value="95%"
          subtitle="This month"
          icon={Bell}
        />
      )

      expect(screen.getByText('Attendance')).toBeDefined()
      expect(screen.getByText('95%')).toBeDefined()
      expect(screen.getByText('This month')).toBeDefined()
    })
  })

  describe('EmptyState', () => {
    it('renders title and description', () => {
      render(
        <EmptyState
          icon={Bell}
          title="No Data"
          description="Empty state description"
        />
      )

      expect(screen.getByText('No Data')).toBeDefined()
      expect(screen.getByText('Empty state description')).toBeDefined()
    })
  })
})
