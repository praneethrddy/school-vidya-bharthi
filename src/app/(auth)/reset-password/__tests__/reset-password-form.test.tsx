import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

const resetFormMocks = vi.hoisted(() => ({
  token: null as string | null,
  push: vi.fn(),
  toastError: vi.fn(),
}))

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: resetFormMocks.push,
  }),
  useSearchParams: () => ({
    get: (key: string) => (key === 'token' ? resetFormMocks.token : null),
  }),
}))

vi.mock('sonner', () => ({
  toast: {
    error: resetFormMocks.toastError,
  },
}))

import { ResetPasswordForm } from '../reset-password-form'

describe('SECTION 5D — Reset Password Form', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetFormMocks.token = 'valid-token'
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      })
    )
  })

  it('TEST-AUTH-RP-FORM-001: missing token shows invalid token guidance', async () => {
    resetFormMocks.token = null

    render(<ResetPasswordForm />)

    expect(await screen.findByText('Invalid or missing reset token.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Request new reset link' })).toHaveAttribute(
      'href',
      '/forgot-password'
    )
  })

  it('TEST-AUTH-RP-FORM-002: token present renders password and confirm fields', async () => {
    render(<ResetPasswordForm />)

    expect(await screen.findByLabelText('New Password')).toBeInTheDocument()
    expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reset Password' })).toBeInTheDocument()
  })

  it('TEST-AUTH-RP-FORM-003: enforces password policy before submit', async () => {
    render(<ResetPasswordForm />)

    fireEvent.change(await screen.findByLabelText('New Password'), { target: { value: 'short' } })
    fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: 'short' } })
    fireEvent.click(screen.getByRole('button', { name: 'Reset Password' }))

    expect(await screen.findByText(/at least 8 characters/i)).toBeInTheDocument()
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it("TEST-AUTH-RP-FORM-004: confirm password mismatch shows form error", async () => {
    render(<ResetPasswordForm />)

    fireEvent.change(await screen.findByLabelText('New Password'), {
      target: { value: 'Valid@123' },
    })
    fireEvent.change(screen.getByLabelText('Confirm Password'), {
      target: { value: 'Different@123' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Reset Password' }))

    expect(await screen.findByText("Passwords don't match")).toBeInTheDocument()
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('TEST-AUTH-RP-FORM-005: success response shows password reset confirmation', async () => {
    render(<ResetPasswordForm />)

    fireEvent.change(await screen.findByLabelText('New Password'), {
      target: { value: 'Valid@123' },
    })
    fireEvent.change(screen.getByLabelText('Confirm Password'), {
      target: { value: 'Valid@123' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Reset Password' }))

    expect(await screen.findByText('Password reset successful!')).toBeInTheDocument()
  })

  it('TEST-AUTH-RP-FORM-006: Go to Login action routes to /login', async () => {
    render(<ResetPasswordForm />)

    fireEvent.change(await screen.findByLabelText('New Password'), {
      target: { value: 'Valid@123' },
    })
    fireEvent.change(screen.getByLabelText('Confirm Password'), {
      target: { value: 'Valid@123' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Reset Password' }))

    const goToLoginButton = await screen.findByRole('button', { name: 'Go to Login' })
    fireEvent.click(goToLoginButton)

    expect(resetFormMocks.push).toHaveBeenCalledWith('/login')
  })

  it('TEST-AUTH-RP-FORM-007: backend error payload surfaces readable toast message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ success: false, error: { message: 'Invalid token' } }),
      })
    )

    render(<ResetPasswordForm />)

    fireEvent.change(await screen.findByLabelText('New Password'), {
      target: { value: 'Valid@123' },
    })
    fireEvent.change(screen.getByLabelText('Confirm Password'), {
      target: { value: 'Valid@123' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Reset Password' }))

    await waitFor(() => {
      expect(resetFormMocks.toastError).toHaveBeenCalledWith('Invalid token')
    })
  })

  it('TEST-AUTH-RP-FORM-008: request body contains token and password only', async () => {
    render(<ResetPasswordForm />)

    fireEvent.change(await screen.findByLabelText('New Password'), {
      target: { value: 'Valid@123' },
    })
    fireEvent.change(screen.getByLabelText('Confirm Password'), {
      target: { value: 'Valid@123' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Reset Password' }))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: 'valid-token',
          password: 'Valid@123',
        }),
      })
    })
  })
})
