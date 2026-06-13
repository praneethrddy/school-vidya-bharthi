import { expect, test } from '@playwright/test'

import { authFiles } from './helpers/auth'

const shouldRun = process.env.RUN_FEES_E2E === 'true'

test.describe('Fee Management', () => {
  test.skip(!shouldRun, 'Set RUN_FEES_E2E=true to run fee management E2E coverage')

  test('principal can open fee management page', async ({ page }) => {
    await page.goto('/admin/fees')

    await expect(page.getByRole('heading', { name: 'Fee Management' })).toBeVisible()
    await expect(page.getByText('Concession', { exact: false }).first()).toBeVisible()
  })

  test.describe('Accountant access', () => {
    test.use({ storageState: authFiles.accountant })

    test('accountant can view payments and defaulters sections', async ({ page }) => {
      await page.goto('/admin/fees')

      await expect(page.getByRole('tab', { name: 'Record Payment' })).toBeVisible()
      await expect(page.getByRole('tab', { name: 'Defaulters' })).toBeVisible()
    })
  })
})
