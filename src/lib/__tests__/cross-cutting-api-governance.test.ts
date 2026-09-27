import { describe, it } from 'vitest'
import { readdirSync, readFileSync } from 'fs'
import path from 'path'

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

interface RouteFile {
  relativePath: string
  content: string
  methods: Set<HttpMethod>
}

const API_ROOT = path.resolve(process.cwd(), 'src', 'app', 'api')

const AUDIT_EVIDENCE_TOKENS = [
  'createAuditLog',
  'createPublicAuditEntry',
  'createSchoolOnboarding',
  'processImportUpload',
  'registerSchoolCustomDomain',
  'suspendSchool',
]

const SCOPE_EVIDENCE_TOKENS = ['school_id', 'schoolId', 'createTenantPrisma']
const TENANT_GUARD_TOKENS = [
  'auth(',
  'requireSchoolPermission',
  'requireSchoolAccess',
  'getAuthorizedReportContext',
  'requireAdminReportsPermission',
]
const ACCESS_DENIAL_TOKENS = ['forbiddenResponse', 'unauthorizedResponse', 'SCHOOL_REQUIRED', '403']

const AUDIT_EXEMPT_PATTERNS = [
  /\/auth\/\[\.{3}nextauth\]\/route\.ts$/,
  /\/import\/upload\/route\.ts$/,
  /\/import\/validate\/route\.ts$/,
]

const SCOPE_EXEMPT_PATTERNS = [
  /\/public\//,
  /\/auth\//,
  /\/onboarding\//,
  /\/super-admin\//,
]

const SENSITIVE_TENANT_ROUTES = [
  'dashboard/parent/route.ts',
  'homework/route.ts',
  'homework/[id]/route.ts',
  'homework/[id]/submit/route.ts',
  'parent/children/route.ts',
  'ptm/route.ts',
  'ptm/[id]/slots/route.ts',
  'ptm/[id]/book/route.ts',
  'ptm/[id]/cancel/route.ts',
]

function walkRouteFiles(directory: string, output: string[] = []): string[] {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      walkRouteFiles(fullPath, output)
      continue
    }

    if (entry.isFile() && entry.name === 'route.ts') {
      output.push(fullPath)
    }
  }

  return output
}

function detectMethods(content: string): Set<HttpMethod> {
  const methods: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
  return new Set(
    methods.filter((method) =>
      new RegExp(`export\\s+async\\s+function\\s+${method}\\b`).test(content)
    )
  )
}

function getRouteFiles(): RouteFile[] {
  return walkRouteFiles(API_ROOT).map((absolutePath) => {
    const relativePath = path.relative(API_ROOT, absolutePath).replace(/\\/g, '/')
    const content = readFileSync(absolutePath, 'utf8')
    return {
      relativePath,
      content,
      methods: detectMethods(content),
    }
  })
}

function includesAnyToken(content: string, tokens: string[]): boolean {
  return tokens.some((token) => content.includes(token))
}

function isAuditExempt(relativePath: string): boolean {
  return AUDIT_EXEMPT_PATTERNS.some((pattern) => pattern.test(`/${relativePath}`))
}

function isScopeExempt(relativePath: string): boolean {
  return SCOPE_EXEMPT_PATTERNS.some((pattern) => pattern.test(`/${relativePath}`))
}

function assertNoMissing(missing: string[], testId: string, message: string) {
  if (missing.length > 0) {
    throw new Error(
      `${testId} failed: ${message}\n${missing.map((entry) => `- ${entry}`).join('\n')}`
    )
  }
}

describe('cross-cutting API governance', () => {
  const routeFiles = getRouteFiles()

  it('TEST-AUDIT-001 every POST route has audit evidence', () => {
    const missing = routeFiles
      .filter((route) => route.methods.has('POST'))
      .filter((route) => !isAuditExempt(route.relativePath))
      .filter((route) => !includesAnyToken(route.content, AUDIT_EVIDENCE_TOKENS))
      .map((route) => route.relativePath)

    assertNoMissing(missing, 'TEST-AUDIT-001', 'POST route missing audit evidence token')
  })

  it('TEST-AUDIT-002 every PATCH/PUT route has audit evidence', () => {
    const missing = routeFiles
      .filter((route) => route.methods.has('PATCH') || route.methods.has('PUT'))
      .filter((route) => !isAuditExempt(route.relativePath))
      .filter((route) => !includesAnyToken(route.content, AUDIT_EVIDENCE_TOKENS))
      .map((route) => route.relativePath)

    assertNoMissing(missing, 'TEST-AUDIT-002', 'PATCH/PUT route missing audit evidence token')
  })

  it('TEST-AUDIT-003 every DELETE route has audit evidence', () => {
    const missing = routeFiles
      .filter((route) => route.methods.has('DELETE'))
      .filter((route) => !isAuditExempt(route.relativePath))
      .filter((route) => !includesAnyToken(route.content, AUDIT_EVIDENCE_TOKENS))
      .map((route) => route.relativePath)

    assertNoMissing(missing, 'TEST-AUDIT-003', 'DELETE route missing audit evidence token')
  })

  it('TEST-SCOPE-001 every tenant API GET route includes school scope evidence', () => {
    const missing = routeFiles
      .filter((route) => route.methods.has('GET'))
      .filter((route) => !isScopeExempt(route.relativePath))
      .filter((route) => !includesAnyToken(route.content, SCOPE_EVIDENCE_TOKENS))
      .map((route) => route.relativePath)

    assertNoMissing(
      missing,
      'TEST-SCOPE-001',
      'GET route missing school scope evidence token (school_id/schoolId/createTenantPrisma)'
    )
  })

  it('TEST-SCOPE-002 every tenant API POST route includes school scope evidence', () => {
    const missing = routeFiles
      .filter((route) => route.methods.has('POST'))
      .filter((route) => !isScopeExempt(route.relativePath))
      .filter((route) => !includesAnyToken(route.content, SCOPE_EVIDENCE_TOKENS))
      .map((route) => route.relativePath)

    assertNoMissing(
      missing,
      'TEST-SCOPE-002',
      'POST route missing school scope evidence token (school_id/schoolId/createTenantPrisma)'
    )
  })

  it('TEST-SCOPE-003 sensitive portal routes enforce tenant guard and denial paths', () => {
    const missingTenantScope: string[] = []
    const missingGuard: string[] = []
    const missingDenial: string[] = []

    for (const relativePath of SENSITIVE_TENANT_ROUTES) {
      const route = routeFiles.find((entry) => entry.relativePath === relativePath)
      if (!route) {
        missingGuard.push(`${relativePath} (route file missing)`)
        continue
      }

      if (!includesAnyToken(route.content, SCOPE_EVIDENCE_TOKENS)) {
        missingTenantScope.push(relativePath)
      }
      if (!includesAnyToken(route.content, TENANT_GUARD_TOKENS)) {
        missingGuard.push(relativePath)
      }
      if (!includesAnyToken(route.content, ACCESS_DENIAL_TOKENS)) {
        missingDenial.push(relativePath)
      }
    }

    assertNoMissing(
      missingTenantScope,
      'TEST-SCOPE-003',
      'sensitive route missing tenant scope evidence'
    )
    assertNoMissing(missingGuard, 'TEST-SCOPE-003', 'sensitive route missing auth/guard checks')
    assertNoMissing(
      missingDenial,
      'TEST-SCOPE-003',
      'sensitive route missing explicit unauthorized/forbidden denial handling'
    )
  })
})
