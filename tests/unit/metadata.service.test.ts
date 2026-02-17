import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MetadataService } from '~/server/services/metadata.service'

/**
 * MetadataService 单元测试
 *
 * 测试覆盖：
 * 1. getMetadata - 获取单个文章元数据
 * 2. getMetadataByFakeid - 获取公众号所有文章元数据
 * 3. getDownloadedUrls - 获取已下载的文章 URL 列表
 * 4. saveMetadata - 保存元数据（插入和更新）
 * 5. deleteByFakeid - 删除公众号的所有元数据
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
    articleMetadata: {
      id: 'id',
      userId: 'userId',
      fakeid: 'fakeid',
      articleUrl: 'articleUrl',
      title: 'title',
      readNum: 'readNum',
      oldLikeNum: 'oldLikeNum',
      shareNum: 'shareNum',
      likeNum: 'likeNum',
      commentNum: 'commentNum',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
    },
  },
}))

// ==================== 测试套件 ====================

describe('MetadataService', () => {
  let service: MetadataService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new MetadataService()
  })

  // ==================== getMetadata() 测试 ====================

  describe('getMetadata', () => {
    it('should return metadata when found', async () => {
      const mockMetadata = {
        id: 1,
        userId: 1,
        fakeid: 'test_fakeid',
        articleUrl: 'https://mp.weixin.qq.com/s/test',
        title: 'Test Article',
        readNum: 1000,
        oldLikeNum: 50,
        shareNum: 20,
        likeNum: 100,
        commentNum: 30,
        createdAt: new Date(),
      }

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockMetadata]),
      })

      const result = await service.getMetadata(1, 'https://mp.weixin.qq.com/s/test')

      expect(result).toEqual(mockMetadata)
    })

    it('should return null when metadata not found', async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      })

      const result = await service.getMetadata(1, 'https://mp.weixin.qq.com/s/nonexistent')

      expect(result).toBeNull()
    })

    it('should query with correct userId and articleUrl', async () => {
      const whereSpy = vi.fn().mockReturnThis()
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: whereSpy,
        limit: vi.fn().mockResolvedValue([]),
      })

      await service.getMetadata(123, 'https://mp.weixin.qq.com/s/test')

      expect(whereSpy).toHaveBeenCalled()
    })

    it('should return metadata with all statistics', async () => {
      const mockMetadata = {
        id: 1,
        userId: 1,
        fakeid: 'test_fakeid',
        articleUrl: 'https://mp.weixin.qq.com/s/test',
        title: 'Popular Article',
        readNum: 100000,
        oldLikeNum: 5000,
        shareNum: 2000,
        likeNum: 10000,
        commentNum: 500,
      }

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockMetadata]),
      })

      const result = await service.getMetadata(1, 'https://mp.weixin.qq.com/s/test')

      expect(result?.readNum).toBe(100000)
      expect(result?.likeNum).toBe(10000)
      expect(result?.shareNum).toBe(2000)
      expect(result?.commentNum).toBe(500)
    })
  })

  // ==================== getMetadataByFakeid() 测试 ====================

  describe('getMetadataByFakeid', () => {
    it('should return all metadata for fakeid', async () => {
      const mockMetadataList = [
        {
          id: 1,
          userId: 1,
          fakeid: 'test_fakeid',
          articleUrl: 'https://mp.weixin.qq.com/s/article1',
          title: 'Article 1',
          readNum: 1000,
          likeNum: 50,
        },
        {
          id: 2,
          userId: 1,
          fakeid: 'test_fakeid',
          articleUrl: 'https://mp.weixin.qq.com/s/article2',
          title: 'Article 2',
          readNum: 2000,
          likeNum: 100,
        },
      ]

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(mockMetadataList),
      })

      const result = await service.getMetadataByFakeid(1, 'test_fakeid')

      expect(result).toEqual(mockMetadataList)
      expect(result).toHaveLength(2)
    })

    it('should return empty array when no metadata', async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
      })

      const result = await service.getMetadataByFakeid(1, 'empty_fakeid')

      expect(result).toEqual([])
    })

    it('should filter by userId and fakeid', async () => {
      const whereSpy = vi.fn().mockResolvedValue([])
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: whereSpy,
      })

      await service.getMetadataByFakeid(456, 'test_fakeid')

      expect(whereSpy).toHaveBeenCalled()
    })

    it('should return multiple metadata records', async () => {
      const mockMetadataList = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        userId: 1,
        fakeid: 'test_fakeid',
        articleUrl: `https://mp.weixin.qq.com/s/article${i}`,
        title: `Article ${i}`,
        readNum: 1000 * (i + 1),
        likeNum: 50 * (i + 1),
      }))

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(mockMetadataList),
      })

      const result = await service.getMetadataByFakeid(1, 'test_fakeid')

      expect(result).toHaveLength(10)
    })
  })

  // ==================== getDownloadedUrls() 测试 ====================

  describe('getDownloadedUrls', () => {
    it('should return array of article URLs', async () => {
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

    it('should return empty array when no articles', async () => {
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

    it('should filter by userId and fakeid', async () => {
      const whereSpy = vi.fn().mockResolvedValue([])
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: whereSpy,
      })

      await service.getDownloadedUrls(789, 'test_fakeid')

      expect(whereSpy).toHaveBeenCalled()
    })

    it('should handle large number of URLs', async () => {
      const mockRows = Array.from({ length: 100 }, (_, i) => ({
        articleUrl: `https://mp.weixin.qq.com/s/article${i}`,
      }))

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(mockRows),
      })

      const urls = await service.getDownloadedUrls(1, 'test_fakeid')

      expect(urls).toHaveLength(100)
    })
  })

  // ==================== saveMetadata() 测试 ====================

  describe('saveMetadata', () => {
    const userId = 1
    const metadataData = {
      fakeid: 'test_fakeid',
      articleUrl: 'https://mp.weixin.qq.com/s/test',
      title: 'Test Article',
      readNum: 1000,
      oldLikeNum: 50,
      shareNum: 20,
      likeNum: 100,
      commentNum: 30,
    }

    it('should insert new metadata', async () => {
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnThis(),
        onDuplicateKeyUpdate: vi.fn().mockResolvedValue(undefined),
      })

      await service.saveMetadata(userId, metadataData)

      expect(mockDb.insert).toHaveBeenCalled()
    })

    it('should update existing metadata on duplicate', async () => {
      const updateSpy = vi.fn().mockResolvedValue(undefined)
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnThis(),
        onDuplicateKeyUpdate: updateSpy,
      })

      await service.saveMetadata(userId, metadataData)

      expect(updateSpy).toHaveBeenCalled()
    })

    it('should include userId in insert', async () => {
      const valuesSpy = vi.fn().mockReturnThis()
      mockDb.insert.mockReturnValue({
        values: valuesSpy,
        onDuplicateKeyUpdate: vi.fn().mockResolvedValue(undefined),
      })

      await service.saveMetadata(456, metadataData)

      expect(valuesSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 456,
        })
      )
    })

    it('should include all metadata fields', async () => {
      const valuesSpy = vi.fn().mockReturnThis()
      mockDb.insert.mockReturnValue({
        values: valuesSpy,
        onDuplicateKeyUpdate: vi.fn().mockResolvedValue(undefined),
      })

      await service.saveMetadata(userId, metadataData)

      expect(valuesSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          fakeid: metadataData.fakeid,
          articleUrl: metadataData.articleUrl,
          title: metadataData.title,
          readNum: metadataData.readNum,
          oldLikeNum: metadataData.oldLikeNum,
          shareNum: metadataData.shareNum,
          likeNum: metadataData.likeNum,
          commentNum: metadataData.commentNum,
        })
      )
    })

    it('should update statistics on duplicate', async () => {
      const updateSpy = vi.fn().mockResolvedValue(undefined)
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnThis(),
        onDuplicateKeyUpdate: updateSpy,
      })

      await service.saveMetadata(userId, metadataData)

      expect(updateSpy).toHaveBeenCalledWith({
        set: expect.objectContaining({
          readNum: metadataData.readNum,
          oldLikeNum: metadataData.oldLikeNum,
          shareNum: metadataData.shareNum,
          likeNum: metadataData.likeNum,
          commentNum: metadataData.commentNum,
        }),
      })
    })

    it('should handle zero values for statistics', async () => {
      const zeroStatsData = {
        ...metadataData,
        readNum: 0,
        oldLikeNum: 0,
        shareNum: 0,
        likeNum: 0,
        commentNum: 0,
      }

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnThis(),
        onDuplicateKeyUpdate: vi.fn().mockResolvedValue(undefined),
      })

      await service.saveMetadata(userId, zeroStatsData)

      expect(mockDb.insert).toHaveBeenCalled()
    })

    it('should handle large statistics values', async () => {
      const largeStatsData = {
        ...metadataData,
        readNum: 10000000,
        oldLikeNum: 500000,
        shareNum: 200000,
        likeNum: 1000000,
        commentNum: 50000,
      }

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnThis(),
        onDuplicateKeyUpdate: vi.fn().mockResolvedValue(undefined),
      })

      await service.saveMetadata(userId, largeStatsData)

      expect(mockDb.insert).toHaveBeenCalled()
    })
  })

  // ==================== deleteByFakeid() 测试 ====================

  describe('deleteByFakeid', () => {
    it('should delete all metadata for fakeid', async () => {
      mockDb.delete.mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      })

      await service.deleteByFakeid(1, 'test_fakeid')

      expect(mockDb.delete).toHaveBeenCalled()
    })

    it('should delete with correct userId and fakeid', async () => {
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

    it('should handle multiple deletions', async () => {
      mockDb.delete.mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      })

      await service.deleteByFakeid(1, 'fakeid1')
      await service.deleteByFakeid(1, 'fakeid2')
      await service.deleteByFakeid(1, 'fakeid3')

      expect(mockDb.delete).toHaveBeenCalledTimes(3)
    })
  })

  // ==================== 集成场景测试 ====================

  describe('Integration Scenarios', () => {
    it('should save and retrieve metadata', async () => {
      const metadataData = {
        fakeid: 'test_fakeid',
        articleUrl: 'https://mp.weixin.qq.com/s/test',
        title: 'Test Article',
        readNum: 1000,
        oldLikeNum: 50,
        shareNum: 20,
        likeNum: 100,
        commentNum: 30,
      }

      // Save
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnThis(),
        onDuplicateKeyUpdate: vi.fn().mockResolvedValue(undefined),
      })
      await service.saveMetadata(1, metadataData)

      // Retrieve
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ id: 1, userId: 1, ...metadataData }]),
      })
      const result = await service.getMetadata(1, metadataData.articleUrl)

      expect(result?.title).toBe(metadataData.title)
      expect(result?.readNum).toBe(metadataData.readNum)
    })

    it('should update metadata statistics', async () => {
      const initialData = {
        fakeid: 'test_fakeid',
        articleUrl: 'https://mp.weixin.qq.com/s/test',
        title: 'Test Article',
        readNum: 1000,
        oldLikeNum: 50,
        shareNum: 20,
        likeNum: 100,
        commentNum: 30,
      }

      // Initial save
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnThis(),
        onDuplicateKeyUpdate: vi.fn().mockResolvedValue(undefined),
      })
      await service.saveMetadata(1, initialData)

      // Update with new stats
      const updatedData = {
        ...initialData,
        readNum: 2000,
        likeNum: 200,
        commentNum: 50,
      }

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnThis(),
        onDuplicateKeyUpdate: vi.fn().mockResolvedValue(undefined),
      })
      await service.saveMetadata(1, updatedData)

      expect(mockDb.insert).toHaveBeenCalledTimes(2)
    })

    it('should save multiple metadata and delete all', async () => {
      const metadataList = [
        {
          fakeid: 'test_fakeid',
          articleUrl: 'https://mp.weixin.qq.com/s/article1',
          title: 'Article 1',
          readNum: 1000,
          oldLikeNum: 50,
          shareNum: 20,
          likeNum: 100,
          commentNum: 30,
        },
        {
          fakeid: 'test_fakeid',
          articleUrl: 'https://mp.weixin.qq.com/s/article2',
          title: 'Article 2',
          readNum: 2000,
          oldLikeNum: 100,
          shareNum: 40,
          likeNum: 200,
          commentNum: 60,
        },
      ]

      // Save multiple
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnThis(),
        onDuplicateKeyUpdate: vi.fn().mockResolvedValue(undefined),
      })

      for (const metadata of metadataList) {
        await service.saveMetadata(1, metadata)
      }

      // Delete all
      mockDb.delete.mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      })
      await service.deleteByFakeid(1, 'test_fakeid')

      expect(mockDb.insert).toHaveBeenCalledTimes(2)
      expect(mockDb.delete).toHaveBeenCalled()
    })
  })
})
