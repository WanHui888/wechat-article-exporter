/**
 * 数据库查询优化器
 *
 * 功能：
 * 1. 查询结果缓存
 * 2. 批量查询合并
 * 3. 查询性能分析
 * 4. N+1 查询检测
 * 5. 分页优化
 */

import { getGlobalCache } from '../cache/cache-manager'

/**
 * 查询选项
 */
export interface QueryOptions {
  /** 是否启用缓存 */
  cache?: boolean
  /** 缓存时间（秒） */
  cacheTTL?: number
  /** 缓存标签 */
  cacheTags?: string[]
  /** 是否记录性能 */
  profile?: boolean
}

/**
 * 分页选项
 */
export interface PaginationOptions {
  page: number
  limit: number
  orderBy?: string
  orderDirection?: 'ASC' | 'DESC'
}

/**
 * 分页结果
 */
export interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

/**
 * 查询性能统计
 */
export interface QueryPerformance {
  query: string
  duration: number
  timestamp: number
  cached: boolean
}

/**
 * 查询优化器类
 */
export class QueryOptimizer {
  private queryLog: QueryPerformance[] = []
  private batchQueue: Map<string, any[]> = new Map()
  private batchTimeout: NodeJS.Timeout | null = null

  /**
   * 执行带缓存的查询
   */
  async cachedQuery<T>(
    key: string,
    query: () => Promise<T>,
    options: QueryOptions = {}
  ): Promise<T> {
    const { cache = true, cacheTTL = 300, cacheTags = [], profile = false } = options

    const startTime = Date.now()

    if (cache) {
      const cacheManager = getGlobalCache()
      const result = await cacheManager.getOrSet(
        `query:${key}`,
        query,
        cacheTTL,
        ['query', ...cacheTags]
      )

      if (profile) {
        this.logQuery(key, Date.now() - startTime, true)
      }

      return result
    }

    const result = await query()

    if (profile) {
      this.logQuery(key, Date.now() - startTime, false)
    }

    return result
  }

  /**
   * 批量查询优化（DataLoader 模式）
   */
  async batchLoad<K, V>(
    key: string,
    id: K,
    loader: (ids: K[]) => Promise<V[]>
  ): Promise<V | null> {
    return new Promise((resolve, reject) => {
      // 添加到批处理队列
      if (!this.batchQueue.has(key)) {
        this.batchQueue.set(key, [])
      }

      const queue = this.batchQueue.get(key)!
      queue.push({ id, resolve, reject })

      // 设置批处理超时
      if (!this.batchTimeout) {
        this.batchTimeout = setTimeout(() => {
          this.processBatch(key, loader)
        }, 10) // 10ms 批处理窗口
      }
    })
  }

  /**
   * 处理批量查询
   */
  private async processBatch<K, V>(
    key: string,
    loader: (ids: K[]) => Promise<V[]>
  ): Promise<void> {
    const queue = this.batchQueue.get(key)
    if (!queue || queue.length === 0) return

    // 清空队列
    this.batchQueue.delete(key)
    this.batchTimeout = null

    // 提取所有 ID
    const ids = queue.map((item: any) => item.id)

    try {
      // 执行批量查询
      const results = await loader(ids)

      // 分发结果
      queue.forEach((item: any, index: number) => {
        item.resolve(results[index] || null)
      })
    }
    catch (error) {
      // 分发错误
      queue.forEach((item: any) => {
        item.reject(error)
      })
    }
  }

  /**
   * 优化分页查询
   */
  async paginate<T>(
    query: (offset: number, limit: number) => Promise<T[]>,
    countQuery: () => Promise<number>,
    options: PaginationOptions
  ): Promise<PaginatedResult<T>> {
    const { page, limit } = options

    // 验证分页参数
    if (page < 1) {
      throw new Error('Page must be >= 1')
    }
    if (limit < 1 || limit > 100) {
      throw new Error('Limit must be between 1 and 100')
    }

    const offset = (page - 1) * limit

    // 并行执行数据查询和计数查询
    const [items, total] = await Promise.all([
      query(offset, limit),
      countQuery(),
    ])

    const totalPages = Math.ceil(total / limit)

    return {
      items,
      total,
      page,
      pageSize: limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    }
  }

  /**
   * 游标分页（性能更好，适合大数据集）
   */
  async cursorPaginate<T extends { id: number | string }>(
    query: (cursor: string | null, limit: number) => Promise<T[]>,
    cursor: string | null,
    limit: number
  ): Promise<{
    items: T[]
    nextCursor: string | null
    hasMore: boolean
  }> {
    // 多取一条以判断是否还有更多
    const items = await query(cursor, limit + 1)
    const hasMore = items.length > limit

    // 移除多取的那一条
    if (hasMore) {
      items.pop()
    }

    // 生成下一个游标
    const nextCursor = hasMore && items.length > 0
      ? String(items[items.length - 1].id)
      : null

    return {
      items,
      nextCursor,
      hasMore,
    }
  }

