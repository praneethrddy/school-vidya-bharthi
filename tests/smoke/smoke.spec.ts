import { execSync } from 'node:child_process'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'

const principalEmail = process.env.E2E_PRINCIPAL_EMAIL || 'principal@vbhs.com'
const studentEmail = process.env.E2E_STUDENT_EMAIL || 'student@vbhs.com'
const password = process.env.E2E_PASSWORD || 'Test@1234'

function walkApiRouteFiles(directory: string, output: string[] = []): string[] {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      walkApiRouteFiles(fullPath, output)
      continue
    }

    if (entry.isFile() && entry.name === 'route.ts') {
      output.push(fullPath)
    }
  }

  return output
}

async function login(page: Page, email: string, passwordValue: string) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(passwordValue)
  await page.getByRole('button', { name: 'Login' }).click()
}

test.describe('SECTION 28 - Smoke Tests', () => {
  test('TEST-SMOKE-001: application starts without runtime errors', async ({ page }) => {
    const pageErrors: string[] = []
    page.on('pageerror', (error) => pageErrors.push(error.message))

    const response = await page.goto('/', { waitUntil: 'domcontentloaded' })
    expect(response).not.toBeNull()
    expect(response?.status()).toBe(200)
    await expect(page.locator('body')).toBeVisible()
    expect(pageErrors).toEqual([])
  })

  test('TEST-SMOKE-002: GET / returns 200 with HTML', async ({ request }) => {
    const response = await request.get('/')
    const html = await response.text()

    expect(response.status()).toBe(200)
    expect(response.headers()['content-type'] || '').toContain('text/html')
    expect(html.trim().toLowerCase()).toContain('<!doctype html>')
  })

  test('TEST-SMOKE-003: GET /login returns 200 with login form', async ({ page, request }) => {
    const response = await request.get('/login')
    expect(response.status()).toBe(200)
    expect(response.headers()['content-type'] || '').toContain('text/html')

    await page.goto('/login')
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByLabel('Password')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Login' })).toBeVisible()
  })

  test('TEST-SMOKE-004: GET /api/auth/providers returns credentials provider', async ({
    request,
  }) => {
    const response = await request.get('/api/auth/providers')
    const body = (await response.json()) as Record<string, { id?: string }>

    expect(response.status()).toBe(200)
    expect(body).toHaveProperty('credentials')
    expect(body.credentials?.id ?? 'credentials').toBe('credentials')
  })

  test('TEST-SMOKE-005: GET /api/public/info returns 200 with JSON', async ({ request }) => {
    const response = await request.get('/api/public/info')
    const body = (await response.json()) as {
      success?: boolean
      data?: { school?: Record<string, unknown> | null }
    }

    expect(response.status()).toBe(200)
    expect(response.headers()['content-type'] || '').toContain('application/json')
    expect(body.success).toBe(true)
    expect(body.data).toBeDefined()
    expect(body.data).toHaveProperty('school')
  })

  test('TEST-SMOKE-006: database connection query succeeds', async () => {
    const result = await prisma.$queryRawUnsafe<Array<{ one?: number }>>('SELECT 1 AS one')

    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
    expect(result[0]?.one).toBe(1)
  })

  test('TEST-SMOKE-007: redis connection ping returns PONG', async () => {
    const redisWithPing = redis as unknown as { ping?: () => Promise<string> | string }

    expect(typeof redisWithPing.ping).toBe('function')
    const pingResult = await redisWithPing.ping!()
    expect(pingResult).toBe('PONG')
  })

  test('TEST-SMOKE-008: required environment variables are present', async () => {
    const required = [
      'DATABASE_URL',
      'R2_ACCESS_KEY_ID',
      'R2_SECRET_ACCESS_KEY',
      'R2_BUCKET_NAME',
      'RESEND_API_KEY',
      'FIELD_ENCRYPTION_KEY',
    ] as const

    for (const variableName of required) {
      const value = process.env[variableName]
      expect(
        Boolean(value && value.trim().length > 0),
        `${variableName} must be set`
      ).toBe(true)
    }

    const hasAuthSecret = Boolean(
      (process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || '').trim().length > 0
    )
    expect(hasAuthSecret, 'AUTH_SECRET or NEXTAUTH_SECRET must be set').toBe(true)

    const hasAuthUrl = Boolean(
      (process.env.AUTH_URL || process.env.NEXTAUTH_URL || '').trim().length > 0
    )
    expect(hasAuthUrl, 'AUTH_URL or NEXTAUTH_URL must be set').toBe(true)

    const hasR2Endpoint = Boolean(
      (process.env.R2_ENDPOINT || process.env.R2_ACCOUNT_ID || '').trim().length > 0
    )
    expect(hasR2Endpoint, 'R2_ENDPOINT or R2_ACCOUNT_ID must be set').toBe(true)

    const hasRedisUrl = Boolean(process.env.REDIS_URL && process.env.REDIS_URL.trim().length > 0)
    const hasRedisHostPort = Boolean(
      process.env.REDIS_HOST &&
        process.env.REDIS_HOST.trim().length > 0 &&
        process.env.REDIS_PORT &&
        process.env.REDIS_PORT.trim().length > 0
    )

    expect(hasRedisUrl || hasRedisHostPort, 'REDIS_URL or REDIS_HOST + REDIS_PORT must be set').toBe(
      true
    )
  })

  test('TEST-SMOKE-009: Prisma schema validates successfully', async () => {
    const output = execSync('npx prisma validate', {
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: 'pipe',
    })

    expect(output.toLowerCase()).toContain('schema')
    expect(output.toLowerCase()).toContain('is valid')
  })

  test('TEST-SMOKE-010: all API route files export valid HTTP method handlers', async () => {
    const apiRoot = path.join(process.cwd(), 'src', 'app', 'api')
    const routeFiles = walkApiRouteFiles(apiRoot)
    const exportPattern =
      /\bexport\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\b|\bexport\s+const\s+(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\b/

    const invalidRoutes = routeFiles.filter((filePath) => {
      const source = readFileSync(filePath, 'utf8')
      return !exportPattern.test(source)
    })

    expect(routeFiles.length).toBeGreaterThan(0)
    expect(invalidRoutes).toEqual([])
  })

  test('TEST-SMOKE-011: admin dashboard responds with 200 for valid admin session', async ({
    page,
  }) => {
    await login(page, principalEmail, password)

    const response = await page.goto('/admin/dashboard', { waitUntil: 'domcontentloaded' })
    expect(response).not.toBeNull()
    expect(response?.status()).toBe(200)
    await expect(page).toHaveURL(/\/admin\/dashboard/)
  })

  test('TEST-SMOKE-012: student dashboard responds with 200 for valid student session', async ({
    page,
  }) => {
    await login(page, studentEmail, password)

    const response = await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
    expect(response).not.toBeNull()
    expect(response?.status()).toBe(200)
    await expect(page).toHaveURL(/\/dashboard/)
  })

  test('TEST-SMOKE-013: GET /api/health returns healthy dependency status', async ({ request }) => {
    const response = await request.get('/api/health')
    const body = (await response.json()) as {
      status?: string
      checks?: Record<string, string>
      timestamp?: string
      version?: string
    }

    expect(response.status()).toBe(200)
    expect(body.status).toBe('healthy')
    expect(body.checks).toEqual({
      database: 'ok',
      redis: 'ok',
    })
    expect(body.timestamp).toBeTruthy()
    expect(body.version).toBeTruthy()
  })
})
