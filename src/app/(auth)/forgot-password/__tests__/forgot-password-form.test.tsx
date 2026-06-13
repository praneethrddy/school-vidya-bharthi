import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

const forgotMocks = vi.hoisted(() => ({
  toastError: vi.fn(),
}))

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

vi.mock('sonner', () => ({
  toast: {
    error: forgotMocks.toastError,
  },
}))

import { ForgotPasswordForm } from '../forgot-password-form'

function deferred<T>() {
  let resolve: ((value: T) => void) | null = null
  const promise = new Promise<T>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

describe('SECTION 5C — Forgot Password Form', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
      })
    )
  })

  it('TEST-AUTH-FP-FORM-001: renders controls and back-to-login link', () => {
    render(<ForgotPasswordForm />)

    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Send Reset Link' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to Login' })).toHaveAttribute('href', '/login')
  })

  it('TEST-AUTH-FP-FORM-002: invalid email fails validation and blocks submit', async () => {
    render(<ForgotPasswordForm />)

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send Reset Link' }))

    expect(await screen.findByText('Invalid email address')).toBeInTheDocument()
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('TEST-AUTH-FP-FORM-003: successful response shows anti-enumeration confirmation message', async () => {
    render(<ForgotPasswordForm />)

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'parent@vbhs.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send Reset Link' }))

    expect(await screen.findByText(/If an account exists for/i)).toBeInTheDocument()
    expect(screen.getByText('parent@vbhs.com')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to Login' })).toHaveAttribute('href', '/login')
  })

  it('TEST-AUTH-FP-FORM-004: non-OK API response shows generic error toast', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
      })
    )

    render(<ForgotPasswordForm />)

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'parent@vbhs.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send Reset Link' }))

    await waitFor(() => {
      expect(forgotMocks.toastError).toHaveBeenCalledWith('An unexpected error occurred')
    })
  })

  it('TEST-AUTH-FP-FORM-005: button is disabled and shows loading state during request', async () => {
    const pendingRequest = deferred<{ ok: boolean }>()
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(pendingRequest.promise))

    render(<ForgotPasswordForm />)

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'parent@vbhs.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send Reset Link' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Sending/i })).toBeDisabled()
    })

    pendingRequest.resolve?.({ ok: true })
    expect(await screen.findByText(/If an account exists for/i)).toBeInTheDocument()
  })

  it('TEST-AUTH-FP-FORM-006: submits JSON body to forgot-password endpoint', async () => {
    render(<ForgotPasswordForm />)

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'parent@vbhs.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send Reset Link' }))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'parent@vbhs.com' }),
      })
    })
  })
})
