/**
 * 缓存管理器
 *
 * 功能：
 * 1. 多层缓存策略（内存 -> Redis）
 * 2. 自动过期和清理
 * 3. 缓存预热
 * 4. 缓存统计
 * 5. 标签化缓存管理
 */

/**
 * 缓存配置
 */
export interface CacheConfig {
  /** 默认过期时间（秒） */
  defaultTTL?: number
  /** 最大内存���存条目数 */
  maxMemoryItems?: number
  /** 是否启用内存缓存 */
  enableMemory?: boolean
  /** 是否启用 Redis */
  enableRedis?: boolean
  /** Redis 连接配置 */
  redis?: {
    host: string
    port: number
    password?: string
    db?: number
  }
}

/**
 * 缓存条目
 */
interface CacheEntry<T> {
  value: T
  expires: number
  tags?: string[]
  size?: number
}

/**
 * 缓存统计
 */
export interface CacheStats {
  hits: number
  misses: number
  sets: number
  deletes: number
  hitRate: number
  memoryUsage: number
  itemCount: number
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: Required<Omit<CacheConfig, 'redis'>> = {
  defaultTTL: 300, // 5 分钟
  maxMemoryItems: 1000,
  enableMemory: true,
  enableRedis: false,
}

/**
 * 缓存管理器类
 */
export class CacheManager {
  private config: CacheConfig
  private memoryCache: Map<string, CacheEntry<any>>
  private stats: CacheStats
  private cleanupTimer?: NodeJS.Timeout

  constructor(config: CacheConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.memoryCache = new Map()
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      hitRate: 0,
      memoryUsage: 0,
      itemCount: 0,
    }

    // 启动定期清理
    this.startCleanup()
  }

  /**
   * 获取缓存值
   */
  async get<T>(key: string): Promise<T | null> {
    // 先从内存缓存获取
    if (this.config.enableMemory) {
      const memoryValue = this.getFromMemory<T>(key)
      if (memoryValue !== null) {
        this.stats.hits++
        this.updateHitRate()
        return memoryValue
      }
    }

    // TODO: 从 Redis 获取
    // if (this.config.enableRedis) {
    //   const redisValue = await this.getFromRedis<T>(key)
    //   if (redisValue !== null) {
    //     // 回填到内存缓存
    //     await this.setInMemory(key, redisValue, this.config.defaultTTL!)
    //     this.stats.hits++
    //     this.updateHitRate()
    //     return redisValue
    //   }
    // }

    this.stats.misses++
    this.updateHitRate()
    return null
  }

  /**
   * 设置缓存值
   */
  async set<T>(
    key: string,
    value: T,
    ttl: number = this.config.defaultTTL!,
    tags: string[] = []
  ): Promise<void> {
    // 设置内存缓存
    if (this.config.enableMemory) {
      this.setInMemory(key, value, ttl, tags)
    }

    // TODO: 设置 Redis
    // if (this.config.enableRedis) {
    //   await this.setInRedis(key, value, ttl, tags)
    // }

    this.stats.sets++
  }

  /**
   * 删除缓存
   */
  async delete(key: string): Promise<boolean> {
    let deleted = false

    // 从内存删除
    if (this.config.enableMemory) {
      deleted = this.memoryCache.delete(key) || deleted
    }

    // TODO: 从 Redis 删除
    // if (this.config.enableRedis) {
    //   deleted = (await this.deleteFromRedis(key)) || deleted
    // }

    if (deleted) {
      this.stats.deletes++
    }

    return deleted
  }

  /**
   * 清除所有缓存
   */
  async clear(): Promise<void> {
    this.memoryCache.clear()

    // TODO: 清除 Redis
    // if (this.config.enableRedis) {
    //   await this.clearRedis()
    // }
  }

