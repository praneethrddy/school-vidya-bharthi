import { expect, test } from '@playwright/test'

import { authFiles, emptyStorageState } from './helpers/auth'

const shouldRun = process.env.RUN_STAFF_E2E === 'true'

test.describe('Staff Management', () => {
  test.skip(!shouldRun, 'Set RUN_STAFF_E2E=true to run seeded staff management E2E coverage')

  test('principal can open staff management page', async ({ page }) => {
    await page.goto('/admin/staff')

    await expect(page.getByRole('heading', { name: 'Staff Management' })).toBeVisible()
    await expect(
      page.getByText('Add, search, and manage staff records with account and workload controls.')
    ).toBeVisible()
  })

  test.describe('Teacher access', () => {
    test.use({ storageState: authFiles.teacher })

    test('teacher sidebar hides Staff nav item without STAFF.view permission', async ({ page }) => {
      await page.goto('/admin/dashboard')

      await expect(page.getByRole('link', { name: /^Staff$/i })).toHaveCount(0)
    })
  })

  test.describe('Unauthenticated access', () => {
    test.use({ storageState: emptyStorageState })

    test('unauthenticated user is redirected to login for /admin/staff', async ({ page }) => {
      await page.goto('/admin/staff')
      await expect(page).toHaveURL(/\/login\?callbackUrl=/)
    })
  })
})
