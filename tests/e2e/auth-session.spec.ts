import { expect, test } from '@playwright/test'

import { TEST_CREDENTIALS } from './helpers/auth'
import { loginViaUi } from './helpers/ui-auth'

const shouldRun = process.env.RUN_AUTH_E2E === 'true'

test.describe('Authentication & Session', () => {
  test.skip(!shouldRun, 'Set RUN_AUTH_E2E=true to run auth and session E2E coverage')

  test('principal is redirected to admin dashboard after login', async ({ page }) => {
    await loginViaUi(page, TEST_CREDENTIALS.users.principal, TEST_CREDENTIALS.password)
    await expect(page).toHaveURL(/\/admin\/dashboard/)
    await expect(page.getByRole('heading', { name: /Welcome/i })).toBeVisible()
  })

  test('student is redirected to portal dashboard after login', async ({ page }) => {
    await loginViaUi(page, TEST_CREDENTIALS.users.student, TEST_CREDENTIALS.password)
    await expect(page).toHaveURL(/\/dashboard/)
  })

  test('super admin is redirected to super-admin dashboard after login', async ({ page }) => {
    await loginViaUi(page, TEST_CREDENTIALS.users.superadmin, TEST_CREDENTIALS.password)
    await expect(page).toHaveURL(/\/super-admin\/dashboard/)
  })

  test('invalid credentials show auth error and keep user on login page', async ({ page }) => {
    await loginViaUi(page, TEST_CREDENTIALS.users.principal, 'Wrong@123')
    await expect(page.getByText('Invalid email or password')).toBeVisible()
    await expect(page).toHaveURL(/\/login/)
  })
})
