import { expect, test } from '@playwright/test'

import { TEST_CREDENTIALS } from './helpers/auth'
import { loginViaUi } from './helpers/ui-auth'

const shouldRun = process.env.RUN_AUTH_E2E === 'true'

const seededResetToken = process.env.E2E_RESET_TOKEN
const seededResetPassword = process.env.E2E_RESET_NEW_PASSWORD || 'Reset@1234'

test.describe('[E2E-AUTH-PAGES] Auth Pages', () => {
  test.skip(!shouldRun, 'Set RUN_AUTH_E2E=true to run auth pages E2E coverage')

  test('should render login auth controls and forgot-password link', async ({ page }) => {
    await page.goto('/login')

    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByLabel('Password')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Login' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Forgot Password?' })).toHaveAttribute(
      'href',
      '/forgot-password'
    )
  })

  test('should keep user on /login with auth error for invalid credentials', async ({ page }) => {
    await loginViaUi(page, TEST_CREDENTIALS.users.principal, 'Wrong@123')
    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByText('Invalid email or password')).toBeVisible()
  })

  test('should preserve callbackUrl and use it after successful login', async ({ page }) => {
    await loginViaUi(page, TEST_CREDENTIALS.users.principal, TEST_CREDENTIALS.password, {
      path: '/login?callbackUrl=%2Fadmin%2Fdashboard',
    })

    await expect(page).toHaveURL(/\/admin\/dashboard/)
  })

  test('should show anti-enumeration success state after forgot-password submission', async ({
    page,
  }) => {
    await page.goto('/forgot-password')
    await page.getByLabel('Email').fill('noone@vbhs.com')
    await page.getByRole('button', { name: 'Send Reset Link' }).click()

    await expect(page.getByText(/If an account exists for/i)).toBeVisible()
    await expect(page.getByRole('link', { name: 'Back to Login' })).toBeVisible()
  })

  test('should show invalid token guidance for reset-password without token', async ({ page }) => {
    await page.goto('/reset-password')
    await expect(page.getByText('Invalid or missing reset token.')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Request new reset link' })).toBeVisible()
  })

  test('should reset password with seeded token flow and return to login', async ({ page }) => {
    test.skip(!seededResetToken, 'Set E2E_RESET_TOKEN to run seeded reset-password token workflow')

    await page.goto(`/reset-password?token=${seededResetToken}`)
    await page.getByLabel('New Password').fill(seededResetPassword)
    await page.getByLabel('Confirm Password').fill(seededResetPassword)
    await page.getByRole('button', { name: 'Reset Password' }).click()

    await expect(page.getByText('Password reset successful!')).toBeVisible()
    await page.getByRole('button', { name: 'Go to Login' }).click()
    await expect(page).toHaveURL(/\/login/)
  })
})
