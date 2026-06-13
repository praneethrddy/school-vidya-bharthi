import { expect, test } from '@playwright/test'

import { authFiles } from './helpers/auth'

const shouldRun = process.env.RUN_PERMISSION_E2E === 'true'

test.describe('Permission Management', () => {
  test.skip(!shouldRun, 'Set RUN_PERMISSION_E2E=true to run seeded permission E2E coverage')

  test('Principal can view modules and principal-only toggles are locked', async ({ page }) => {
    await page.goto('/admin/permissions')

    await expect(page.getByRole('heading', { name: 'Permission Management' })).toBeVisible()
    await expect(page.getByText('Attendance', { exact: false })).toBeVisible()
    await expect(page.getByText('Grades', { exact: false })).toBeVisible()

    const principalOnlySwitch = page.locator('button[role="checkbox"][disabled]').first()
    await expect(principalOnlySwitch).toBeDisabled()
  })

  test('Principal can update and save a role permission', async ({ page }) => {
    await page.goto('/admin/permissions')

    const toggle = page.locator('[role="checkbox"]:not([disabled])').first()
    const wasChecked = (await toggle.getAttribute('data-state')) === 'checked'
    await toggle.click()

    await page.getByRole('button', { name: 'Save Changes' }).click()
    await expect(page.getByText('Role permissions updated')).toBeVisible()

    await page.reload()
    await expect(page.locator('[role="checkbox"]:not([disabled])').first()).toHaveAttribute(
      'data-state',
      !wasChecked ? 'checked' : 'unchecked'
    )
  })

  test.describe('Teacher access', () => {
    test.use({ storageState: authFiles.teacher })

    test('Teacher is redirected to forbidden page for /admin/permissions', async ({ page }) => {
      await page.goto('/admin/permissions')
      await expect(page).toHaveURL(/\/portal\/forbidden/)
      await expect(page.getByRole('heading', { name: 'Access Denied' })).toBeVisible()
    })

    test('Teacher sidebar hides principal-only Permissions nav item', async ({ page }) => {
      await page.goto('/admin/dashboard')
      await expect(page.getByRole('link', { name: /Permissions/i })).toHaveCount(0)
    })
  })
})
