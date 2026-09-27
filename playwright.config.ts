import { defineConfig, devices } from '@playwright/test'
import path from 'node:path'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  globalSetup: path.resolve(process.cwd(), 'tests/e2e/global-setup.ts'),
  use: {
    baseURL: 'http://localhost:3001',
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      testMatch: ['multi-browser-e2e.spec.ts'],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      testMatch: ['multi-browser-e2e.spec.ts'],
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      testMatch: ['multi-browser-e2e.spec.ts'],
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-chrome',
      testMatch: ['multi-browser-e2e.spec.ts'],
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-safari',
      testMatch: ['multi-browser-e2e.spec.ts'],
      use: { ...devices['iPhone 13'] },
    },
    {
      name: 'auth-tests',
      testMatch: ['auth-pages.spec.ts', 'auth-session.spec.ts'],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'public-tests',
      testMatch: [
        'cross-cutting-concerns.spec.ts',
        'middleware-multi-tenancy.spec.ts',
        'public-website.spec.ts',
        'security.spec.ts',
        'seo.spec.ts',
        'webhook.spec.ts',
      ],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'admin-tests',
      testMatch: [
        'admin-attendance.spec.ts',
        'admin-dashboard.spec.ts',
        'data-import.spec.ts',
        'fees-management.spec.ts',
        'grades-exams-management.spec.ts',
        'permissions.spec.ts',
        'reports-analytics.spec.ts',
        'school-settings.spec.ts',
        'staff-management.spec.ts',
        'timetable-management.spec.ts',
      ],
      use: {
        ...devices['Desktop Chrome'],
        storageState: path.resolve(process.cwd(), 'tests/e2e/.auth/principal.json'),
      },
    },
    {
      name: 'studentadmin-tests',
      testMatch: ['admissions.spec.ts', 'students.spec.ts'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: path.resolve(process.cwd(), 'tests/e2e/.auth/studentadmin.json'),
      },
    },
    {
      name: 'portal-tests',
      testMatch: ['notifications.spec.ts', 'student-parent-portal.spec.ts'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: path.resolve(process.cwd(), 'tests/e2e/.auth/student.json'),
      },
    },
    {
      name: 'superadmin-tests',
      testMatch: ['super-admin.spec.ts'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: path.resolve(process.cwd(), 'tests/e2e/.auth/superadmin.json'),
      },
    },
  ],
  webServer: {
    command:
      'cmd /c "set PLAYWRIGHT_PRODUCTION_SERVER=true&& set NEXTAUTH_URL=http://localhost:3001&& set AUTH_URL=http://localhost:3001&& set NEXT_PUBLIC_APP_URL=http://localhost:3001&& npm run build && npm run start -- --port 3001"',
    url: 'http://localhost:3001',
    reuseExistingServer: !process.env.CI,
    timeout: 300000,
  },
})
