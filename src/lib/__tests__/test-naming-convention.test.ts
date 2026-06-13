import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'

const ROOT = process.cwd()

const VITEST_TARGETS = [
  path.join(ROOT, 'src', 'lib', '__tests__', 'mock-fixture-requirements.test.ts'),
  path.join(ROOT, 'src', 'lib', '__tests__', 'coverage-targets.test.ts'),
  path.join(ROOT, 'src', 'lib', '__tests__', 'test-naming-convention.test.ts'),
]

const PLAYWRIGHT_TARGETS = [path.join(ROOT, 'tests', 'e2e', 'auth-pages.spec.ts')]

function readLines(filePath: string): string[] {
  return readFileSync(filePath, 'utf8').split(/\r?\n/)
}

describe('[TEST-NAMING-CONVENTION]', () => {
  describe('[ASSERT] /lib/test-naming-convention', () => {
    it('[TEST-NAME-001] should enforce Vitest module and test title format in governance suites', () => {
      const moduleDescribePattern = /^\s*describe\('\[[A-Z0-9-]+\]'/
      const testTitlePattern = /^\s*it\('\[TEST-[A-Z0-9-]+\]\s+should\s+/i

      for (const filePath of VITEST_TARGETS) {
        const lines = readLines(filePath)
        const describeLines = lines.filter((line) => /^\s*describe\(/.test(line))
        const itLines = lines.filter((line) => /^\s*it\(/.test(line))

        expect(describeLines.length).toBeGreaterThan(0)
        expect(itLines.length).toBeGreaterThan(0)

        expect(describeLines[0]).toMatch(moduleDescribePattern)
        for (const line of itLines) {
          expect(line).toMatch(testTitlePattern)
        }
      }
    })

    it('[TEST-NAME-002] should enforce Playwright flow and step title format in auth pages suite', () => {
      const flowDescribePattern = /^\s*test\.describe\('\[E2E-[A-Z0-9-]+\]\s+.+',\s*\(\)\s*=>\s*\{/
      const stepTitlePattern = /^\s*test\('should\s+/i

      for (const filePath of PLAYWRIGHT_TARGETS) {
        const lines = readLines(filePath)
        const describeLines = lines.filter((line) => /^\s*test\.describe\(/.test(line))
        const testLines = lines.filter(
          (line) => line.includes("test('") && !line.includes('test.skip(')
        )

        expect(describeLines.length).toBeGreaterThan(0)
        expect(testLines.length).toBeGreaterThan(0)

        expect(describeLines[0]).toMatch(flowDescribePattern)
        for (const line of testLines) {
          expect(line).toMatch(stepTitlePattern)
        }
      }
    })
  })
})
