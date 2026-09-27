import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'fs'
import path from 'path'

const schemaPath = path.resolve(process.cwd(), 'prisma', 'schema.prisma')
const schema = readFileSync(schemaPath, 'utf8')

function getModelBlock(modelName: string): string {
  const match = schema.match(new RegExp(`model\\s+${modelName}\\s*\\{([\\s\\S]*?)\\n\\}`, 'm'))
  if (!match) {
    throw new Error(`Model block not found for ${modelName}`)
  }
  return match[1]
}

function expectEncryptedField(modelName: string, fieldName: string) {
  const block = getModelBlock(modelName)
  const fieldPattern = new RegExp(`\\b${fieldName}\\b\\s+[^\\n]*@encrypted`)
  expect(block).toMatch(fieldPattern)
}

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

describe('field encryption', () => {
  it('TEST-ENC-001 students.phone is marked encrypted in schema', () => {
    expectEncryptedField('Student', 'phone')
  })

  it('TEST-ENC-002 students.address is marked encrypted in schema', () => {
    expectEncryptedField('Student', 'address')
  })

  it('TEST-ENC-003 students.emergency_contact_phone is marked encrypted in schema', () => {
    expectEncryptedField('Student', 'emergency_contact_phone')
  })

  it('TEST-ENC-004 parents phone fields and address are marked encrypted in schema', () => {
    expectEncryptedField('Parent', 'phone')
    expectEncryptedField('Parent', 'alternate_phone')
    expectEncryptedField('Parent', 'address')
  })

  it('TEST-ENC-005 staff phone and address are marked encrypted in schema', () => {
    expectEncryptedField('Staff', 'phone')
    expectEncryptedField('Staff', 'address')
  })

  it('TEST-ENC-006 student/parent/staff route filters do not WHERE/ORDER by encrypted fields', () => {
    const routeFiles = walkRouteFiles(path.resolve(process.cwd(), 'src', 'app', 'api')).filter(
      (filePath) => /(students|staff|parent)/i.test(filePath.replace(/\\/g, '/'))
    )

    const forbiddenPattern =
      /(where|orderBy)\s*:\s*\{[^{}]{0,160}\b(phone|address|emergency_contact_phone|alternate_phone)\b/gi

    const offenders: string[] = []
    for (const filePath of routeFiles) {
      const content = readFileSync(filePath, 'utf8')
      if (forbiddenPattern.test(content)) {
        offenders.push(path.relative(process.cwd(), filePath).replace(/\\/g, '/'))
      }
    }

    if (offenders.length > 0) {
      throw new Error(
        `Encrypted field used in WHERE/ORDER clause:\n${offenders.map((f) => `- ${f}`).join('\n')}`
      )
    }
  })
})
