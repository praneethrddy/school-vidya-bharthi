import { expect, test } from '@playwright/test'

import { authFiles } from './helpers/auth'

const shouldRun = process.env.RUN_SCHOOL_SETTINGS_E2E === 'true'

test.describe('School Settings Module', () => {
  test.skip(
    !shouldRun,
    'Set RUN_SCHOOL_SETTINGS_E2E=true to run seeded school settings E2E coverage'
  )

  test('Principal can open school settings and view core tabs', async ({ page }) => {
    await page.goto('/admin/settings')

    await expect(page.getByRole('heading', { name: 'School Settings' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'General' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Academic Years' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Classes' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Promotion' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'School Profile' })).toBeVisible()
  })

  test.describe('Teacher access', () => {
    test.use({ storageState: authFiles.teacher })

    test('Teacher cannot manage school settings screen when permission is missing', async ({
      page,
    }) => {
      await page.goto('/admin/settings')

      const deniedText = page.getByText('You do not have access to school settings.')
      const forbiddenHeading = page.getByRole('heading', { name: 'Access Denied' })

      await expect(deniedText.or(forbiddenHeading)).toBeVisible()
    })
  })
})
