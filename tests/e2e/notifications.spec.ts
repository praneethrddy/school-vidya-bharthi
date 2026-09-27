import { expect, test } from '@playwright/test'

import { emptyStorageState } from './helpers/auth'

const shouldRun = process.env.RUN_NOTIFICATION_E2E === 'true'

test.describe('Notifications Module', () => {
  test.skip(!shouldRun, 'Set RUN_NOTIFICATION_E2E=true to run seeded notification E2E coverage')

  test('student can open notifications center and see filter controls', async ({ page }) => {
    await page.goto('/notifications')

    await expect(page.getByRole('heading', { name: 'Notifications' }).first()).toBeVisible()
    await expect(page.getByRole('tab', { name: 'All' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Unread' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Mark all as read' })).toBeVisible()
  })

  test('initial UNREAD filter query selects the unread tab', async ({ page }) => {
    await page.goto('/notifications?filter=UNREAD')

    const unreadTab = page.getByRole('tab', { name: 'Unread' })
    await expect(unreadTab).toBeVisible()
    await expect(unreadTab).toHaveAttribute('data-state', 'active')
  })

  test.describe('Unauthenticated access', () => {
    test.use({ storageState: emptyStorageState })

    test('unauthenticated user is redirected to login for /notifications', async ({ page }) => {
      await page.goto('/notifications')
      await expect(page).toHaveURL(/\/login\?callbackUrl=/)
    })
  })
})
