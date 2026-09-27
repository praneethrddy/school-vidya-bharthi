import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  redirect: vi.fn(() => {
    throw new Error('NEXT_REDIRECT')
  }),
}))

vi.mock('@/lib/auth', () => ({
  auth: mocks.auth,
}))

vi.mock('next/navigation', () => ({
  redirect: mocks.redirect,
}))

vi.mock('@/components/layout/portal-sidebar', () => ({
  PortalSidebar: ({ role }: { role: string }) => <div data-testid="portal-sidebar">{role}</div>,
}))

vi.mock('@/components/layout/portal-header', () => ({
  PortalHeader: ({ user }: { user: { role: string } }) => (
    <div data-testid="portal-header">{user.role}</div>
  ),
}))

import PortalLayout from '../layout'
import PortalLoading from '../loading'
import PortalError from '../error'
import PortalNotFound from '../not-found'

describe('(portal) shell components', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('layout redirects to /login when unauthenticated', async () => {
    mocks.auth.mockResolvedValue(null)

    await expect(
      PortalLayout({
        children: <div>child</div>,
      })
    ).rejects.toThrow('NEXT_REDIRECT')
    expect(mocks.redirect).toHaveBeenCalledWith('/login')
  })

  it('layout redirects non-student/parent roles to /admin', async () => {
    mocks.auth.mockResolvedValue({
      user: {
        role: 'TEACHER',
      },
    })

    await expect(
      PortalLayout({
        children: <div>child</div>,
      })
    ).rejects.toThrow('NEXT_REDIRECT')
    expect(mocks.redirect).toHaveBeenCalledWith('/admin')
  })

  it('layout renders sidebar, header and children for student/parent roles', async () => {
    mocks.auth.mockResolvedValue({
      user: {
        id: 'user-1',
        role: 'STUDENT',
        schoolId: 'school-1',
      },
    })

    const ui = await PortalLayout({
      children: <div>Portal Child Content</div>,
    })

    render(ui)

    expect(screen.getByTestId('portal-sidebar')).toHaveTextContent('STUDENT')
    expect(screen.getByTestId('portal-header')).toHaveTextContent('STUDENT')
    expect(screen.getByText('Portal Child Content')).toBeInTheDocument()
  })

  it('loading renders loading indicator', () => {
    render(<PortalLoading />)

    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('error boundary shows message and allows retry', () => {
    const reset = vi.fn()
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    render(
      <PortalError
        error={new Error('Failed to load dashboard')}
        reset={reset}
      />
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByText('Failed to load dashboard')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(reset).toHaveBeenCalledTimes(1)

    errorSpy.mockRestore()
  })

  it('not-found renders 404 message and dashboard link', () => {
    render(<PortalNotFound />)

    expect(screen.getByText('Page not found')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Return to Dashboard' })).toHaveAttribute(
      'href',
      '/dashboard'
    )
  })
})

