import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ArticleService } from '~/server/services/article.service'

/**
 * ArticleService 单元测试
 *
 * 测试覆盖：
 * 1. getArticles - 分页获取文章列表（分页、关键词、时间筛选、收藏筛选）
 * 2. getArticleByUrl - 根据 URL 获取文章
 * 3. getArticlesByFakeid - 获取公众号的所有文章
 * 4. getArticleCount - 获取文章数量
 * 5. upsertArticle - 插入或更新文章
 * 6. upsertArticles - 批量插入或更新文章
 * 7. setFavorite - 设置收藏状态
 * 8. deleteArticlesByFakeid - 删除公众号的所有文章
 * 9. getAllArticleUrls - 获取所有文章 URL
 * 10. getFavoritedArticles - 获取收藏的文章
 */

// ==================== Mock 设置 ====================

// Use vi.hoisted to declare mocks before vi.mock calls
const { mockDb, mockSearchService, mockGetSearchService } = vi.hoisted(() => {
  const searchService = {
    indexArticle: vi.fn().mockResolvedValue(undefined),
    deleteByFakeid: vi.fn().mockResolvedValue(undefined),
  }

  return {
    mockDb: {
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    mockSearchService: searchService,
    mockGetSearchService: vi.fn(() => searchService),
  }
})

// Mock modules
vi.mock('~/server/database', () => ({
  getDb: () => mockDb,
  schema: {
    articles: {
      id: 'id',
      userId: 'userId',
      fakeid: 'fakeid',
      aid: 'aid',
      title: 'title',
      link: 'link',
      cover: 'cover',
      digest: 'digest',
      authorName: 'authorName',
      createTime: 'createTime',
      updateTime: 'updateTime',
      appmsgid: 'appmsgid',
      itemidx: 'itemidx',
      itemShowType: 'itemShowType',
      copyrightStat: 'copyrightStat',
      copyrightType: 'copyrightType',
      isDeleted: 'isDeleted',
      isPaySubscribe: 'isPaySubscribe',
      albumId: 'albumId',
      appmsgAlbumInfos: 'appmsgAlbumInfos',
      mediaDuration: 'mediaDuration',
      isSingle: 'isSingle',
      isFavorited: 'isFavorited',
      createdAt: 'createdAt',
    },
  },
}))

vi.mock('~/server/services/search.service', () => ({
  getSearchService: mockGetSearchService,
}))

// ==================== 测试套件 ====================

describe('ArticleService', () => {
  let service: ArticleService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new ArticleService()
  })

  // ==================== getArticles() 测试 ====================

  describe('getArticles', () => {
    const userId = 1
    const fakeid = 'test_fakeid'

    it('should get articles with default pagination', async () => {
      const mockArticles = [
        {
          id: 1,
          userId,
          fakeid,
          aid: 'aid1',
          title: 'Article 1',
          link: 'https://mp.weixin.qq.com/s/article1',
          createTime: 1000000,
        },
        {
          id: 2,
          userId,
          fakeid,
          aid: 'aid2',
          title: 'Article 2',
          link: 'https://mp.weixin.qq.com/s/article2',
          createTime: 2000000,
        },
      ]

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockResolvedValue(mockArticles),
      })

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ count: 2 }]),
      })

      const result = await service.getArticles(userId, fakeid)

      expect(result.items).toHaveLength(2)
      expect(result.total).toBe(2)
      expect(result.page).toBe(1)
      expect(result.pageSize).toBe(50)
      expect(result.hasMore).toBe(false)
    })

    it('should support custom pagination', async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockResolvedValue([]),
      })

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ count: 100 }]),
      })

      const result = await service.getArticles(userId, fakeid, {
        page: 2,
        pageSize: 10,
      })

      expect(result.page).toBe(2)
      expect(result.pageSize).toBe(10)
      expect(result.hasMore).toBe(true)
    })

    it('should filter by keyword', async () => {
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

      await service.getArticles(userId, fakeid, {
        keyword: '测试',
      })

      expect(mockDb.select).toHaveBeenCalled()
    })

    it('should filter by time range', async () => {
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

      await service.getArticles(userId, fakeid, {
        startTime: 1000000,
        endTime: 2000000,
      })

      expect(mockDb.select).toHaveBeenCalled()
    })

    it('should filter by favorite status', async () => {
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

      await service.getArticles(userId, fakeid, {
        isFavorited: true,
      })

      expect(mockDb.select).toHaveBeenCalled()
    })

    it('should handle empty results', async () => {
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

      const result = await service.getArticles(userId, fakeid)

      expect(result.items).toEqual([])
      expect(result.total).toBe(0)
      expect(result.hasMore).toBe(false)
    })
  })

  // ==================== getArticleByUrl() 测试 ====================

  describe('getArticleByUrl', () => {
    it('should return article when found', async () => {
      const mockArticle = {
        id: 1,
        userId: 1,
        fakeid: 'test_fakeid',
        title: 'Test Article',
        link: 'https://mp.weixin.qq.com/s/test',
      }

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockArticle]),
      })

      const result = await service.getArticleByUrl(1, 'https://mp.weixin.qq.com/s/test')

      expect(result).toEqual(mockArticle)
    })

    it('should return null when article not found', async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      })

      const result = await service.getArticleByUrl(1, 'https://mp.weixin.qq.com/s/nonexistent')

      expect(result).toBeNull()
    })
  })

  // ==================== getArticlesByFakeid() 测试 ====================

  describe('getArticlesByFakeid', () => {
    it('should return all articles for fakeid', async () => {
      const mockArticles = [
        { id: 1, title: 'Article 1', createTime: 2000000 },
        { id: 2, title: 'Article 2', createTime: 1000000 },
      ]

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue(mockArticles),
      })

      const result = await service.getArticlesByFakeid(1, 'test_fakeid')

      expect(result).toEqual(mockArticles)
      expect(result).toHaveLength(2)
    })

    it('should return empty array when no articles', async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue([]),
      })

      const result = await service.getArticlesByFakeid(1, 'empty_fakeid')

      expect(result).toEqual([])
    })
  })

  // ==================== getArticleCount() 测试 ====================

  describe('getArticleCount', () => {
    it('should return article count', async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ count: 42 }]),
      })

      const count = await service.getArticleCount(1, 'test_fakeid')

      expect(count).toBe(42)
    })

    it('should return 0 when no articles', async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ count: 0 }]),
      })

      const count = await service.getArticleCount(1, 'empty_fakeid')

      expect(count).toBe(0)
    })

    it('should return 0 when count is undefined', async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
      })

      const count = await service.getArticleCount(1, 'test_fakeid')

      expect(count).toBe(0)
    })
  })

  // ==================== upsertArticle() 测试 ====================

  describe('upsertArticle', () => {
    const userId = 1
    const articleData = {
      fakeid: 'test_fakeid',
      aid: 'aid123',
      title: 'Test Article',
      link: 'https://mp.weixin.qq.com/s/test',
      cover: 'https://example.com/cover.jpg',
      digest: 'Article digest',
      authorName: 'Author',
      createTime: 1000000,
      updateTime: 1000000,
    }

    it('should insert new article successfully', async () => {
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnThis(),
        onDuplicateKeyUpdate: vi.fn().mockResolvedValue([{ insertId: 1 }]),
      })

      await service.upsertArticle(userId, articleData)

      expect(mockDb.insert).toHaveBeenCalled()
      expect(mockSearchService.indexArticle).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 1,
          userId,
          fakeid: articleData.fakeid,
          title: articleData.title,
        })
      )
    })

    it('should update existing article', async () => {
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnThis(),
        onDuplicateKeyUpdate: vi.fn().mockResolvedValue([{ insertId: 1 }]),
      })

      await service.upsertArticle(userId, articleData)

      expect(mockDb.insert).toHaveBeenCalled()
    })

    it('should handle article with all optional fields', async () => {
      const fullArticleData = {
        ...articleData,
        appmsgid: 123456,
        itemidx: 1,
        itemShowType: 0,
        copyrightStat: 1,
        copyrightType: 1,
        isDeleted: 0,
        isPaySubscribe: 0,
        albumId: 'album123',
        appmsgAlbumInfos: { foo: 'bar' },
        mediaDuration: '00:05:30',
        isSingle: 1,
      }

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnThis(),
        onDuplicateKeyUpdate: vi.fn().mockResolvedValue([{ insertId: 1 }]),
      })

      await service.upsertArticle(userId, fullArticleData)

      expect(mockDb.insert).toHaveBeenCalled()
    })

    it('should not index when insertId is 0', async () => {
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnThis(),
        onDuplicateKeyUpdate: vi.fn().mockResolvedValue([{ insertId: 0 }]),
      })

      await service.upsertArticle(userId, articleData)

      expect(mockSearchService.indexArticle).not.toHaveBeenCalled()
    })

    it('should handle indexing error gracefully', async () => {
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnThis(),
        onDuplicateKeyUpdate: vi.fn().mockResolvedValue([{ insertId: 1 }]),
      })

      mockSearchService.indexArticle.mockRejectedValueOnce(new Error('Search service error'))

      // Should not throw
      await expect(service.upsertArticle(userId, articleData)).resolves.toBeUndefined()
    })

    it('should handle database error gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnThis(),
        onDuplicateKeyUpdate: vi.fn().mockRejectedValue(new Error('DB error')),
      })

      // Should not throw
      await expect(service.upsertArticle(userId, articleData)).resolves.toBeUndefined()
      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })
  })

  // ==================== upsertArticles() 测试 ====================

  describe('upsertArticles', () => {
    it('should upsert multiple articles', async () => {
      const articles = [
        {
          fakeid: 'test_fakeid',
          aid: 'aid1',
          title: 'Article 1',
          link: 'https://mp.weixin.qq.com/s/article1',
        },
        {
          fakeid: 'test_fakeid',
          aid: 'aid2',
          title: 'Article 2',
          link: 'https://mp.weixin.qq.com/s/article2',
        },
      ]

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnThis(),
        onDuplicateKeyUpdate: vi.fn().mockResolvedValue([{ insertId: 1 }]),
      })

      await service.upsertArticles(1, articles)

      expect(mockDb.insert).toHaveBeenCalledTimes(2)
    })

    it('should handle empty array', async () => {
      await service.upsertArticles(1, [])

      expect(mockDb.insert).not.toHaveBeenCalled()
    })
  })

  // ==================== setFavorite() 测试 ====================

  describe('setFavorite', () => {
    it('should set article as favorited', async () => {
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue({}),
      })

      await service.setFavorite(1, 1, true)

      expect(mockDb.update).toHaveBeenCalled()
    })

    it('should remove favorite from article', async () => {
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue({}),
      })

      await service.setFavorite(1, 1, false)

      expect(mockDb.update).toHaveBeenCalled()
    })
  })

  // ==================== deleteArticlesByFakeid() 测试 ====================

  describe('deleteArticlesByFakeid', () => {
    it('should delete all articles for fakeid', async () => {
      mockDb.delete.mockReturnValue({
        where: vi.fn().mockResolvedValue({}),
      })

      await service.deleteArticlesByFakeid(1, 'test_fakeid')

      expect(mockDb.delete).toHaveBeenCalled()
      expect(mockSearchService.deleteByFakeid).toHaveBeenCalledWith(1, 'test_fakeid')
    })

    it('should handle search service error gracefully', async () => {
      mockDb.delete.mockReturnValue({
        where: vi.fn().mockResolvedValue({}),
      })

      mockSearchService.deleteByFakeid.mockRejectedValueOnce(new Error('Search error'))

      // Should not throw
      await expect(service.deleteArticlesByFakeid(1, 'test_fakeid')).resolves.toBeUndefined()
    })
  })

  // ==================== getAllArticleUrls() 测试 ====================

  describe('getAllArticleUrls', () => {
    it('should return all article URLs', async () => {
      const mockRows = [
        { link: 'https://mp.weixin.qq.com/s/article1' },
        { link: 'https://mp.weixin.qq.com/s/article2' },
        { link: 'https://mp.weixin.qq.com/s/article3' },
      ]

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(mockRows),
      })

      const urls = await service.getAllArticleUrls(1, 'test_fakeid')

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

      const urls = await service.getAllArticleUrls(1, 'empty_fakeid')

      expect(urls).toEqual([])
    })
  })

  // ==================== getFavoritedArticles() 测试 ====================

  describe('getFavoritedArticles', () => {
    it('should return favorited articles with default pagination', async () => {
      const mockArticles = [
        { id: 1, title: 'Favorited 1', isFavorited: 1 },
        { id: 2, title: 'Favorited 2', isFavorited: 1 },
      ]

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockResolvedValue(mockArticles),
      })

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ count: 2 }]),
      })

      const result = await service.getFavoritedArticles(1)

      expect(result.items).toHaveLength(2)
      expect(result.total).toBe(2)
      expect(result.page).toBe(1)
      expect(result.pageSize).toBe(50)
      expect(result.hasMore).toBe(false)
    })

    it('should support custom pagination', async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockResolvedValue([]),
      })

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ count: 100 }]),
      })

      const result = await service.getFavoritedArticles(1, 3, 20)

      expect(result.page).toBe(3)
      expect(result.pageSize).toBe(20)
      expect(result.hasMore).toBe(true)
    })

    it('should return empty results when no favorited articles', async () => {
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

      const result = await service.getFavoritedArticles(1)

      expect(result.items).toEqual([])
      expect(result.total).toBe(0)
      expect(result.hasMore).toBe(false)
    })
  })
})