  /**
   * 按标签删除缓存
   */
  async deleteByTag(tag: string): Promise<number> {
    let count = 0

    // 从内存缓存中删除
    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.tags?.includes(tag)) {
        this.memoryCache.delete(key)
        count++
      }
    }

    // TODO: 从 Redis 删除

    return count
  }

  /**
   * 检查键是否存在
   */
  async has(key: string): Promise<boolean> {
    if (this.config.enableMemory) {
      const entry = this.memoryCache.get(key)
      if (entry && entry.expires > Date.now()) {
        return true
      }
    }

    // TODO: 检查 Redis
    return false
  }

  /**
   * 获取或设置缓存（缓存穿透保护）
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = this.config.defaultTTL!,
    tags: string[] = []
  ): Promise<T> {
    // 尝试获取缓存
    const cached = await this.get<T>(key)
    if (cached !== null) {
      return cached
    }

    // 缓存不存在，获取数据
    const value = await fetcher()

    // 设置缓存
    await this.set(key, value, ttl, tags)

    return value
  }

  /**
   * 批量获取
   */
  async mget<T>(keys: string[]): Promise<Map<string, T | null>> {
    const result = new Map<string, T | null>()

    for (const key of keys) {
      const value = await this.get<T>(key)
      result.set(key, value)
    }

    return result
  }

  /**
   * 批量设置
   */
  async mset(entries: Map<string, any>, ttl?: number): Promise<void> {
    for (const [key, value] of entries.entries()) {
      await this.set(key, value, ttl)
    }
  }

  /**
   * 缓存预热
   */
  async warmup<T>(
    keys: string[],
    fetcher: (key: string) => Promise<T>,
    ttl?: number
  ): Promise<void> {
    const promises = keys.map(async (key) => {
      const value = await fetcher(key)
      await this.set(key, value, ttl)
    })

    await Promise.all(promises)
  }

  /**
   * 获取统计信息
   */
  getStats(): CacheStats {
    this.stats.itemCount = this.memoryCache.size
    this.stats.memoryUsage = this.calculateMemoryUsage()
    return { ...this.stats }
  }

  /**
   * 重置统计
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      hitRate: 0,
      memoryUsage: 0,
      itemCount: 0,
    }
  }

  /**
   * 从内存获取
   */
  private getFromMemory<T>(key: string): T | null {
    const entry = this.memoryCache.get(key)

    if (!entry) {
      return null
    }

    // 检查是否过期
    if (entry.expires < Date.now()) {
      this.memoryCache.delete(key)
      return null
    }

    return entry.value as T
  }

  /**
   * 设置到内存
   */
  private setInMemory<T>(
    key: string,
    value: T,
    ttl: number,
    tags: string[] = []
  ): void {
    // 如果达到最大条目数，删除最旧的
    if (this.memoryCache.size >= this.config.maxMemoryItems!) {
      const firstKey = this.memoryCache.keys().next().value
      if (firstKey) {
        this.memoryCache.delete(firstKey)
      }
    }

    const entry: CacheEntry<T> = {
      value,
      expires: Date.now() + ttl * 1000,
      tags,
      size: this.estimateSize(value),
    }

    this.memoryCache.set(key, entry)
  }

  /**
   * 启动定期清理
   */
  private startCleanup(): void {
    // 每分钟清理一次过期缓存
    this.cleanupTimer = setInterval(() => {
      this.cleanup()
    }, 60 * 1000)

    // 确保在进程退出时清理
    if (typeof process !== 'undefined') {
      process.on('exit', () => {
        if (this.cleanupTimer) {
          clearInterval(this.cleanupTimer)
        }
      })
    }
  }

  /**
   * 清理过期缓存
   */
  private cleanup(): void {
    const now = Date.now()
    let cleanedCount = 0

    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.expires < now) {
        this.memoryCache.delete(key)
        cleanedCount++
      }
    }

    if (cleanedCount > 0) {
      console.log(`[Cache] Cleaned ${cleanedCount} expired entries`)
    }
  }

  /**
   * 更新命中率
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0
  }

  /**
   * 估算对象大小（字节）
   */
  private estimateSize(obj: any): number {
    try {
      return JSON.stringify(obj).length * 2 // 粗略估计（UTF-16）
    }
    catch {
      return 0
    }
  }

  /**
   * 计算内存使用量
   */
  private calculateMemoryUsage(): number {
    let total = 0
    for (const entry of this.memoryCache.values()) {
      total += entry.size || 0
    }
    return total
  }
}

/**
 * 创建缓存管理器实例
 */
export function createCacheManager(config?: CacheConfig): CacheManager {
  return new CacheManager(config)
}

/**
 * 全局缓存实例
 */
let globalCache: CacheManager | null = null

/**
 * 获取全局缓存实例
 */
export function getGlobalCache(): CacheManager {
  if (!globalCache) {
    globalCache = createCacheManager()
  }
  return globalCache
}

/**
 * 缓存装饰器
 */
export function Cached(
  keyPrefix: string,
  ttl?: number,
  tags?: string[]
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args: any[]) {
      const cache = getGlobalCache()
      const key = `${keyPrefix}:${JSON.stringify(args)}`

      return await cache.getOrSet(
        key,
        () => originalMethod.apply(this, args),
        ttl,
        tags
      )
    }

    return descriptor
  }
}
