import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { AttendanceView } from '../attendance-view'

const mocks = vi.hoisted(() => ({
  toastError: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: {
    error: mocks.toastError,
  },
}))

vi.mock('@/components/portal/attendance-calendar', () => ({
  AttendanceCalendar: ({
    records,
    isLoading,
  }: {
    records: Array<{ date: string; status: string }>
    isLoading: boolean
  }) => (
    <div data-testid="attendance-calendar">
      {isLoading ? 'loading' : `records:${records.length}`}
    </div>
  ),
}))

vi.mock('@/components/portal/attendance-stats', () => ({
  AttendanceStats: ({
    summary,
    isLoading,
  }: {
    summary: { present?: number } | null
    isLoading: boolean
  }) => <div data-testid="attendance-stats">{isLoading ? 'loading' : `present:${summary?.present ?? 0}`}</div>,
}))

vi.mock('@/components/portal/attendance-trend-chart', () => ({
  AttendanceTrendChart: () => <div data-testid="attendance-trend">trend</div>,
}))

describe('AttendanceView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL | Request) => {
        const url = typeof input === 'string' ? input : input.toString()

        if (url.startsWith('/api/attendance/summary')) {
          return {
            ok: true,
            json: async () => ({
              percentage: 90,
              present: 9,
              absent: 1,
              late: 0,
              half_day: 0,
              total_days: 10,
            }),
          } as Response
        }

        return {
          ok: true,
          json: async () => ({
            records: [{ date: '2026-04-01', status: 'PRESENT', remarks: null }],
            summary: {
              total_working_days: 20,
              present: 18,
              absent: 1,
              late: 1,
              half_day: 0,
              holidays: 0,
              percentage: 90,
            },
          }),
        } as Response
      })
    )
  })

  it('loads monthly attendance and overall summary on mount', async () => {
    render(<AttendanceView />)

    await waitFor(() => {
      const calendarStates = screen
        .getAllByTestId('attendance-calendar')
        .map((el) => el.textContent || '')
      expect(calendarStates.some((value) => value.includes('records:1'))).toBe(true)
    })
    expect(screen.getAllByTestId('attendance-stats').length).toBeGreaterThan(0)
    expect(screen.getByTestId('attendance-trend')).toHaveTextContent('trend')

    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/attendance?month='))
    expect(fetch).toHaveBeenCalledWith('/api/attendance/summary')
  })

  it('adds student_id for parent-selected child context', async () => {
    render(<AttendanceView studentId="student-child-1" />)

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/attendance?month=')
      )
    })
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('student_id=student-child-1')
    )
    expect(fetch).toHaveBeenCalledWith('/api/attendance/summary?student_id=student-child-1')
  })

  it('shows toast on monthly attendance API failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL | Request) => {
        const url = typeof input === 'string' ? input : input.toString()
        if (url.startsWith('/api/attendance/summary')) {
          return {
            ok: true,
            json: async () => ({
              percentage: 80,
              present: 8,
              absent: 2,
              late: 0,
              half_day: 0,
              total_days: 10,
            }),
          } as Response
        }

        return {
          ok: false,
          json: async () => ({ error: 'Failed to fetch attendance' }),
        } as Response
      })
    )

    render(<AttendanceView />)

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith('Failed to fetch attendance')
    })
  })
})
