import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LogService } from '~/server/services/log.service'

/**
 * LogService 单元测试
 *
 * 测试覆盖：
 * 1. log - 创建操作日志
 * 2. getLogs - 获取用户的操作日志（分页、过滤）
 * 3. getAllLogs - 获取所有日志（管理员功能，支持分页和过滤）
 * 4. cleanOldLogs - 清理过期日志
 */

// ==================== Mock 设置 ====================

// Use vi.hoisted to declare mocks before vi.mock calls
const { mockDb } = vi.hoisted(() => {
  return {
    mockDb: {
      select: vi.fn(),
      insert: vi.fn(),
      delete: vi.fn(),
    },
  }
})

// Mock modules
vi.mock('~/server/database', () => ({
  getDb: () => mockDb,
  schema: {
    operationLogs: {
      id: 'id',
      userId: 'userId',
      action: 'action',
      targetType: 'targetType',
      targetId: 'targetId',
      detail: 'detail',
      status: 'status',
      createdAt: 'createdAt',
    },
  },
}))

// ==================== 测试套件 ====================

describe('LogService', () => {
  let service: LogService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new LogService()
  })

  // ==================== log() 测试 ====================

  describe('log', () => {
    it('should create log with action only', async () => {
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      })

      await service.log(1, 'user_login')

      expect(mockDb.insert).toHaveBeenCalled()
    })

    it('should create log with all fields', async () => {
      const valuesSpy = vi.fn().mockResolvedValue(undefined)
      mockDb.insert.mockReturnValue({
        values: valuesSpy,
      })

      await service.log(1, 'article_download', {
        targetType: 'article',
        targetId: '123',
        detail: { url: 'https://example.com' },
        status: 'success',
      })

      expect(valuesSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 1,
          action: 'article_download',
          targetType: 'article',
          targetId: '123',
          detail: { url: 'https://example.com' },
          status: 'success',
        })
      )
    })

    it('should default status to success', async () => {
      const valuesSpy = vi.fn().mockResolvedValue(undefined)
      mockDb.insert.mockReturnValue({
        values: valuesSpy,
      })

      await service.log(1, 'test_action', {
        targetType: 'test',
      })

      expect(valuesSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
        })
      )
    })

    it('should handle failed status', async () => {
      const valuesSpy = vi.fn().mockResolvedValue(undefined)
      mockDb.insert.mockReturnValue({
        values: valuesSpy,
      })

      await service.log(1, 'failed_action', {
        status: 'failed',
      })

      expect(valuesSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'failed',
        })
      )
    })

    it('should handle pending status', async () => {
      const valuesSpy = vi.fn().mockResolvedValue(undefined)
      mockDb.insert.mockReturnValue({
        values: valuesSpy,
      })

      await service.log(1, 'pending_action', {
        status: 'pending',
      })

      expect(valuesSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'pending',
        })
      )
    })

    it('should handle complex detail object', async () => {
      const valuesSpy = vi.fn().mockResolvedValue(undefined)
      mockDb.insert.mockReturnValue({
        values: valuesSpy,
      })

      const complexDetail = {
        count: 100,
        items: ['item1', 'item2'],
        metadata: { key: 'value' },
      }

      await service.log(1, 'batch_operation', {
        detail: complexDetail,
      })

      expect(valuesSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: complexDetail,
        })
      )
    })

    it('should handle different userId values', async () => {
      const valuesSpy = vi.fn().mockResolvedValue(undefined)
      mockDb.insert.mockReturnValue({
        values: valuesSpy,
      })

      await service.log(999, 'test_action')

      expect(valuesSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 999,
        })
      )
    })
  })

  // ==================== getLogs() 测试 ====================

  describe('getLogs', () => {
    it('should return logs with default pagination', async () => {
      const mockLogs = [
        {
          id: 1,
          userId: 1,
          action: 'user_login',
          status: 'success',
          createdAt: new Date(),
        },
        {
          id: 2,
          userId: 1,
          action: 'article_download',
          status: 'success',
          createdAt: new Date(),
        },
      ]

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockResolvedValue(mockLogs),
      })

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ count: 2 }]),
      })

      const result = await service.getLogs(1)

      expect(result.items).toEqual(mockLogs)
      expect(result.total).toBe(2)
      expect(result.page).toBe(1)
      expect(result.pageSize).toBe(50)
      expect(result.hasMore).toBe(false)
    })

    it('should support custom pagination', async () => {
      const mockLogs = Array.from({ length: 20 }, (_, i) => ({
        id: i + 1,
        userId: 1,
        action: 'test_action',
        status: 'success',
      }))

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockResolvedValue(mockLogs),
      })

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ count: 100 }]),
      })

      const result = await service.getLogs(1, {
        page: 2,
        pageSize: 20,
      })

      expect(result.page).toBe(2)
      expect(result.pageSize).toBe(20)
      expect(result.total).toBe(100)
      expect(result.hasMore).toBe(true)
    })

    it('should filter by action', async () => {
      const mockLogs = [
        {
          id: 1,
          userId: 1,
          action: 'user_login',
          status: 'success',
        },
      ]

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockResolvedValue(mockLogs),
      })

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ count: 1 }]),
      })

      const result = await service.getLogs(1, {
        action: 'user_login',
      })

      expect(result.items).toEqual(mockLogs)
      expect(result.total).toBe(1)
    })

    it('should return empty result when no logs', async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockResolvedValue([]),
      })

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ count: 0 }]),
      })

      const result = await service.getLogs(1)

      expect(result.items).toEqual([])
      expect(result.total).toBe(0)
      expect(result.hasMore).toBe(false)
    })

    it('should calculate hasMore correctly', async () => {
      const mockLogs = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        userId: 1,
        action: 'test',
      }))

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockResolvedValue(mockLogs),
      })

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ count: 25 }]),
      })

      const result = await service.getLogs(1, {
        page: 1,
        pageSize: 10,
      })

      expect(result.hasMore).toBe(true)
    })

    it('should handle last page correctly', async () => {
      const mockLogs = Array.from({ length: 5 }, (_, i) => ({
        id: i + 21,
        userId: 1,
        action: 'test',
      }))

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockResolvedValue(mockLogs),
      })

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ count: 25 }]),
      })

      const result = await service.getLogs(1, {
        page: 3,
        pageSize: 10,
      })

      expect(result.hasMore).toBe(false)
    })

    it('should filter by userId', async () => {
      const whereSpy = vi.fn().mockReturnThis()
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: whereSpy,
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockResolvedValue([]),
      })

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ count: 0 }]),
      })

      await service.getLogs(456)

      expect(whereSpy).toHaveBeenCalled()
    })
  })

  // ==================== getAllLogs() 测试 ====================

  describe('getAllLogs', () => {
    it('should return all logs without filters', async () => {
      const mockLogs = [
        {
          id: 1,
          userId: 1,
          action: 'user_login',
          status: 'success',
        },
        {
          id: 2,
          userId: 2,
          action: 'article_download',
          status: 'success',
        },
      ]

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockResolvedValue(mockLogs),
      })

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ count: 2 }]),
      })

      const result = await service.getAllLogs()

      expect(result.items).toEqual(mockLogs)
      expect(result.total).toBe(2)
    })

    it('should filter by action', async () => {
      const mockLogs = [
        {
          id: 1,
          userId: 1,
          action: 'user_login',
        },
      ]

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockResolvedValue(mockLogs),
      })

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ count: 1 }]),
      })

      const result = await service.getAllLogs({
        action: 'user_login',
      })

      expect(result.items).toEqual(mockLogs)
    })

    it('should filter by userId', async () => {
      const mockLogs = [
        {
          id: 1,
          userId: 123,
          action: 'test',
        },
      ]

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockResolvedValue(mockLogs),
      })

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ count: 1 }]),
      })

      const result = await service.getAllLogs({
        userId: 123,
      })

      expect(result.items).toEqual(mockLogs)
    })

    it('should filter by both action and userId', async () => {
      const mockLogs = [
        {
          id: 1,
          userId: 123,
          action: 'user_login',
        },
      ]

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockResolvedValue(mockLogs),
      })

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ count: 1 }]),
      })

      const result = await service.getAllLogs({
        action: 'user_login',
        userId: 123,
      })

      expect(result.items).toEqual(mockLogs)
    })

    it('should support pagination', async () => {
      const mockLogs = Array.from({ length: 20 }, (_, i) => ({
        id: i + 1,
        userId: 1,
        action: 'test',
      }))

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockResolvedValue(mockLogs),
      })

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ count: 100 }]),
      })

      const result = await service.getAllLogs({
        page: 2,
        pageSize: 20,
      })

      expect(result.page).toBe(2)
      expect(result.pageSize).toBe(20)
      expect(result.total).toBe(100)
      expect(result.hasMore).toBe(true)
    })

    it('should return empty result when no logs match filters', async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockResolvedValue([]),
      })

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ count: 0 }]),
      })

      const result = await service.getAllLogs({
        action: 'nonexistent_action',
      })

      expect(result.items).toEqual([])
      expect(result.total).toBe(0)
    })

    it('should handle undefined where condition', async () => {
      const whereSpy = vi.fn().mockReturnThis()
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: whereSpy,
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockResolvedValue([]),
      })

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ count: 0 }]),
      })

      await service.getAllLogs()

      expect(whereSpy).toHaveBeenCalledWith(undefined)
    })
  })

  // ==================== cleanOldLogs() 测试 ====================

  describe('cleanOldLogs', () => {
    it('should clean logs older than default 90 days', async () => {
      const whereSpy = vi.fn().mockResolvedValue(undefined)
      mockDb.delete.mockReturnValue({
        where: whereSpy,
      })

      await service.cleanOldLogs()

      expect(mockDb.delete).toHaveBeenCalled()
      expect(whereSpy).toHaveBeenCalled()
    })

    it('should clean logs older than specified days', async () => {
      const whereSpy = vi.fn().mockResolvedValue(undefined)
      mockDb.delete.mockReturnValue({
        where: whereSpy,
      })

      await service.cleanOldLogs(30)

      expect(mockDb.delete).toHaveBeenCalled()
      expect(whereSpy).toHaveBeenCalled()
    })

    it('should clean logs older than 7 days', async () => {
      const whereSpy = vi.fn().mockResolvedValue(undefined)
      mockDb.delete.mockReturnValue({
        where: whereSpy,
      })

      await service.cleanOldLogs(7)

      expect(mockDb.delete).toHaveBeenCalled()
    })

    it('should clean logs older than 365 days', async () => {
      const whereSpy = vi.fn().mockResolvedValue(undefined)
      mockDb.delete.mockReturnValue({
        where: whereSpy,
      })

      await service.cleanOldLogs(365)

      expect(mockDb.delete).toHaveBeenCalled()
    })

    it('should not throw when no logs to clean', async () => {
      mockDb.delete.mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      })

      await expect(service.cleanOldLogs(90)).resolves.toBeUndefined()
    })

    it('should handle zero days parameter', async () => {
      const whereSpy = vi.fn().mockResolvedValue(undefined)
      mockDb.delete.mockReturnValue({
        where: whereSpy,
      })

      await service.cleanOldLogs(0)

      expect(mockDb.delete).toHaveBeenCalled()
    })
  })

  // ==================== 集成场景测试 ====================

  describe('Integration Scenarios', () => {
    it('should create and retrieve log', async () => {
      // Create log
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      })
      await service.log(1, 'test_action', {
        targetType: 'test',
        targetId: '123',
        status: 'success',
      })

      // Retrieve logs
      const mockLogs = [
        {
          id: 1,
          userId: 1,
          action: 'test_action',
          targetType: 'test',
          targetId: '123',
          status: 'success',
          createdAt: new Date(),
        },
      ]

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockResolvedValue(mockLogs),
      })

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ count: 1 }]),
      })

      const result = await service.getLogs(1)

      expect(result.items[0].action).toBe('test_action')
      expect(result.items[0].status).toBe('success')
    })

    it('should create multiple logs and paginate', async () => {
      // Create multiple logs
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      })

      await service.log(1, 'action1')
      await service.log(1, 'action2')
      await service.log(1, 'action3')

      // Get first page
      const mockPage1 = [
        { id: 1, userId: 1, action: 'action1' },
        { id: 2, userId: 1, action: 'action2' },
      ]

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockResolvedValue(mockPage1),
      })

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ count: 3 }]),
      })

      const result = await service.getLogs(1, { page: 1, pageSize: 2 })

      expect(result.items).toHaveLength(2)
      expect(result.hasMore).toBe(true)
    })

    it('should filter logs by action across all users', async () => {
      const mockLogs = [
        { id: 1, userId: 1, action: 'user_login' },
        { id: 2, userId: 2, action: 'user_login' },
      ]

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockResolvedValue(mockLogs),
      })

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ count: 2 }]),
      })

      const result = await service.getAllLogs({ action: 'user_login' })

      expect(result.items).toHaveLength(2)
      expect(result.items[0].action).toBe('user_login')
    })

    it('should log and clean old logs', async () => {
      // Create log
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      })
      await service.log(1, 'old_action')

      // Clean old logs
      mockDb.delete.mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      })

      await service.cleanOldLogs(30)

      expect(mockDb.delete).toHaveBeenCalled()
    })
  })
})
