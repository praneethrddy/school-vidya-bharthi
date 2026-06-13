import { render, screen } from '@testing-library/react'
import { Users } from 'lucide-react'
import { describe, expect, it } from 'vitest'
import { StatCard } from '@/components/admin/stat-card'

describe('StatCard', () => {
  it('renders title, value, description, and icon content', () => {
    render(
      <StatCard
        title="Total Students"
        value="520"
        description="Across 18 active classes"
        icon={Users}
      />
    )

    expect(screen.getByText('Total Students')).toBeInTheDocument()
    expect(screen.getByText('520')).toBeInTheDocument()
    expect(screen.getByText('Across 18 active classes')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '520' })).toBeInTheDocument()
  })
})

