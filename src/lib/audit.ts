import { prisma } from './prisma'
import { logger } from './logger'

export interface AuditLogParams {
  school_id: string | null
  user_id: string
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'IMPORT'
  entity_type: string
  entity_id?: string
  old_value?: Record<string, any>
  new_value?: Record<string, any>
  ip_address?: string
  user_agent?: string
}

const MASKED_VALUE = '***'
const SENSITIVE_FIELD_PATTERN = /(phone|address)/i

function maskAuditValue(value: unknown, parentKey?: string): unknown {
  if (value == null) {
    return value
  }

  if (parentKey && SENSITIVE_FIELD_PATTERN.test(parentKey)) {
    return MASKED_VALUE
  }

  if (Array.isArray(value)) {
    return value.map((entry) => maskAuditValue(entry))
  }

  if (typeof value !== 'object') {
    return value
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
      key,
      maskAuditValue(entry, key),
    ])
  )
}

export async function createAuditLog(params: AuditLogParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        school_id: params.school_id,
        user_id: params.user_id,
        action: params.action,
        entity_type: params.entity_type,
        entity_id: params.entity_id || '',
        old_value: maskAuditValue(params.old_value) as any,
        new_value: maskAuditValue(params.new_value) as any,
        ip_address: params.ip_address,
        user_agent: params.user_agent,
      },
    })
  } catch (error) {
    logger.error({ error }, 'Failed to create audit log')
  }
}
