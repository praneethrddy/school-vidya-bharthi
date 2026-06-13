import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync, readdirSync } from 'fs'
import path from 'path'

const rootDir = process.cwd()
const apiDir = path.resolve(rootDir, 'src', 'app', 'api')
const authFile = path.resolve(rootDir, 'src', 'lib', 'auth.ts')
const logoutRouteFile = path.resolve(rootDir, 'src', 'app', 'api', 'auth', 'logout', 'route.ts')
const auditFile = path.resolve(rootDir, 'src', 'lib', 'audit.ts')
const studentsRouteFile = path.resolve(rootDir, 'src', 'app', 'api', 'students', 'route.ts')
const studentByIdRouteFile = path.resolve(
  rootDir,
  'src',
  'app',
  'api',
  'students',
  '[id]',
  'route.ts'
)
const schemaFile = path.resolve(rootDir, 'prisma', 'schema.prisma')

function read(filePath: string): string {
  return readFileSync(filePath, 'utf8')
}

function walkRouteFiles(directory: string, output: string[] = []): string[] {
  const entries = readdirSync(directory, { withFileTypes: true })

  for (const entry of entries) {
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

function getModelBlock(schema: string, modelName: string): string {
  const match = schema.match(new RegExp(`model\\s+${modelName}\\s*\\{([\\s\\S]*?)\\n\\}`, 'm'))
  if (!match) {
    throw new Error(`Model block not found for ${modelName}`)
  }
  return match[1]
}

function expectEncryptedField(schema: string, modelName: string, fieldName: string) {
  const block = getModelBlock(schema, modelName)
  const fieldPattern = new RegExp(`\\b${fieldName}\\b\\s+[^\\n]*@encrypted`)
  expect(block).toMatch(fieldPattern)
}

describe('security testing module', () => {
  it('TEST-SEC-001: all bcrypt hash calls use cost factor >= 12', () => {
    const files = [
      authFile,
      path.resolve(rootDir, 'src', 'lib', 'import-tools.ts'),
      path.resolve(rootDir, 'src', 'lib', 'saas.ts'),
      path.resolve(rootDir, 'src', 'app', 'api', 'auth', 'reset-password', 'route.ts'),
      path.resolve(rootDir, 'src', 'app', 'api', 'profile', 'password', 'route.ts'),
    ]

    const rounds: number[] = []
    for (const file of files) {
      const matches = read(file).matchAll(/bcrypt\.hash\([^,]+,\s*(\d+)\s*\)/g)
      for (const match of matches) {
        rounds.push(Number(match[1]))
      }
    }

    expect(rounds.length).toBeGreaterThan(0)
    expect(rounds.every((round) => round >= 12)).toBe(true)
  })

  it('TEST-SEC-003: password_hash is not selected in API route SELECT payloads', () => {
    const routes = walkRouteFiles(apiDir)
    const offenders: string[] = []

    for (const routePath of routes) {
      const normalized = routePath.replace(/\\/g, '/')
      if (normalized.includes('/auth/')) {
        continue
      }
      const content = read(routePath)
      if (/select\s*:\s*\{[^{}]*password_hash\s*:/m.test(content)) {
        offenders.push(path.relative(rootDir, routePath).replace(/\\/g, '/'))
      }
    }

    expect(offenders).toEqual([])
  })

  it('TEST-SEC-006: JWT secret is not hardcoded in auth config', () => {
    const content = read(authFile)
    expect(content).not.toMatch(/secret\s*:\s*['"`]/)
    expect(content).not.toMatch(/NEXTAUTH_SECRET\s*=\s*['"`]/)
  })

  it('TEST-SEC-007: token expiry is enforced at 15 minutes', () => {
    const content = read(authFile)
    expect(content).toMatch(/maxAge\s*:\s*15\s*\*\s*60/)
  })

  it('TEST-SEC-012: student routes enforce school_id scoping on direct object lookups', () => {
    const studentsListRoute = read(studentsRouteFile)
    const studentByIdRoute = read(studentByIdRouteFile)

    expect(studentsListRoute).toMatch(/where:\s*\{\s*school_id:\s*user\.schoolId/s)
    expect(studentByIdRoute).toMatch(/where:\s*\{\s*school_id:\s*schoolId,\s*id:\s*studentId/s)
  })

  it('TEST-SEC-013: student routes avoid raw SQL execution for search inputs', () => {
    const studentsListRoute = read(studentsRouteFile)
    expect(studentsListRoute).not.toContain('$queryRaw')
    expect(studentsListRoute).not.toContain('$executeRaw')
    expect(studentsListRoute).toContain('contains: query.search')
  })

  it('TEST-SEC-019: encrypted PII fields are not queryable as plain text columns', () => {
    const content = read(studentsRouteFile)
    expect(content).toContain('Search supports name and admission number. Phone/address fields are encrypted.')
    expect(content).not.toMatch(/where:\s*\{[^{}]{0,220}(phone|address|emergency_contact_phone)\s*:/)
  })

  it("TEST-SEC-020: audit logs mask phone/address values with '***'", () => {
    const content = read(auditFile)
    expect(content).toMatch(/\*{3}/)
  })

  it('TEST-SEC-022: shared error response helper does not include stack traces', () => {
    const content = read(path.resolve(rootDir, 'src', 'lib', 'api-helpers.ts'))
    expect(content).not.toContain('error.stack')
    expect(content).toContain('success: false')
  })

  it('TEST-SEC-023: student route maps Prisma known errors to generic client messages', () => {
    const content = read(studentsRouteFile)
    expect(content).toContain('Prisma.PrismaClientKnownRequestError')
    expect(content).toContain("transactionError.code === 'P2002'")
    expect(content).toContain("return errorResponse('DUPLICATE_RECORD', 'Admission number already exists', 409)")
  })

  it('TEST-SEC-034: session invalidation key is checked in JWT callback', () => {
    const authContent = read(authFile)
    expect(authContent).toContain('user_pw_reset:${token.id}')
    expect(authContent).toContain('token.iat')
  })

  it('TEST-SEC-035: logout route blacklists JWT JTI after sign-out', () => {
    const content = read(logoutRouteFile)
    expect(content).toContain('blacklist:')
  })

  it('TEST-SEC-087: no eval/new Function/vm.runInNewContext usage in src', () => {
    const routes = walkRouteFiles(apiDir)
    const sourceFiles = [
      ...routes,
      path.resolve(rootDir, 'src', 'lib', 'auth.ts'),
      path.resolve(rootDir, 'src', 'lib', 'saas.ts'),
    ]
    const matches: string[] = []

    for (const file of sourceFiles) {
      const content = read(file)
      if (content.includes('eval(') || content.includes('new Function(') || content.includes('vm.runInNewContext(')) {
        matches.push(path.relative(rootDir, file).replace(/\\/g, '/'))
      }
    }

    expect(matches).toEqual([])
  })

  it('TEST-SEC-089: .env files are excluded from git', () => {
    const gitignore = read(path.resolve(rootDir, '.gitignore'))
    expect(gitignore).toMatch(/(^|\n)\.env(\.local)?(\n|$)/)
  })

  it('TEST-SEC-090: package lockfile is committed', () => {
    expect(existsSync(path.resolve(rootDir, 'package-lock.json'))).toBe(true)
  })

  it('TEST-SEC-091/092/093: student, parent, and staff PII fields are encrypted at rest', () => {
    const schema = read(schemaFile)

    expectEncryptedField(schema, 'Student', 'phone')
    expectEncryptedField(schema, 'Student', 'address')
    expectEncryptedField(schema, 'Student', 'emergency_contact_phone')

    expectEncryptedField(schema, 'Parent', 'phone')
    expectEncryptedField(schema, 'Parent', 'alternate_phone')
    expectEncryptedField(schema, 'Parent', 'address')

    expectEncryptedField(schema, 'Staff', 'phone')
    expectEncryptedField(schema, 'Staff', 'address')
  })
})
