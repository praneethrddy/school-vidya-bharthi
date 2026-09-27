import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  pinoFactory: vi.fn(() => ({
    info: vi.fn(),
    error: vi.fn(),
  })),
}))

vi.mock('pino', () => ({
  default: mocks.pinoFactory,
}))

describe('logger instantiation', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    delete process.env.LOG_LEVEL
    delete process.env.NODE_ENV
  })

  it('uses info level and no transport by default', async () => {
    const mod = await import('../logger')

    expect(mod.logger).toBeDefined()
    expect(mocks.pinoFactory).toHaveBeenCalledWith({
      level: 'info',
      transport: undefined,
    })
  })

  it('uses LOG_LEVEL and pretty transport in development mode', async () => {
    process.env.LOG_LEVEL = 'debug'
    process.env.NODE_ENV = 'development'

    await import('../logger')

    expect(mocks.pinoFactory).toHaveBeenCalledWith({
      level: 'debug',
      transport: { target: 'pino-pretty' },
    })
  })
})
