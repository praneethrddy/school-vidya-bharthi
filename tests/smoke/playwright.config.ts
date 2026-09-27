import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: '.',
  fullyParallel: false,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    cwd: '../..',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    env: {
      ...process.env,
      NODE_ENV: 'test',
    },
  },
})
