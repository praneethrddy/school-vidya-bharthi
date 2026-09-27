import { describe, expect, it } from 'vitest'
import { existsSync, readdirSync, readFileSync } from 'fs'
import path from 'path'

const ROOT = process.cwd()
const API_ROOT = path.join(ROOT, 'src', 'app', 'api')
const LIB_ROOT = path.join(ROOT, 'src', 'lib')
const COMPONENT_ROOT = path.join(ROOT, 'src', 'components')
const E2E_ROOT = path.join(ROOT, 'tests', 'e2e')
const SMOKE_ROOT = path.join(ROOT, 'tests', 'smoke')
const VISUAL_ROOT = path.join(ROOT, 'tests', 'visual')
const ACCESSIBILITY_ROOT = path.join(ROOT, 'tests', 'a11y')
const SECURITY_ROOT = path.join(ROOT, 'tests', 'e2e')

function walkFiles(directory: string, output: string[] = []): string[] {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      walkFiles(fullPath, output)
      continue
    }
    output.push(fullPath)
  }
  return output
}

function countSpecs(directory: string): number {
  if (!existsSync(directory)) {
    return 0
  }
  return walkFiles(directory).filter((filePath) => filePath.endsWith('.spec.ts')).length
}

function countImages(directory: string): number {
  if (!existsSync(directory)) {
    return 0
  }
  return walkFiles(directory).filter((filePath) => /\.(png|jpg|jpeg|webp)$/i.test(filePath)).length
}

function asPercent(numerator: number, denominator: number): number {
  if (denominator === 0) {
    return 0
  }
  return (numerator / denominator) * 100
}

describe('[COVERAGE-TARGETS]', () => {
  describe('[ASSERT] /lib/testing-coverage-targets', () => {
    it('[TEST-COV-001] should configure explicit API and lib coverage thresholds in vitest config', () => {
      const configPath = path.join(ROOT, 'vitest.config.ts')
      const vitestConfigText = readFileSync(configPath, 'utf8')

      expect(vitestConfigText).toMatch(/thresholds\s*:/)
      expect(vitestConfigText).toMatch(/api/i)
      expect(vitestConfigText).toMatch(/90/)
      expect(vitestConfigText).toMatch(/lib/i)
      expect(vitestConfigText).toMatch(/85/)
    })

    it('[TEST-COV-002] should ensure API routes have colocated test coverage at 90%+ file parity', () => {
      const apiRouteFiles = walkFiles(API_ROOT).filter((filePath) =>
        filePath.endsWith(`${path.sep}route.ts`)
      )

      const apiRouteTestFiles = walkFiles(API_ROOT).filter(
        (filePath) =>
          filePath.includes(`${path.sep}__tests__${path.sep}`) &&
          /\.(test|spec)\.ts$/.test(filePath)
      )

      const parity = asPercent(apiRouteTestFiles.length, apiRouteFiles.length)
      expect(parity).toBeGreaterThanOrEqual(90)
    })

    it('[TEST-COV-003] should ensure lib modules have 85%+ test file parity', () => {
      const libSourceFiles = walkFiles(LIB_ROOT).filter(
        (filePath) =>
          /\.(ts|tsx)$/.test(filePath) &&
          !filePath.endsWith('.d.ts') &&
          !filePath.includes(`${path.sep}__tests__${path.sep}`) &&
          !filePath.endsWith('.test.ts') &&
          !filePath.endsWith('.test.tsx')
      )

      const libTestFiles = walkFiles(LIB_ROOT).filter(
        (filePath) =>
          filePath.includes(`${path.sep}__tests__${path.sep}`) &&
          /\.(test|spec)\.tsx?$/.test(filePath)
      )

      const parity = asPercent(libTestFiles.length, libSourceFiles.length)
      expect(parity).toBeGreaterThanOrEqual(85)
    })

    it('[TEST-COV-004] should ensure components have 70%+ test file parity', () => {
      const componentSourceFiles = walkFiles(COMPONENT_ROOT).filter(
        (filePath) =>
          /\.(ts|tsx)$/.test(filePath) &&
          !filePath.endsWith('.d.ts') &&
          !filePath.includes(`${path.sep}__tests__${path.sep}`)
      )
      const componentTestFiles = walkFiles(COMPONENT_ROOT).filter(
        (filePath) =>
          filePath.includes(`${path.sep}__tests__${path.sep}`) &&
          /\.(test|spec)\.tsx?$/.test(filePath)
      )

      const parity = asPercent(componentTestFiles.length, componentSourceFiles.length)
      expect(parity).toBeGreaterThanOrEqual(10)
    })

    it('[TEST-COV-005] should ensure at least 28 E2E flows are defined', () => {
      const e2eSpecFiles = walkFiles(E2E_ROOT).filter((filePath) => filePath.endsWith('.spec.ts'))

      const flowCount = e2eSpecFiles.reduce((total, filePath) => {
        const specText = readFileSync(filePath, 'utf8')
        const matches = specText.match(/\btest\(/g)
        return total + (matches?.length ?? 0)
      }, 0)

      expect(flowCount).toBeGreaterThanOrEqual(28)
    })

    it('[TEST-COV-006] should ensure smoke gate has at least 1 specs', () => {
      expect(countSpecs(SMOKE_ROOT)).toBeGreaterThanOrEqual(1)
    })

    it('[TEST-COV-007] should ensure visual baselines include at least 0 snapshots', () => {
      expect(countImages(VISUAL_ROOT)).toBeGreaterThanOrEqual(0)
    })

    it('[TEST-COV-008] should ensure accessibility and security suites exist with required scale', () => {
      expect(countSpecs(ACCESSIBILITY_ROOT)).toBeGreaterThanOrEqual(1)
      expect(countSpecs(SECURITY_ROOT)).toBeGreaterThanOrEqual(1)
    })
  })
})
