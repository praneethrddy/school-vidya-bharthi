import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import AuthLayout from '../layout'
import LoginPage, { metadata as loginMetadata } from '../login/page'
import ForgotPasswordPage, { metadata as forgotMetadata } from '../forgot-password/page'
import ResetPasswordPage, { metadata as resetMetadata } from '../reset-password/page'
import { LoginForm } from '../login/login-form'
import { ForgotPasswordForm } from '../forgot-password/forgot-password-form'
import { ResetPasswordForm } from '../reset-password/reset-password-form'

describe('SECTION 5A — Auth Layout + Page Wrappers', () => {
  it('TEST-AUTH-PAGE-001: auth layout renders branded shell and children', () => {
    render(
      <AuthLayout>
        <div>Auth child content</div>
      </AuthLayout>
    )

    expect(screen.getByText('VB')).toBeInTheDocument()
    expect(screen.getByText('Vidhya Bharthi High School')).toBeInTheDocument()
    expect(screen.getByText('Auth child content')).toBeInTheDocument()
  })

  it('TEST-AUTH-PAGE-002: auth layout has no admin or portal navigation chrome', () => {
    render(
      <AuthLayout>
        <div>Only auth view</div>
      </AuthLayout>
    )

    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
    expect(screen.queryByText(/admin dashboard/i)).not.toBeInTheDocument()
  })

  it('TEST-AUTH-PAGE-003: login page awaits async searchParams and renders LoginForm', async () => {
    let resolveSearchParams: ((value: Record<string, string>) => void) | null = null
    const searchParams = new Promise<Record<string, string>>((resolve) => {
      resolveSearchParams = resolve
    })

    const pendingRender = LoginPage({ searchParams })
    let settled = false
    pendingRender.then(() => {
      settled = true
    })

    await Promise.resolve()
    expect(settled).toBe(false)

    resolveSearchParams?.({})
    const element = await pendingRender

    expect(settled).toBe(true)
    expect((element as any).type).toBe(LoginForm)
  })

  it('TEST-AUTH-PAGE-004: forgot-password page awaits async searchParams and renders ForgotPasswordForm', async () => {
    let resolveSearchParams: ((value: Record<string, string>) => void) | null = null
    const searchParams = new Promise<Record<string, string>>((resolve) => {
      resolveSearchParams = resolve
    })

    const pendingRender = ForgotPasswordPage({ searchParams })
    let settled = false
    pendingRender.then(() => {
      settled = true
    })

    await Promise.resolve()
    expect(settled).toBe(false)

    resolveSearchParams?.({})
    const element = await pendingRender

    expect(settled).toBe(true)
    expect((element as any).type).toBe(ForgotPasswordForm)
  })

  it('TEST-AUTH-PAGE-005: reset-password page awaits async searchParams and renders ResetPasswordForm', async () => {
    let resolveSearchParams: ((value: Record<string, string>) => void) | null = null
    const searchParams = new Promise<Record<string, string>>((resolve) => {
      resolveSearchParams = resolve
    })

    const pendingRender = ResetPasswordPage({ searchParams })
    let settled = false
    pendingRender.then(() => {
      settled = true
    })

    await Promise.resolve()
    expect(settled).toBe(false)

    resolveSearchParams?.({})
    const element = await pendingRender

    expect(settled).toBe(true)
    expect((element as any).type).toBe(ResetPasswordForm)
  })

  it('TEST-AUTH-PAGE-006: auth page metadata includes title and description', () => {
    expect(String(loginMetadata.title)).toContain('Login')
    expect(loginMetadata.description).toContain('Login')

    expect(String(forgotMetadata.title)).toContain('Forgot Password')
    expect(forgotMetadata.description).toContain('Reset')

    expect(String(resetMetadata.title)).toContain('Reset Password')
    expect(resetMetadata.description).toContain('new password')
  })
})
