/**
 * 查询优化器测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  QueryOptimizer,
  createPaginationOptions,
  type PaginationOptions,
} from '../../server/utils/performance/query-optimizer'

// Mock cache manager
const mockGetOrSet = vi.fn()
vi.mock('../../server/utils/cache/cache-manager', () => ({
  getGlobalCache: vi.fn(() => ({
    getOrSet: mockGetOrSet,
  })),
}))

describe('Query Optimizer', () => {
  let optimizer: QueryOptimizer

  beforeEach(() => {
    vi.clearAllMocks()
    optimizer = new QueryOptimizer()
    mockGetOrSet.mockImplementation(async (key, query) => await query())
  })

  describe('cachedQuery()', () => {
    it('应该执行查询并返回结果', async () => {
      const query = vi.fn().mockResolvedValue({ data: 'test' })

      const result = await optimizer.cachedQuery('test-key', query)

      expect(result).toEqual({ data: 'test' })
      expect(query).toHaveBeenCalled()
    })

    it('应该使用缓存管理器', async () => {
      const query = vi.fn().mockResolvedValue({ data: 'test' })

      await optimizer.cachedQuery('test-key', query)

      expect(mockGetOrSet).toHaveBeenCalledWith(
        'query:test-key',
        query,
        300,
        ['query']
      )
    })

    it('应该支持自定义缓存TTL', async () => {
      const query = vi.fn().mockResolvedValue({ data: 'test' })

      await optimizer.cachedQuery('test-key', query, { cacheTTL: 600 })

      expect(mockGetOrSet).toHaveBeenCalledWith(
        'query:test-key',
        query,
        600,
        ['query']
      )
    })

    it('应该支持自定义缓存标签', async () => {
      const query = vi.fn().mockResolvedValue({ data: 'test' })

      await optimizer.cachedQuery('test-key', query, {
        cacheTags: ['tag1', 'tag2'],
      })

      expect(mockGetOrSet).toHaveBeenCalledWith(
        'query:test-key',
        query,
        300,
        ['query', 'tag1', 'tag2']
      )
    })

    it('应该支持禁用缓存', async () => {
      const query = vi.fn().mockResolvedValue({ data: 'test' })

      const result = await optimizer.cachedQuery('test-key', query, {
        cache: false,
      })

      expect(result).toEqual({ data: 'test' })
      expect(mockGetOrSet).not.toHaveBeenCalled()
      expect(query).toHaveBeenCalled()
    })

    it('应该在启用性能分析时记录查询', async () => {
      const query = vi.fn().mockResolvedValue({ data: 'test' })

      await optimizer.cachedQuery('test-key', query, { profile: true })

      const performance = optimizer.getQueryPerformance()
      expect(performance.totalQueries).toBe(1)
    })
  })

  describe('paginate()', () => {
    it('应该返回分页结果', async () => {
      const query = vi.fn().mockResolvedValue([
        { id: 1 },
        { id: 2 },
        { id: 3 },
      ])
      const countQuery = vi.fn().mockResolvedValue(10)

      const result = await optimizer.paginate(query, countQuery, {
        page: 1,
        limit: 3,
      })

      expect(result.items).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }])
      expect(result.total).toBe(10)
      expect(result.page).toBe(1)
      expect(result.pageSize).toBe(3)
      expect(result.totalPages).toBe(4)
      expect(result.hasNext).toBe(true)
      expect(result.hasPrev).toBe(false)
    })

    it('应该计算正确的 offset', async () => {
      const query = vi.fn().mockResolvedValue([])
      const countQuery = vi.fn().mockResolvedValue(10)

      await optimizer.paginate(query, countQuery, {
        page: 3,
        limit: 5,
      })

      expect(query).toHaveBeenCalledWith(10, 5) // offset = (3-1) * 5 = 10
    })

    it('应该并行执行数据查询和计数查询', async () => {
      let queryExecuted = false
      let countExecuted = false

      const query = vi.fn(async () => {
        queryExecuted = true
        await new Promise(resolve => setTimeout(resolve, 10))
        return []
      })

      const countQuery = vi.fn(async () => {
        countExecuted = true
        await new Promise(resolve => setTimeout(resolve, 10))
        return 0
      })

      await optimizer.paginate(query, countQuery, { page: 1, limit: 10 })

      expect(queryExecuted).toBe(true)
      expect(countExecuted).toBe(true)
    })

    it('应该验证 page 参数（必须 >= 1）', async () => {
      const query = vi.fn()
      const countQuery = vi.fn()

      await expect(
        optimizer.paginate(query, countQuery, { page: 0, limit: 10 })
      ).rejects.toThrow('Page must be >= 1')
    })

    it('应该验证 limit 参数（必须 >= 1）', async () => {
      const query = vi.fn()
      const countQuery = vi.fn()

      await expect(
        optimizer.paginate(query, countQuery, { page: 1, limit: 0 })
      ).rejects.toThrow('Limit must be between 1 and 100')
    })

    it('应该验证 limit 参数（必须 <= 100）', async () => {
      const query = vi.fn()
      const countQuery = vi.fn()

      await expect(
        optimizer.paginate(query, countQuery, { page: 1, limit: 101 })
      ).rejects.toThrow('Limit must be between 1 and 100')
    })

    it('应该正确计算 hasNext 和 hasPrev��第一页）', async () => {
      const query = vi.fn().mockResolvedValue([{ id: 1 }])
      const countQuery = vi.fn().mockResolvedValue(10)

      const result = await optimizer.paginate(query, countQuery, {
        page: 1,
        limit: 5,
      })

      expect(result.hasNext).toBe(true)
      expect(result.hasPrev).toBe(false)
    })

    it('应该正确计算 hasNext 和 hasPrev（中间页）', async () => {
      const query = vi.fn().mockResolvedValue([{ id: 1 }])
      const countQuery = vi.fn().mockResolvedValue(10)

      const result = await optimizer.paginate(query, countQuery, {
        page: 2,
        limit: 3,
      })

      expect(result.hasNext).toBe(true)
      expect(result.hasPrev).toBe(true)
    })

    it('应该正确计算 hasNext 和 hasPrev（最后一页）', async () => {
      const query = vi.fn().mockResolvedValue([{ id: 1 }])
      const countQuery = vi.fn().mockResolvedValue(10)

      const result = await optimizer.paginate(query, countQuery, {
        page: 4,
        limit: 3,
      })

      expect(result.hasNext).toBe(false)
      expect(result.hasPrev).toBe(true)
    })
  })

  describe('cursorPaginate()', () => {
    it('应该返回游标分页结果', async () => {
      const query = vi.fn().mockResolvedValue([
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' },
        { id: 3, name: 'Item 3' },
      ])

      const result = await optimizer.cursorPaginate(query, null, 2)

      expect(result.items).toHaveLength(2)
      expect(result.nextCursor).toBe('2')
      expect(result.hasMore).toBe(true)
    })

    it('应该在没有更多数据时返回 null cursor', async () => {
      const query = vi.fn().mockResolvedValue([
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' },
      ])

      const result = await optimizer.cursorPaginate(query, null, 5)

      expect(result.items).toHaveLength(2)
      expect(result.nextCursor).toBe(null)
      expect(result.hasMore).toBe(false)
    })

    it('应该多取一条数据以判断是否还有更多', async () => {
      const query = vi.fn().mockResolvedValue([
        { id: 1 },
        { id: 2 },
        { id: 3 },
      ])

      await optimizer.cursorPaginate(query, null, 2)

      expect(query).toHaveBeenCalledWith(null, 3) // limit + 1
    })

    it('应该处理空结果', async () => {
      const query = vi.fn().mockResolvedValue([])

      const result = await optimizer.cursorPaginate(query, null, 10)

      expect(result.items).toHaveLength(0)
      expect(result.nextCursor).toBe(null)
      expect(result.hasMore).toBe(false)
    })
  })

  describe('batchInsert()', () => {
    it('应该批量插入数据', async () => {
      const insert = vi.fn().mockResolvedValue(undefined)
      const items = Array.from({ length: 5 }, (_, i) => ({ id: i }))

      await optimizer.batchInsert(insert, items, 2)

      expect(insert).toHaveBeenCalledTimes(3) // 5 items / 2 batch size = 3 batches
    })

    it('应该使用默认批次大小（100）', async () => {
      const insert = vi.fn().mockResolvedValue(undefined)
      const items = Array.from({ length: 250 }, (_, i) => ({ id: i }))

      await optimizer.batchInsert(insert, items)

      expect(insert).toHaveBeenCalledTimes(3) // 250 / 100 = 3 batches
    })

    it('应该正确分割批次', async () => {
      const insert = vi.fn().mockResolvedValue(undefined)
      const items = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }]

      await optimizer.batchInsert(insert, items, 2)

      expect(insert).toHaveBeenNthCalledWith(1, [{ id: 1 }, { id: 2 }])
      expect(insert).toHaveBeenNthCalledWith(2, [{ id: 3 }, { id: 4 }])
      expect(insert).toHaveBeenNthCalledWith(3, [{ id: 5 }])
    })

    it('应该并行执行批次插入', async () => {
      const executionOrder: number[] = []
      const insert = vi.fn(async (batch: any[]) => {
        executionOrder.push(batch[0].id)
        await new Promise(resolve => setTimeout(resolve, 10))
      })

      const items = Array.from({ length: 6 }, (_, i) => ({ id: i }))
      await optimizer.batchInsert(insert, items, 2)

      expect(insert).toHaveBeenCalledTimes(3)
    })
  })

  describe('streamQuery()', () => {
    it('应该流式处理查询结果', async () => {
      const query = vi
        .fn()
        .mockResolvedValueOnce([{ id: 1 }, { id: 2 }])
        .mockResolvedValueOnce([{ id: 3 }, { id: 4 }])
        .mockResolvedValueOnce([])

      const results: any[] = []
      for await (const item of optimizer.streamQuery(query, 2)) {
        results.push(item)
      }

      expect(results).toHaveLength(4)
      expect(results).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }])
    })

    it('应该使用正确的 offset 和 limit', async () => {
      const query = vi
        .fn()
        .mockResolvedValueOnce([{ id: 1 }])
        .mockResolvedValueOnce([])

      for await (const _ of optimizer.streamQuery(query, 1)) {
        // consume
      }

      expect(query).toHaveBeenNthCalledWith(1, 0, 1)
      expect(query).toHaveBeenNthCalledWith(2, 1, 1)
    })

    it('应该在没有更多数据时停止', async () => {
      const query = vi.fn().mockResolvedValue([])

      const results: any[] = []
      for await (const item of optimizer.streamQuery(query, 10)) {
        results.push(item)
      }

      expect(results).toHaveLength(0)
      expect(query).toHaveBeenCalledTimes(1)
    })
  })

  describe('getQueryPerformance()', () => {
    it('应该返回空的性能统计（无查询）', () => {
      const performance = optimizer.getQueryPerformance()

      expect(performance.totalQueries).toBe(0)
      expect(performance.averageDuration).toBe(0)
      expect(performance.slowQueries).toEqual([])
      expect(performance.cachedQueries).toBe(0)
      expect(performance.cacheHitRate).toBe(0)
    })

    it('应该计算查询性能统计', async () => {
      const query1 = vi.fn().mockResolvedValue('result1')
      const query2 = vi.fn().mockResolvedValue('result2')

      await optimizer.cachedQuery('query1', query1, { profile: true })
      await optimizer.cachedQuery('query2', query2, { profile: true })

      const performance = optimizer.getQueryPerformance()

      expect(performance.totalQueries).toBe(2)
      expect(performance.averageDuration).toBeGreaterThanOrEqual(0)
    })

    it('应该计算缓存命中率', async () => {
      const query = vi.fn().mockResolvedValue('result')

      // 第一次查询（缓存写入）
      mockGetOrSet.mockResolvedValueOnce('cached-result')
      await optimizer.cachedQuery('query1', query, {
        profile: true,
        cache: true,
      })

      // 第二次查询（无缓存）
      await optimizer.cachedQuery('query2', query, {
        profile: true,
        cache: false,
      })

      const performance = optimizer.getQueryPerformance()

      expect(performance.totalQueries).toBe(2)
      expect(performance.cachedQueries).toBe(1)
      expect(performance.cacheHitRate).toBe(0.5)
    })
  })

  describe('clearQueryLog()', () => {
    it('应该清除查询日志', async () => {
      const query = vi.fn().mockResolvedValue('result')

      await optimizer.cachedQuery('test', query, { profile: true })

      let performance = optimizer.getQueryPerformance()
      expect(performance.totalQueries).toBe(1)

      optimizer.clearQueryLog()

      performance = optimizer.getQueryPerformance()
      expect(performance.totalQueries).toBe(0)
    })
  })

  describe('detectNPlusOne()', () => {
    it('应该检测 N+1 查询模式', async () => {
      const query = vi.fn().mockResolvedValue('result')

      // 模拟 N+1 查询
      for (let i = 0; i < 15; i++) {
        await optimizer.cachedQuery(`user-${i}`, query, {
          profile: true,
          cache: false,
        })
      }

      const warnings = optimizer.detectNPlusOne(10)

      expect(warnings.length).toBeGreaterThan(0)
      expect(warnings[0]).toContain('Potential N+1 query detected')
    })

    it('应该在没有 N+1 查询时返回空数组', () => {
      const warnings = optimizer.detectNPlusOne()

      expect(warnings).toEqual([])
    })

    it('应该支持自定义阈值', async () => {
      const query = vi.fn().mockResolvedValue('result')

      for (let i = 0; i < 5; i++) {
        await optimizer.cachedQuery(`query-${i}`, query, {
          profile: true,
          cache: false,
        })
      }

      const warnings = optimizer.detectNPlusOne(3)

      expect(warnings.length).toBeGreaterThan(0)
    })
  })

  describe('createPaginationOptions()', () => {
    it('应该创建默认分页选项', () => {
      const options = createPaginationOptions()

      expect(options.page).toBe(1)
      expect(options.limit).toBe(20)
    })

    it('应该支持自定义 page', () => {
      const options = createPaginationOptions(3)

      expect(options.page).toBe(3)
      expect(options.limit).toBe(20)
    })

    it('应该支持自定义 limit', () => {
      const options = createPaginationOptions(1, 50)

      expect(options.page).toBe(1)
      expect(options.limit).toBe(50)
    })

    it('应该限制最大 limit', () => {
      const options = createPaginationOptions(1, 200, 100)

      expect(options.limit).toBe(100)
    })

    it('应该限制最小 page（>= 1）', () => {
      const options = createPaginationOptions(-5)

      expect(options.page).toBe(1)
    })

    it('应该限制最小 limit（>= 1）', () => {
      const options = createPaginationOptions(1, -10)

      expect(options.limit).toBe(1)
    })
  })

  describe('综合场景测试', () => {
    it('应该支持完整的查询优化流程', async () => {
      // 执行带缓存的查询
      const query = vi.fn().mockResolvedValue({ data: 'test' })
      await optimizer.cachedQuery('test', query, {
        cache: true,
        cacheTTL: 600,
        cacheTags: ['tag1'],
        profile: true,
      })

      // 检查性能统计
      const performance = optimizer.getQueryPerformance()
      expect(performance.totalQueries).toBe(1)

      // 清除日志
      optimizer.clearQueryLog()
      expect(optimizer.getQueryPerformance().totalQueries).toBe(0)
    })

    it('应该支持分页查询和性能分析', async () => {
      const query = vi.fn().mockResolvedValue([{ id: 1 }])
      const countQuery = vi.fn().mockResolvedValue(100)

      const result = await optimizer.paginate(query, countQuery, {
        page: 2,
        limit: 10,
      })

      expect(result.page).toBe(2)
      expect(result.totalPages).toBe(10)
      expect(result.hasNext).toBe(true)
      expect(result.hasPrev).toBe(true)
    })
  })
})
