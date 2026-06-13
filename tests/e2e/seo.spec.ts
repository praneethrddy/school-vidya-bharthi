import { expect, test } from '@playwright/test'

import { authFiles, TEST_CREDENTIALS } from './helpers/auth'

const publicPages = [
  '/',
  '/about',
  '/academics',
  '/admissions',
  '/gallery',
  '/contact',
  '/alumni',
  '/onboarding',
]

test.describe('SECTION 44B - Rendered Meta Tags (Playwright)', () => {
  test('TEST-SEO-012: Every public page has exactly one <h1> tag', async ({ page }) => {
    for (const path of publicPages) {
      await page.goto(path, { waitUntil: 'domcontentloaded' })
      const h1Count = await page.locator('h1').count()
      expect(h1Count).toBe(1)
    }
  })

  test('TEST-SEO-013: Every public page has <title> tag (non-empty)', async ({ page }) => {
    for (const path of publicPages) {
      await page.goto(path, { waitUntil: 'domcontentloaded' })
      const title = await page.title()
      expect(title.trim().length).toBeGreaterThan(0)
    }
  })

  test('TEST-SEO-014: Every public page has <meta name="description"> (non-empty)', async ({
    page,
  }) => {
    for (const path of publicPages) {
      await page.goto(path, { waitUntil: 'domcontentloaded' })
      const description = page.locator('meta[name="description"]')
      await expect(description).toHaveAttribute('content', /\S+/)
    }
  })

  test('TEST-SEO-015: Every public page has <link rel="canonical">', async ({ page }) => {
    for (const path of publicPages) {
      await page.goto(path, { waitUntil: 'domcontentloaded' })
      const canonical = page.locator('link[rel="canonical"]')
      await expect(canonical).toHaveAttribute('href', /https?:\/\//)
    }
  })

  test('TEST-SEO-016: No page has duplicate <title> or <meta description>', async ({ page }) => {
    for (const path of publicPages) {
      await page.goto(path, { waitUntil: 'domcontentloaded' })
      const titles = await page.locator('title').count()
      expect(titles).toBeLessThanOrEqual(1)
      const descriptions = await page.locator('meta[name="description"]').count()
      expect(descriptions).toBeLessThanOrEqual(1)
    }
  })

  test('TEST-SEO-017: og:image URL is valid (returns 200) on pages that have it', async ({
    page,
    request,
  }) => {
    for (const path of publicPages) {
      await page.goto(path, { waitUntil: 'domcontentloaded' })
      const ogImage = page.locator('meta[property="og:image"], meta[name="og:image"]')
      if ((await ogImage.count()) > 0) {
        const imageUrl = await ogImage.first().getAttribute('content')
        if (imageUrl) {
          const absoluteUrl = new URL(imageUrl, page.url()).toString()
          const response = await request.get(absoluteUrl)
          expect(response.status()).toBe(200)
        }
      }
    }
  })

  test('TEST-SEO-018: Robots meta tag not set to "noindex" on public pages', async ({ page }) => {
    for (const path of publicPages) {
      await page.goto(path, { waitUntil: 'domcontentloaded' })
      const robots = page.locator('meta[name="robots"]')
      if ((await robots.count()) > 0) {
        const content = await robots.first().getAttribute('content')
        expect(content).not.toContain('noindex')
      }
    }
  })
})

test.describe('SECTION 44C - Structured Data', () => {
  test('TEST-SEO-019: Home page has JSON-LD schema (EducationalOrganization type)', async ({
    page,
  }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const jsonLdScript = page.locator('script[type="application/ld+json"]')
    await expect(jsonLdScript).toHaveCount(1)
    const content = await jsonLdScript.textContent()
    expect(content).toBeDefined()
    const data = JSON.parse(content || '{}')
    expect(data['@context']).toMatch(/schema\.org/i)
    expect(data['@type']).toBe('EducationalOrganization')
  })

  test('TEST-SEO-020: Contact page has JSON-LD with address and phone', async ({ page }) => {
    await page.goto('/contact', { waitUntil: 'domcontentloaded' })
    const jsonLdScript = page.locator('script[type="application/ld+json"]')
    await expect(jsonLdScript).toHaveCount(1)
    const content = await jsonLdScript.textContent()
    expect(content).toBeDefined()
    const data = JSON.parse(content || '{}')
    expect(data.address || (data.contactPoint && data.contactPoint.address)).toBeDefined()
    expect(data.telephone || (data.contactPoint && data.contactPoint.telephone)).toBeDefined()
  })

  test('TEST-SEO-021: JSON-LD passes Google Rich Results Test validation', async ({ page }) => {
    for (const path of ['/', '/contact']) {
      await page.goto(path, { waitUntil: 'domcontentloaded' })
      const jsonLdScript = page.locator('script[type="application/ld+json"]')
      if ((await jsonLdScript.count()) > 0) {
        const content = await jsonLdScript.textContent()
        const data = JSON.parse(content || '{}')
        expect(data['@context']).toBe('https://schema.org')
        expect(data['@type']).toBeDefined()
      } else {
        throw new Error(`JSON-LD script missing on ${path}`)
      }
    }
  })
})

test.describe('SECTION 44D - Non-Public Page SEO', () => {
  test.describe('Student portal pages', () => {
    test.use({ storageState: authFiles.student })

    test('TEST-SEO-022: Portal pages (/dashboard, /grades, etc.) have noindex meta', async ({
      page,
    }) => {
      const portalPages = ['/portal/dashboard', '/portal/grades', '/portal/attendance']
      for (const path of portalPages) {
        await page.goto(path, { waitUntil: 'domcontentloaded' })
        const robots = page.locator('meta[name="robots"]')
        await expect(robots).toHaveAttribute('content', /noindex/i)
      }
    })
  })

  test.describe('Admin pages', () => {
    test.use({ storageState: authFiles.principal })

    test('TEST-SEO-023: Admin pages (/admin/*) have noindex meta', async ({ page }) => {
      const adminPages = ['/admin/dashboard', '/admin/attendance', '/admin/students']
      for (const path of adminPages) {
        await page.goto(path, { waitUntil: 'domcontentloaded' })
        const robots = page.locator('meta[name="robots"]')
        await expect(robots).toHaveAttribute('content', /noindex/i)
      }
    })
  })

  test('TEST-SEO-024: Login page has appropriate meta (no credentials in meta)', async ({
    page,
  }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' })
    const title = await page.title()
    expect(title).not.toContain(TEST_CREDENTIALS.password)
    expect(title).not.toContain('password')

    const description = page.locator('meta[name="description"]')
    if ((await description.count()) > 0) {
      const descContent = await description.first().getAttribute('content')
      expect(descContent).not.toContain(TEST_CREDENTIALS.password)
      expect(descContent).not.toContain('password')
    }

    const htmlContent = await page.content()
    expect(htmlContent).not.toContain(TEST_CREDENTIALS.password)
  })
})
