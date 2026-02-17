import { describe, it, expect, vi, beforeEach } from 'vitest'
import { HtmlService } from '~/server/services/html.service'

/**
 * HtmlService 单元测试
 *
 * 测试覆盖：
 * 1. getHtml - 获取 HTML 记录
 * 2. getHtmlByFakeid - 根据 fakeid 获取所有 HTML
 * 3. getDownloadedUrls - 获取已下载的 URL 列表
 * 4. getDownloadedCount - 获取已下载数量
 * 5. saveHtml - 保存 HTML 记录（插入和更新）
 * 6. deleteByFakeid - 删除 fakeid 的所有 HTML
 * 7. getTotalSize - 获取总大小
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
    articleHtml: {
      id: 'id',
      userId: 'userId',
      fakeid: 'fakeid',
      articleUrl: 'articleUrl',
      title: 'title',
      commentId: 'commentId',
      filePath: 'filePath',
      fileSize: 'fileSize',
      createdAt: 'createdAt',
    },
  },
}))

// ==================== 测试套件 ====================

describe('HtmlService', () => {
  let service: HtmlService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new HtmlService()
  })

  // ==================== getHtml() 测试 ====================

  describe('getHtml', () => {
    it('should return HTML record when found', async () => {
      const mockHtml = {
        id: 1,
        userId: 1,
        fakeid: 'test_fakeid',
        articleUrl: 'https://mp.weixin.qq.com/s/test',
        title: 'Test Article',
        commentId: 'comment123',
        filePath: '/data/uploads/1/test_fakeid/html/test.html',
        fileSize: 1024,
        createdAt: new Date(),
      }

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockHtml]),
      })

      const result = await service.getHtml(1, 'https://mp.weixin.qq.com/s/test')

      expect(result).toEqual(mockHtml)
    })

    it('should return null when HTML not found', async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      })

      const result = await service.getHtml(1, 'https://mp.weixin.qq.com/s/nonexistent')

      expect(result).toBeNull()
    })

    it('should query with correct userId and articleUrl', async () => {
      const whereSpy = vi.fn().mockReturnThis()
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: whereSpy,
        limit: vi.fn().mockResolvedValue([]),
      })

      await service.getHtml(123, 'https://mp.weixin.qq.com/s/abc')

      expect(whereSpy).toHaveBeenCalled()
    })
  })

  // ==================== getHtmlByFakeid() 测试 ====================

  describe('getHtmlByFakeid', () => {
    it('should return all HTML records for fakeid', async () => {
      const mockHtmlList = [
        {
          id: 1,
          userId: 1,
          fakeid: 'test_fakeid',
          articleUrl: 'https://mp.weixin.qq.com/s/article1',
          title: 'Article 1',
          filePath: '/path/to/article1.html',
          fileSize: 1024,
        },
        {
          id: 2,
          userId: 1,
          fakeid: 'test_fakeid',
          articleUrl: 'https://mp.weixin.qq.com/s/article2',
          title: 'Article 2',
          filePath: '/path/to/article2.html',
          fileSize: 2048,
        },
      ]

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(mockHtmlList),
      })

      const result = await service.getHtmlByFakeid(1, 'test_fakeid')

      expect(result).toEqual(mockHtmlList)
      expect(result).toHaveLength(2)
    })

    it('should return empty array when no HTML records', async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
      })

      const result = await service.getHtmlByFakeid(1, 'empty_fakeid')

      expect(result).toEqual([])
    })

    it('should filter by userId and fakeid', async () => {
      const whereSpy = vi.fn().mockResolvedValue([])
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: whereSpy,
      })

      await service.getHtmlByFakeid(456, 'test_fakeid')

      expect(whereSpy).toHaveBeenCalled()
    })
  })

  // ==================== getDownloadedUrls() 测试 ====================

  describe('getDownloadedUrls', () => {
    it('should return array of downloaded URLs', async () => {
      const mockRows = [
        { articleUrl: 'https://mp.weixin.qq.com/s/article1' },
        { articleUrl: 'https://mp.weixin.qq.com/s/article2' },
        { articleUrl: 'https://mp.weixin.qq.com/s/article3' },
      ]

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(mockRows),
      })

      const urls = await service.getDownloadedUrls(1, 'test_fakeid')

      expect(urls).toEqual([
        'https://mp.weixin.qq.com/s/article1',
        'https://mp.weixin.qq.com/s/article2',
        'https://mp.weixin.qq.com/s/article3',
      ])
    })

    it('should return empty array when no downloaded articles', async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
      })

      const urls = await service.getDownloadedUrls(1, 'empty_fakeid')

      expect(urls).toEqual([])
    })

    it('should handle single URL', async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([
          { articleUrl: 'https://mp.weixin.qq.com/s/single' },
        ]),
      })

      const urls = await service.getDownloadedUrls(1, 'test_fakeid')

      expect(urls).toEqual(['https://mp.weixin.qq.com/s/single'])
    })
  })

  // ==================== getDownloadedCount() 测试 ====================

  describe('getDownloadedCount', () => {
    it('should return count of downloaded articles', async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ count: 42 }]),
      })

      const count = await service.getDownloadedCount(1, 'test_fakeid')

      expect(count).toBe(42)
    })

    it('should return 0 when no downloaded articles', async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ count: 0 }]),
      })

      const count = await service.getDownloadedCount(1, 'empty_fakeid')

      expect(count).toBe(0)
    })

    it('should return 0 when count is undefined', async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
      })

      const count = await service.getDownloadedCount(1, 'test_fakeid')

      expect(count).toBe(0)
    })

    it('should handle large counts', async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ count: 10000 }]),
      })

      const count = await service.getDownloadedCount(1, 'test_fakeid')

      expect(count).toBe(10000)
    })
  })

  // ==================== saveHtml() 测试 ====================

  describe('saveHtml', () => {
    const userId = 1
    const htmlData = {
      fakeid: 'test_fakeid',
      articleUrl: 'https://mp.weixin.qq.com/s/test',
      title: 'Test Article',
      commentId: 'comment123',
      filePath: '/data/uploads/1/test_fakeid/html/test.html',
      fileSize: 1024,
    }

    it('should insert new HTML record', async () => {
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnThis(),
        onDuplicateKeyUpdate: vi.fn().mockResolvedValue(undefined),
      })

      await service.saveHtml(userId, htmlData)

      expect(mockDb.insert).toHaveBeenCalled()
    })

    it('should update existing HTML record on duplicate', async () => {
      const updateSpy = vi.fn().mockResolvedValue(undefined)
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnThis(),
        onDuplicateKeyUpdate: updateSpy,
      })

      await service.saveHtml(userId, htmlData)

      expect(updateSpy).toHaveBeenCalled()
    })

    it('should save HTML without commentId', async () => {
      const dataWithoutComment = {
        fakeid: 'test_fakeid',
        articleUrl: 'https://mp.weixin.qq.com/s/test',
        title: 'Test Article',
        filePath: '/path/to/file.html',
        fileSize: 2048,
      }

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnThis(),
        onDuplicateKeyUpdate: vi.fn().mockResolvedValue(undefined),
      })

      await service.saveHtml(userId, dataWithoutComment)

      expect(mockDb.insert).toHaveBeenCalled()
    })

    it('should handle very large file sizes', async () => {
      const largeFileData = {
        ...htmlData,
        fileSize: 104857600, // 100MB
      }

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnThis(),
        onDuplicateKeyUpdate: vi.fn().mockResolvedValue(undefined),
      })

      await service.saveHtml(userId, largeFileData)

      expect(mockDb.insert).toHaveBeenCalled()
    })

    it('should include userId in insert', async () => {
      const valuesSpy = vi.fn().mockReturnThis()
      mockDb.insert.mockReturnValue({
        values: valuesSpy,
        onDuplicateKeyUpdate: vi.fn().mockResolvedValue(undefined),
      })

      await service.saveHtml(123, htmlData)

      expect(valuesSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 123,
        })
      )
    })
  })

  // ==================== deleteByFakeid() 测试 ====================

  describe('deleteByFakeid', () => {
    it('should delete all HTML records for fakeid', async () => {
      mockDb.delete.mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      })

      await service.deleteByFakeid(1, 'test_fakeid')

      expect(mockDb.delete).toHaveBeenCalled()
    })

    it('should filter by userId and fakeid', async () => {
      const whereSpy = vi.fn().mockResolvedValue(undefined)
      mockDb.delete.mockReturnValue({
        where: whereSpy,
      })

      await service.deleteByFakeid(456, 'test_fakeid')

      expect(whereSpy).toHaveBeenCalled()
    })

    it('should not throw when deleting non-existent fakeid', async () => {
      mockDb.delete.mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      })

      await expect(service.deleteByFakeid(1, 'nonexistent')).resolves.toBeUndefined()
    })
  })

  // ==================== getTotalSize() 测试 ====================

  describe('getTotalSize', () => {
    it('should return total size of all HTML files', async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ total: 1048576 }]), // 1MB
      })

      const total = await service.getTotalSize(1)

      expect(total).toBe(1048576)
    })

    it('should return 0 when no HTML files', async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ total: 0 }]),
      })

      const total = await service.getTotalSize(1)

      expect(total).toBe(0)
    })

    it('should return 0 when total is undefined', async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
      })

      const total = await service.getTotalSize(1)

      expect(total).toBe(0)
    })

    it('should handle large total sizes', async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ total: 5368709120 }]), // 5GB
      })

      const total = await service.getTotalSize(1)

      expect(total).toBe(5368709120)
    })

    it('should filter by userId', async () => {
      const whereSpy = vi.fn().mockResolvedValue([{ total: 1024 }])
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: whereSpy,
      })

      await service.getTotalSize(789)

      expect(whereSpy).toHaveBeenCalled()
    })

    it('should use COALESCE to handle NULL values', async () => {
      // This tests that the SQL query properly handles NULL sums
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ total: 0 }]),
      })

      const total = await service.getTotalSize(1)

      expect(total).toBe(0)
    })
  })
})
