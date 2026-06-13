import { act, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import StatCounter from '@/components/public/stat-counter'

describe('StatCounter', () => {
  it('animates to the final value', () => {
    vi.useFakeTimers()

    render(<StatCounter value={120} label="Students" suffix="+" duration={300} />)

    expect(screen.getByText((_, element) => element?.textContent === '0+')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(400)
    })

    expect(screen.getByText((_, element) => element?.textContent === '120+')).toBeInTheDocument()

    vi.useRealTimers()
  })
})
