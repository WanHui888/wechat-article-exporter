import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { SchedulerService } from '~/server/services/scheduler.service'

/**
 * SchedulerService 单元测试
 *
 * 测试覆盖：
 * 1. start/stop - 启动和停止定时器
 * 2. executeTask - 执行任务
 * 3. triggerTask - 手动触发任务
 * 4. runCleanup - 清理任务
 * 5. runSync - 同步任务
 * 6. runDownload - 下载任务
 */

// ==================== Mock 设置 ====================

// Use vi.hoisted to declare mocks before vi.mock calls
const { mockDb, mockLogService, mockExportService, mockFileService } = vi.hoisted(() => {
  return {
    mockDb: {
      select: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    mockLogService: {
      log: vi.fn(),
      cleanOldLogs: vi.fn(),
    },
    mockExportService: {
      cleanExpiredJobs: vi.fn(),
    },
    mockFileService: {
      recalculateStorage: vi.fn(),
    },
  }
})

// Mock modules
vi.mock('~/server/database', () => ({
  getDb: () => mockDb,
  schema: {
    scheduledTasks: {
      id: 'id',
      userId: 'userId',
      type: 'type',
      targetFakeid: 'targetFakeid',
      intervalHours: 'intervalHours',
      config: 'config',
      enabled: 'enabled',
      status: 'status',
      nextRunAt: 'nextRunAt',
      lastRunAt: 'lastRunAt',
      lastError: 'lastError',
    },
    wechatSessions: {
      userId: 'userId',
      token: 'token',
      cookies: 'cookies',
    },
  },
}))

vi.mock('~/server/services/log.service', () => ({
  getLogService: () => mockLogService,
}))

vi.mock('~/server/services/export.service', () => ({
  getExportService: () => mockExportService,
}))

// ==================== 测试套件 ====================

describe('SchedulerService', () => {
  let service: SchedulerService
  let originalSetInterval: typeof setInterval
  let originalClearInterval: typeof clearInterval

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    service = new SchedulerService()
    originalSetInterval = global.setInterval
    originalClearInterval = global.clearInterval
  })

  afterEach(() => {
    vi.useRealTimers()
    service.stop()
  })

  // ==================== start() 和 stop() 测试 ====================

  describe('start and stop', () => {
    it('should start the scheduler', () => {
      const consoleSpy = vi.spyOn(console, 'log')

      service.start()

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Scheduler] Starting task scheduler')
      )
    })

    it('should not start multiple times', () => {
      const consoleSpy = vi.spyOn(console, 'log')

      service.start()
      const firstCallCount = consoleSpy.mock.calls.length

      service.start()
      const secondCallCount = consoleSpy.mock.calls.length

      expect(secondCallCount).toBe(firstCallCount)
    })

    it('should stop the scheduler', () => {
      const consoleSpy = vi.spyOn(console, 'log')

      service.start()
      service.stop()

      expect(consoleSpy).toHaveBeenCalledWith('[Scheduler] Stopped')
    })

    it('should not throw when stopping already stopped scheduler', () => {
      expect(() => service.stop()).not.toThrow()
    })

    it('should handle multiple stop calls', () => {
      service.start()
      service.stop()

      expect(() => service.stop()).not.toThrow()
    })
  })

  // ==================== executeTask() 测试 ====================

  describe('executeTask', () => {
    beforeEach(() => {
      // Mock import for file.service
      vi.doMock('~/server/services/file.service', () => ({
        getFileService: () => mockFileService,
      }))
    })

    it('should mark task as running before execution', async () => {
      const updateSpy = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      })
      mockDb.update = updateSpy

      mockExportService.cleanExpiredJobs.mockResolvedValue(undefined)
      mockLogService.cleanOldLogs.mockResolvedValue(undefined)
      mockFileService.recalculateStorage.mockResolvedValue(undefined)
      mockLogService.log.mockResolvedValue(undefined)

      await service.executeTask(1, 1, 'cleanup', null, 24, {})

      expect(updateSpy).toHaveBeenCalled()
    })

    it('should execute cleanup task successfully', async () => {
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      })

      mockExportService.cleanExpiredJobs.mockResolvedValue(undefined)
      mockLogService.cleanOldLogs.mockResolvedValue(undefined)
      mockFileService.recalculateStorage.mockResolvedValue(undefined)
      mockLogService.log.mockResolvedValue(undefined)

      await service.executeTask(1, 1, 'cleanup', null, 24, { logRetentionDays: 90 })

      expect(mockExportService.cleanExpiredJobs).toHaveBeenCalled()
      expect(mockLogService.cleanOldLogs).toHaveBeenCalledWith(90)
    })

    it('should handle task execution error', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      })

      mockExportService.cleanExpiredJobs.mockRejectedValue(new Error('Test error'))
      mockLogService.log.mockResolvedValue(undefined)

      await service.executeTask(1, 1, 'cleanup', null, 24, {})

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Scheduler] Task #1 failed:'),
        expect.any(String)
      )
    })

    it('should log success after task completion', async () => {
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      })

      mockExportService.cleanExpiredJobs.mockResolvedValue(undefined)
      mockLogService.cleanOldLogs.mockResolvedValue(undefined)
      mockFileService.recalculateStorage.mockResolvedValue(undefined)
      mockLogService.log.mockResolvedValue(undefined)

      await service.executeTask(1, 1, 'cleanup', null, 24, {})

      expect(mockLogService.log).toHaveBeenCalledWith(
        1,
        'task_run',
        expect.objectContaining({
          status: 'success',
        })
      )
    })

    it('should log failure on task error', async () => {
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      })

      mockExportService.cleanExpiredJobs.mockRejectedValue(new Error('Test error'))
      mockLogService.log.mockResolvedValue(undefined)

      vi.spyOn(console, 'error').mockImplementation(() => {})

      await service.executeTask(1, 1, 'cleanup', null, 24, {})

      expect(mockLogService.log).toHaveBeenCalledWith(
        1,
        'task_run',
        expect.objectContaining({
          status: 'failed',
        })
      )
    })

    it('should update nextRunAt after successful execution', async () => {
      const setSpy = vi.fn().mockReturnThis()
      mockDb.update.mockReturnValue({
        set: setSpy,
        where: vi.fn().mockResolvedValue(undefined),
      })

      mockExportService.cleanExpiredJobs.mockResolvedValue(undefined)
      mockLogService.cleanOldLogs.mockResolvedValue(undefined)
      mockFileService.recalculateStorage.mockResolvedValue(undefined)
      mockLogService.log.mockResolvedValue(undefined)

      await service.executeTask(1, 1, 'cleanup', null, 24, {})

      expect(setSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'idle',
          nextRunAt: expect.any(Date),
        })
      )
    })

    it('should handle unknown task type', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      })

      mockLogService.log.mockResolvedValue(undefined)

      await service.executeTask(1, 1, 'unknown_type', null, 24, {})

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Scheduler] Task #1 failed:'),
        expect.any(String)
      )
    })

    it('should calculate correct nextRunAt based on intervalHours', async () => {
      const setSpy = vi.fn().mockReturnThis()
      mockDb.update.mockReturnValue({
        set: setSpy,
        where: vi.fn().mockResolvedValue(undefined),
      })

      mockExportService.cleanExpiredJobs.mockResolvedValue(undefined)
      mockLogService.cleanOldLogs.mockResolvedValue(undefined)
      mockFileService.recalculateStorage.mockResolvedValue(undefined)
      mockLogService.log.mockResolvedValue(undefined)

      const beforeTime = Date.now()
      await service.executeTask(1, 1, 'cleanup', null, 48, {})
      const afterTime = Date.now()

      const nextRunAtCall = setSpy.mock.calls.find(call =>
        call[0].status === 'idle' && call[0].nextRunAt
      )

      expect(nextRunAtCall).toBeDefined()
      const nextRunAt = nextRunAtCall[0].nextRunAt.getTime()

      // nextRunAt should be approximately 48 hours from now
      const expectedMin = beforeTime + (48 * 60 * 60 * 1000)
      const expectedMax = afterTime + (48 * 60 * 60 * 1000)

      expect(nextRunAt).toBeGreaterThanOrEqual(expectedMin)
      expect(nextRunAt).toBeLessThanOrEqual(expectedMax)
    })
  })

  // ==================== triggerTask() 测试 ====================

  describe('triggerTask', () => {
    it('should execute task when triggered', async () => {
      const mockTask = {
        id: 1,
        userId: 1,
        type: 'cleanup',
        targetFakeid: null,
        intervalHours: 24,
        status: 'idle',
        config: {},
      }

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockTask]),
      })

      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      })

      mockExportService.cleanExpiredJobs.mockResolvedValue(undefined)
      mockLogService.cleanOldLogs.mockResolvedValue(undefined)
      mockFileService.recalculateStorage.mockResolvedValue(undefined)
      mockLogService.log.mockResolvedValue(undefined)

      await service.triggerTask(1)

      expect(mockExportService.cleanExpiredJobs).toHaveBeenCalled()
    })

    it('should throw error when task not found', async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      })

      await expect(service.triggerTask(999)).rejects.toThrow('Task not found')
    })

    it('should throw error when task is already running', async () => {
      const mockTask = {
        id: 1,
        userId: 1,
        type: 'cleanup',
        targetFakeid: null,
        intervalHours: 24,
        status: 'running',
        config: {},
      }

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockTask]),
      })

      await expect(service.triggerTask(1)).rejects.toThrow('Task is already running')
    })

    it('should allow triggering task in error state', async () => {
      const mockTask = {
        id: 1,
        userId: 1,
        type: 'cleanup',
        targetFakeid: null,
        intervalHours: 24,
        status: 'error',
        config: {},
      }

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockTask]),
      })

      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      })

      mockExportService.cleanExpiredJobs.mockResolvedValue(undefined)
      mockLogService.cleanOldLogs.mockResolvedValue(undefined)
      mockFileService.recalculateStorage.mockResolvedValue(undefined)
      mockLogService.log.mockResolvedValue(undefined)

      await expect(service.triggerTask(1)).resolves.toBeUndefined()
    })
  })

  // ==================== runCleanup() 测试 ====================

  describe('cleanup task', () => {
    it('should clean expired export jobs', async () => {
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      })

      mockExportService.cleanExpiredJobs.mockResolvedValue(undefined)
      mockLogService.cleanOldLogs.mockResolvedValue(undefined)
      mockFileService.recalculateStorage.mockResolvedValue(undefined)
      mockLogService.log.mockResolvedValue(undefined)

      await service.executeTask(1, 1, 'cleanup', null, 24, {})

      expect(mockExportService.cleanExpiredJobs).toHaveBeenCalled()
    })

    it('should use default log retention of 90 days', async () => {
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      })

      mockExportService.cleanExpiredJobs.mockResolvedValue(undefined)
      mockLogService.cleanOldLogs.mockResolvedValue(undefined)
      mockFileService.recalculateStorage.mockResolvedValue(undefined)
      mockLogService.log.mockResolvedValue(undefined)

      await service.executeTask(1, 1, 'cleanup', null, 24, {})

      expect(mockLogService.cleanOldLogs).toHaveBeenCalledWith(90)
    })

    it('should use custom log retention days', async () => {
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      })

      mockExportService.cleanExpiredJobs.mockResolvedValue(undefined)
      mockLogService.cleanOldLogs.mockResolvedValue(undefined)
      mockFileService.recalculateStorage.mockResolvedValue(undefined)
      mockLogService.log.mockResolvedValue(undefined)

      await service.executeTask(1, 1, 'cleanup', null, 24, { logRetentionDays: 30 })

      expect(mockLogService.cleanOldLogs).toHaveBeenCalledWith(30)
    })

    it('should recalculate storage for user', async () => {
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      })

      mockExportService.cleanExpiredJobs.mockResolvedValue(undefined)
      mockLogService.cleanOldLogs.mockResolvedValue(undefined)
      mockFileService.recalculateStorage.mockResolvedValue(undefined)
      mockLogService.log.mockResolvedValue(undefined)

      await service.executeTask(1, 123, 'cleanup', null, 24, {})

      expect(mockFileService.recalculateStorage).toHaveBeenCalledWith(123)
    })
  })

  // ==================== runSync() 测试 ====================

  describe('sync task', () => {
    it('should throw error when no valid WeChat session', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      })

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      })

      mockLogService.log.mockResolvedValue(undefined)

      await service.executeTask(1, 1, 'sync', null, 24, {})

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Scheduler] Task #1 failed:'),
        expect.any(String)
      )
    })

    it('should skip when no accounts to sync', async () => {
      const consoleSpy = vi.spyOn(console, 'log')

      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      })

      // Mock valid session
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{
          userId: 1,
          token: 'test_token',
          cookies: [],
        }]),
      })

      // Mock getAccountService to return no accounts
      vi.doMock('~/server/services/account.service', () => ({
        getAccountService: () => ({
          getAccount: vi.fn().mockResolvedValue(null),
          getAutoSyncAccounts: vi.fn().mockResolvedValue([]),
        }),
      }))

      mockLogService.log.mockResolvedValue(undefined)

      await service.executeTask(1, 1, 'sync', 'test_fakeid', 24, {})

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Scheduler] No accounts to sync')
      )
    })
  })

  // ==================== runDownload() 测试 ====================

  describe('download task', () => {
    it('should skip when no articles to download', async () => {
      const consoleSpy = vi.spyOn(console, 'log')

      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      })

      // Mock article and html services
      vi.doMock('~/server/services/article.service', () => ({
        getArticleService: () => ({
          getArticleUrls: vi.fn().mockResolvedValue([]),
        }),
      }))

      vi.doMock('~/server/services/html.service', () => ({
        getHtmlService: () => ({
          getDownloadedUrls: vi.fn().mockResolvedValue([]),
        }),
      }))

      mockLogService.log.mockResolvedValue(undefined)

      await service.executeTask(1, 1, 'download', 'test_fakeid', 24, {})

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Scheduler] No articles to download')
      )
    })
  })

  // ==================== 集成场景测试 ====================

  describe('Integration Scenarios', () => {
    it('should handle task lifecycle: idle -> running -> idle', async () => {
      const statusHistory: string[] = []
      const setSpy = vi.fn((data: any) => {
        if (data.status) {
          statusHistory.push(data.status)
        }
        return {
          where: vi.fn().mockResolvedValue(undefined),
        }
      })

      mockDb.update.mockReturnValue({
        set: setSpy,
        where: vi.fn().mockResolvedValue(undefined),
      })

      mockExportService.cleanExpiredJobs.mockResolvedValue(undefined)
      mockLogService.cleanOldLogs.mockResolvedValue(undefined)
      mockFileService.recalculateStorage.mockResolvedValue(undefined)
      mockLogService.log.mockResolvedValue(undefined)

      await service.executeTask(1, 1, 'cleanup', null, 24, {})

      expect(statusHistory).toContain('running')
      expect(statusHistory).toContain('idle')
    })

    it('should handle task lifecycle: idle -> running -> error', async () => {
      const statusHistory: string[] = []
      const setSpy = vi.fn((data: any) => {
        if (data.status) {
          statusHistory.push(data.status)
        }
        return {
          where: vi.fn().mockResolvedValue(undefined),
        }
      })

      mockDb.update.mockReturnValue({
        set: setSpy,
        where: vi.fn().mockResolvedValue(undefined),
      })

      mockExportService.cleanExpiredJobs.mockRejectedValue(new Error('Test error'))
      mockLogService.log.mockResolvedValue(undefined)

      vi.spyOn(console, 'error').mockImplementation(() => {})

      await service.executeTask(1, 1, 'cleanup', null, 24, {})

      expect(statusHistory).toContain('running')
      expect(statusHistory).toContain('error')
    })

    it('should handle manual trigger after automatic execution', async () => {
      // First automatic execution
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      })

      mockExportService.cleanExpiredJobs.mockResolvedValue(undefined)
      mockLogService.cleanOldLogs.mockResolvedValue(undefined)
      mockFileService.recalculateStorage.mockResolvedValue(undefined)
      mockLogService.log.mockResolvedValue(undefined)

      await service.executeTask(1, 1, 'cleanup', null, 24, {})

      // Then manual trigger
      const mockTask = {
        id: 1,
        userId: 1,
        type: 'cleanup',
        targetFakeid: null,
        intervalHours: 24,
        status: 'idle',
        config: {},
      }

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockTask]),
      })

      await service.triggerTask(1)

      expect(mockExportService.cleanExpiredJobs).toHaveBeenCalledTimes(2)
    })
  })

  // ==================== 错误处理测试 ====================

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      mockDb.update.mockImplementation(() => {
        throw new Error('Database connection error')
      })

      await expect(async () => {
        await service.executeTask(1, 1, 'cleanup', null, 24, {})
      }).rejects.toThrow()

      consoleSpy.mockRestore()
    })

    it('should handle service errors in cleanup task', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      })

      mockExportService.cleanExpiredJobs.mockRejectedValue(new Error('Export service error'))
      mockLogService.log.mockResolvedValue(undefined)

      await service.executeTask(1, 1, 'cleanup', null, 24, {})

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Scheduler] Task #1 failed:'),
        expect.any(String)
      )

      consoleSpy.mockRestore()
    })

    it('should record error message in task on failure', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const testError = new Error('Test failure message')

      const setSpy = vi.fn().mockReturnThis()
      mockDb.update.mockReturnValue({
        set: setSpy,
        where: vi.fn().mockResolvedValue(undefined),
      })

      mockExportService.cleanExpiredJobs.mockRejectedValue(testError)
      mockLogService.log.mockResolvedValue(undefined)

      await service.executeTask(1, 1, 'cleanup', null, 24, {})

      const errorCall = setSpy.mock.calls.find(call =>
        call[0].status === 'error' && call[0].lastError
      )

      expect(errorCall).toBeDefined()
      expect(errorCall[0].lastError).toBe('Test failure message')

      consoleSpy.mockRestore()
    })
  })
})
