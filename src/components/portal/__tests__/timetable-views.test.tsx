import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { TimetableGrid } from '../timetable-grid'
import { TimetableDayView } from '../timetable-day-view'

const schedule = {
  MON: [
    {
      period_number: 1,
      start_time: '09:00',
      end_time: '09:40',
      subject_name: 'Mathematics',
      subject_code: 'MTH',
      teacher_name: 'Meera Shah',
    },
  ],
  TUE: [],
}

describe('Timetable portal views', () => {
  it('renders weekly timetable grid with subject and teacher', () => {
    render(<TimetableGrid schedule={schedule} workingDays={['MON', 'TUE']} />)

    expect(screen.getByText('Mathematics')).toBeInTheDocument()
    expect(screen.getByText('Meera Shah')).toBeInTheDocument()
    expect(screen.getByText('09:00 - 09:40')).toBeInTheDocument()
  })

  it('renders mobile day view tabs and empty-day message', () => {
    render(<TimetableDayView schedule={schedule} workingDays={['MON', 'TUE']} />)

    expect(screen.getByRole('tab', { name: 'MON' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'TUE' })).toBeInTheDocument()

    // At least one of the two states should be visible depending on default day selection.
    const hasClass = screen.queryByText('Mathematics')
    const hasEmpty = screen.queryByText(/No classes scheduled/i)
    expect(Boolean(hasClass) || Boolean(hasEmpty)).toBe(true)
  })
})

