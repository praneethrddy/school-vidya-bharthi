import IORedis from 'ioredis'

interface RedisConfig {
  url?: string
  keyPrefix: string
}

export interface RedisClient {
  connect(): Promise<void>
  get(key: string): Promise<string | null>
  set(key: string, value: string, ttlSeconds?: number): Promise<void>
  del(key: string): Promise<void>
  keys(pattern: string): Promise<string[]>
  exists(key: string): Promise<boolean>
  ping(): Promise<string>
  disconnect(): Promise<void>
}

class MemoryRedis implements RedisClient {
  private store: Map<string, { value: string; expiry?: number }> = new Map()

  async connect(): Promise<void> {}

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key)
    if (!entry) {
      return null
    }

    if (entry.expiry && Date.now() > entry.expiry) {
      this.store.delete(key)
      return null
    }

    return entry.value
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    const expiry = ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined
    this.store.set(key, { value, expiry })
  }

  async del(key: string): Promise<void> {
    this.store.delete(key)
  }

  async keys(pattern: string): Promise<string[]> {
    if (!pattern.includes('*')) {
      return this.store.has(pattern) ? [pattern] : []
    }

    const prefix = pattern.split('*')[0]
    return Array.from(this.store.keys()).filter((key) => key.startsWith(prefix))
  }

  async exists(key: string): Promise<boolean> {
    const value = await this.get(key)
    return value !== null
  }

  async ping(): Promise<string> {
    return 'PONG'
  }

  async disconnect(): Promise<void> {
    this.store.clear()
  }
}

class IORedisAdapter implements RedisClient {
  private client: IORedis
  private connectPromise: Promise<void> | null = null

  constructor(private readonly config: RedisConfig) {
    this.client = new IORedis(config.url as string, {
      keyPrefix: config.keyPrefix,
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      connectTimeout: 5000,
      tls: config.url?.startsWith('rediss://') ? {} : undefined,
    })
  }

  async connect(): Promise<void> {
    if (this.client.status === 'ready') {
      return
    }

    if (!this.connectPromise) {
      this.connectPromise = this.client.connect().then(
        () => undefined,
        (error) => {
          this.connectPromise = null
          throw error
        }
      )
    }

    await this.connectPromise
    this.connectPromise = null
  }

  async get(key: string): Promise<string | null> {
    await this.connect()
    return this.client.get(key)
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    await this.connect()
    if (typeof ttlSeconds === 'number') {
      await this.client.set(key, value, 'EX', ttlSeconds)
      return
    }

    await this.client.set(key, value)
  }

  async del(key: string): Promise<void> {
    await this.connect()
    await this.client.del(key)
  }

  async keys(pattern: string): Promise<string[]> {
    await this.connect()
    return this.client.keys(pattern)
  }

  async exists(key: string): Promise<boolean> {
    await this.connect()
    return (await this.client.exists(key)) > 0
  }

  async ping(): Promise<string> {
    await this.connect()
    return this.client.ping()
  }

  async disconnect(): Promise<void> {
    if (this.client.status === 'end') {
      return
    }

    try {
      await this.client.quit()
    } catch {
      this.client.disconnect()
    }
  }
}

const config: RedisConfig = {
  url: process.env.REDIS_URL,
  keyPrefix: 'vbhs:',
}

function shouldUseMemoryRedis(currentConfig: RedisConfig): boolean {
  if (process.env.NODE_ENV === 'test') {
    return true
  }

  if (!currentConfig.url) {
    return true
  }

  // Keep local development usable even when .env values still point to placeholder localhost Redis.
  if (
    process.env.NODE_ENV !== 'production' &&
    /^redis:\/\/:password@localhost:6379\/?$/i.test(currentConfig.url)
  ) {
    return true
  }

  return false
}

function createRedisClient(currentConfig: RedisConfig): RedisClient {
  if (shouldUseMemoryRedis(currentConfig)) {
    return new MemoryRedis()
  }

  return new IORedisAdapter(currentConfig)
}

const globalForRedis = globalThis as typeof globalThis & {
  __vbhsRedis?: RedisClient
}

export const redis = globalForRedis.__vbhsRedis || createRedisClient(config)

if (process.env.NODE_ENV !== 'production') {
  globalForRedis.__vbhsRedis = redis
}

export async function getRedisClient(): Promise<RedisClient> {
  await redis.connect()
  return redis
}

export default redis
