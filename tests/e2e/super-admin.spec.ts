import { expect, test } from '@playwright/test'

import { authFiles, emptyStorageState } from './helpers/auth'

const shouldRun = process.env.RUN_SUPER_ADMIN_E2E === 'true'

test.describe('Super Admin', () => {
  test.skip(!shouldRun, 'Set RUN_SUPER_ADMIN_E2E=true to run seeded super-admin E2E coverage')

  test('TEST-SA-001: super admin can open dashboard page', async ({ page }) => {
    await page.goto('/super-admin/dashboard')

    await expect(page.getByRole('heading', { name: 'SchoolOS Super Admin' })).toBeVisible()
    await expect(page.getByText('Recent Tenants')).toBeVisible()
    await expect(page.getByText('Platform Pulse')).toBeVisible()
  })

  test.describe('Principal access', () => {
    test.use({ storageState: authFiles.principal })

    test('TEST-SA-006: non-super-admin is redirected away from super-admin route', async ({
      page,
    }) => {
      await page.goto('/super-admin/dashboard')

      await expect(page).toHaveURL(/\/admin\/dashboard/)
    })
  })

  test.describe('Unauthenticated access', () => {
    test.use({ storageState: emptyStorageState })

    test('unauthenticated user is redirected to login for /super-admin/dashboard', async ({
      page,
    }) => {
      await page.goto('/super-admin/dashboard')
      await expect(page).toHaveURL(/\/login\?callbackUrl=/)
    })
  })
})