  /**
   * 批量插入优化
   */
  async batchInsert<T>(
    insert: (items: T[]) => Promise<void>,
    items: T[],
    batchSize: number = 100
  ): Promise<void> {
    const batches: T[][] = []

    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize))
    }

    // 并行执行批次插入
    await Promise.all(batches.map(batch => insert(batch)))
  }

  /**
   * 查询结果流式处理（避免内存溢出）
   */
  async *streamQuery<T>(
    query: (offset: number, limit: number) => Promise<T[]>,
    batchSize: number = 100
  ): AsyncGenerator<T, void, unknown> {
    let offset = 0
    let hasMore = true

    while (hasMore) {
      const items = await query(offset, batchSize)

      if (items.length === 0) {
        hasMore = false
        break
      }

      for (const item of items) {
        yield item
      }

      offset += batchSize
      hasMore = items.length === batchSize
    }
  }

  /**
   * 查询性能分析
   */
  getQueryPerformance(): {
    totalQueries: number
    averageDuration: number
    slowQueries: QueryPerformance[]
    cachedQueries: number
    cacheHitRate: number
  } {
    if (this.queryLog.length === 0) {
      return {
        totalQueries: 0,
        averageDuration: 0,
        slowQueries: [],
        cachedQueries: 0,
        cacheHitRate: 0,
      }
    }

    const totalQueries = this.queryLog.length
    const totalDuration = this.queryLog.reduce((sum, q) => sum + q.duration, 0)
    const averageDuration = totalDuration / totalQueries

    // 慢查询（超过 1 秒）
    const slowQueries = this.queryLog
      .filter(q => q.duration > 1000)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10)

    const cachedQueries = this.queryLog.filter(q => q.cached).length
    const cacheHitRate = cachedQueries / totalQueries

    return {
      totalQueries,
      averageDuration,
      slowQueries,
      cachedQueries,
      cacheHitRate,
    }
  }

  /**
   * 清除查询日志
   */
  clearQueryLog(): void {
    this.queryLog = []
  }

  /**
   * 记录查询
   */
  private logQuery(query: string, duration: number, cached: boolean): void {
    this.queryLog.push({
      query,
      duration,
      timestamp: Date.now(),
      cached,
    })

    // 保留最近 1000 条记录
    if (this.queryLog.length > 1000) {
      this.queryLog = this.queryLog.slice(-1000)
    }
  }

  /**
   * N+1 查询检测
   */
  detectNPlusOne(threshold: number = 10): string[] {
    const warnings: string[] = []
    const recentQueries = this.queryLog.slice(-100)

    // 检测短时间内的重复查询模式
    const queryPatterns = new Map<string, number>()

    for (const log of recentQueries) {
      const pattern = log.query.replace(/\d+/g, 'N') // 将数字替换为 N
      queryPatterns.set(pattern, (queryPatterns.get(pattern) || 0) + 1)
    }

    for (const [pattern, count] of queryPatterns.entries()) {
      if (count > threshold) {
        warnings.push(
          `Potential N+1 query detected: ${pattern} (${count} times)`
        )
      }
    }

    return warnings
  }
}

/**
 * 创建查询优化器
 */
export function createQueryOptimizer(): QueryOptimizer {
  return new QueryOptimizer()
}

/**
 * 全局查询优化器
 */
let globalOptimizer: QueryOptimizer | null = null

/**
 * 获取全局查询优化器
 */
export function getGlobalOptimizer(): QueryOptimizer {
  if (!globalOptimizer) {
    globalOptimizer = createQueryOptimizer()
  }
  return globalOptimizer
}

/**
 * 分页助手函数
 */
export function createPaginationOptions(
  page: number = 1,
  limit: number = 20,
  maxLimit: number = 100
): PaginationOptions {
  return {
    page: Math.max(1, page),
    limit: Math.min(Math.max(1, limit), maxLimit),
  }
}

/**
 * 查询缓存装饰器
 */
export function CachedQuery(ttl: number = 300, tags: string[] = []) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args: any[]) {
      const optimizer = getGlobalOptimizer()
      const key = `${propertyKey}:${JSON.stringify(args)}`

      return await optimizer.cachedQuery(
        key,
        () => originalMethod.apply(this, args),
        { cache: true, cacheTTL: ttl, cacheTags: tags, profile: true }
      )
    }

    return descriptor
  }
}
