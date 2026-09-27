import { chromium, type FullConfig } from '@playwright/test'
import fs from 'node:fs'

import { AUTH_DIR, authFiles, type RoleName, TEST_CREDENTIALS } from './helpers/auth'

const roles = Object.entries(TEST_CREDENTIALS.users) as Array<[RoleName, string]>

async function globalSetup(config: FullConfig) {
  fs.mkdirSync(AUTH_DIR, { recursive: true })

  const baseURL =
    config.projects.find((project) => typeof project.use?.baseURL === 'string')?.use?.baseURL ||
    'http://localhost:3001'
  const browser = await chromium.launch()

  for (const [role, email] of roles) {
    const context = await browser.newContext({ baseURL })
    const page = await context.newPage()

    try {
      await page.goto('/login')
      await page.getByLabel('Email').fill(email)
      await page.getByLabel('Password').fill(TEST_CREDENTIALS.password)
      await page.getByRole('button', { name: /login|sign in/i }).click()
      await page.waitForURL((url) => !url.pathname.endsWith('/login'), { timeout: 15000 })
      await context.storageState({ path: authFiles[role] })
      console.log(`Auth saved for ${role} (${email})`)
    } catch (error) {
      console.error(`Auth failed for ${role} (${email})`, error)
      throw error
    } finally {
      await context.close()
    }
  }

  await browser.close()
}

export default globalSetup
