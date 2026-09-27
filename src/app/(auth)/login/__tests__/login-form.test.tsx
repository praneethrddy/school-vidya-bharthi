import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

const loginMocks = vi.hoisted(() => ({
  signIn: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
  callbackUrl: null as string | null,
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  getRedirectPath: vi.fn(),
}))

vi.mock('next-auth/react', () => ({
  signIn: loginMocks.signIn,
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: loginMocks.push,
    refresh: loginMocks.refresh,
  }),
  useSearchParams: () => ({
    get: (key: string) => (key === 'callbackUrl' ? loginMocks.callbackUrl : null),
  }),
}))

vi.mock('sonner', () => ({
  toast: {
    success: loginMocks.toastSuccess,
    error: loginMocks.toastError,
  },
}))

vi.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({ ...props }: any) => <input type="checkbox" {...props} />,
}))

vi.mock('@/lib/auth-redirect', () => ({
  getRedirectPath: loginMocks.getRedirectPath,
}))

import { LoginForm } from '../login-form'

function deferred<T>() {
  let resolve: ((value: T) => void) | null = null
  const promise = new Promise<T>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

describe('SECTION 5B — Login Form', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    loginMocks.callbackUrl = null
    loginMocks.signIn.mockResolvedValue({ error: null })
    loginMocks.getRedirectPath.mockReturnValue('/admin/dashboard')

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: async () => ({ user: { role: 'TEACHER' } }),
      })
    )
  })

  it('TEST-AUTH-LOGIN-001: renders login controls and forgot-password link', () => {
    render(<LoginForm />)

    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByText('Remember me')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Forgot Password?' })).toHaveAttribute(
      'href',
      '/forgot-password'
    )
    expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument()
  })

  it('TEST-AUTH-LOGIN-002: client validation blocks invalid email and empty password', async () => {
    render(<LoginForm />)

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'teacher@vbhs.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Login' }))

    expect(await screen.findByText('Password is required')).toBeInTheDocument()
    expect(loginMocks.signIn).not.toHaveBeenCalled()
  })

  it('TEST-AUTH-LOGIN-003: submits credentials using credentials provider and redirect false', async () => {
    render(<LoginForm />)

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'teacher@vbhs.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Test@1234' } })
    fireEvent.click(screen.getByRole('button', { name: 'Login' }))

    await waitFor(() => {
      expect(loginMocks.signIn).toHaveBeenCalledWith('credentials', {
        email: 'teacher@vbhs.com',
        password: 'Test@1234',
        redirect: false,
      })
    })
  })

  it('TEST-AUTH-LOGIN-004: signIn error shows toast and does not redirect', async () => {
    loginMocks.signIn.mockResolvedValue({ error: 'Invalid email or password' })

    render(<LoginForm />)

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'teacher@vbhs.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Wrong@123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Login' }))

    await waitFor(() => {
      expect(loginMocks.toastError).toHaveBeenCalledWith('Invalid email or password')
    })
    expect(loginMocks.push).not.toHaveBeenCalled()
  })

  it('TEST-AUTH-LOGIN-005: successful login fetches session and redirects to callbackUrl', async () => {
    loginMocks.callbackUrl = '/admin/students'

    render(<LoginForm />)

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'teacher@vbhs.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Test@1234' } })
    fireEvent.click(screen.getByRole('button', { name: 'Login' }))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/auth/session', { cache: 'no-store' })
      expect(loginMocks.push).toHaveBeenCalledWith('/admin/students')
      expect(loginMocks.refresh).toHaveBeenCalled()
    })
  })

  it('TEST-AUTH-LOGIN-006: callbackUrl=/login is ignored and fallback role redirect is used', async () => {
    loginMocks.callbackUrl = '/login'

    render(<LoginForm />)

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'teacher@vbhs.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Test@1234' } })
    fireEvent.click(screen.getByRole('button', { name: 'Login' }))

    await waitFor(() => {
      expect(loginMocks.getRedirectPath).toHaveBeenCalledWith('TEACHER')
      expect(loginMocks.push).toHaveBeenCalledWith('/admin/dashboard')
    })
  })

  it('TEST-AUTH-LOGIN-007: missing callbackUrl uses role-based redirect helper', async () => {
    render(<LoginForm />)

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'teacher@vbhs.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Test@1234' } })
    fireEvent.click(screen.getByRole('button', { name: 'Login' }))

    await waitFor(() => {
      expect(loginMocks.getRedirectPath).toHaveBeenCalledWith('TEACHER')
      expect(loginMocks.push).toHaveBeenCalledWith('/admin/dashboard')
    })
  })

  it('TEST-AUTH-LOGIN-008: missing role in session falls back to /dashboard', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: async () => ({ user: {} }),
      })
    )

    render(<LoginForm />)

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'student@vbhs.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Test@1234' } })
    fireEvent.click(screen.getByRole('button', { name: 'Login' }))

    await waitFor(() => {
      expect(loginMocks.push).toHaveBeenCalledWith('/dashboard')
    })
    expect(loginMocks.getRedirectPath).not.toHaveBeenCalled()
  })

  it('TEST-AUTH-LOGIN-009: unexpected exception shows generic error toast', async () => {
    loginMocks.signIn.mockRejectedValue(new Error('Unexpected signIn crash'))

    render(<LoginForm />)

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'teacher@vbhs.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Test@1234' } })
    fireEvent.click(screen.getByRole('button', { name: 'Login' }))

    await waitFor(() => {
      expect(loginMocks.toastError).toHaveBeenCalledWith('An unexpected error occurred')
    })
  })

  it('TEST-AUTH-LOGIN-010: submit button is disabled with loading indicator while signIn is in flight', async () => {
    const pendingSignIn = deferred<{ error: string | null }>()
    loginMocks.signIn.mockReturnValue(pendingSignIn.promise)

    render(<LoginForm />)

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'teacher@vbhs.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Test@1234' } })
    fireEvent.click(screen.getByRole('button', { name: 'Login' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Logging in/i })).toBeDisabled()
    })

    pendingSignIn.resolve?.({ error: null })
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Login' })).toBeEnabled()
    })
  })
})
