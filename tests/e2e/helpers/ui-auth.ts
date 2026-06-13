import { expect, type Page } from '@playwright/test'

type LoginOptions = {
  path?: string
  timeout?: number
  waitForRedirect?: boolean
}

export async function loginViaUi(
  page: Page,
  email: string,
  password: string,
  options: LoginOptions = {}
) {
  const { path = '/login', timeout = 3000, waitForRedirect = true } = options

  await page.goto(path)
  await page.waitForLoadState('networkidle')
  await expect(page.getByLabel('Email')).toBeVisible()
  await expect(page.getByLabel('Password')).toBeVisible()
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: /login|sign in/i }).click()

  if (waitForRedirect) {
    await page.waitForURL((url) => !url.pathname.endsWith('/login'), { timeout }).catch(() => {})
  }
}
