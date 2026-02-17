import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SearchService } from '~/server/services/search.service'

/**
 * SearchService 单元测试
 *
 * 测试覆盖：
 * 1. ensureIndex - 创建和配置 MeiliSearch 索引
 * 2. indexArticle - 索引单篇文章
 * 3. indexArticles - 批量索引文章
 * 4. deleteArticle - 删除单篇文章索引
 * 5. deleteByFakeid - 删除公众号的所有文章索引
 */

// ==================== Mock 设置 ====================

const mockFetch = vi.fn()
global.fetch = mockFetch as any

// Mock runtime config
vi.mock('#app', () => ({
  useRuntimeConfig: () => ({
    meiliHost: 'http://localhost:7700',
    meiliKey: 'test_api_key',
  }),
}))

// ==================== 测试套件 ====================

describe('SearchService', () => {
  let service: SearchService
  let consoleSpy: any

  beforeEach(() => {
    vi.clearAllMocks()
    service = new SearchService()
    consoleSpy = vi.spyOn(console, 'log')
  })

  // ==================== ensureIndex() 测试 ====================

  describe('ensureIndex', () => {
    it('should create index and configure settings', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true })
      mockFetch.mockResolvedValueOnce({ ok: true })

      await service.ensureIndex()

      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:7700/indexes',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      )
    })

    it('should configure searchable attributes', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true })
      mockFetch.mockResolvedValueOnce({ ok: true })

      await service.ensureIndex()

      const settingsCall = mockFetch.mock.calls[1]
      const body = JSON.parse(settingsCall[1].body)

      expect(body.searchableAttributes).toEqual(['title', 'digest', 'authorName'])
    })

    it('should configure filterable attributes', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true })
      mockFetch.mockResolvedValueOnce({ ok: true })

      await service.ensureIndex()

      const settingsCall = mockFetch.mock.calls[1]
      const body = JSON.parse(settingsCall[1].body)

      expect(body.filterableAttributes).toEqual(['userId', 'fakeid', 'createTime', 'isDeleted'])
    })

    it('should configure sortable attributes', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true })
      mockFetch.mockResolvedValueOnce({ ok: true })

      await service.ensureIndex()

      const settingsCall = mockFetch.mock.calls[1]
      const body = JSON.parse(settingsCall[1].body)

      expect(body.sortableAttributes).toEqual(['createTime'])
    })

    it('should handle MeiliSearch unavailable', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'))

      await service.ensureIndex()

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[Search] MeiliSearch not available:',
        'Connection refused'
      )
    })

    it('should mark service as unavailable on error', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'))

      await service.ensureIndex()

      // Try to index an article - should silently fail
      await service.indexArticle({
        id: 1,
        userId: 1,
        fakeid: 'test',
        title: 'Test',
        link: 'http://test.com',
      })

      expect(mockFetch).toHaveBeenCalledTimes(1) // Only the failed ensureIndex call
    })

    it('should send requests to correct endpoints', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true })
      mockFetch.mockResolvedValueOnce({ ok: true })

      await service.ensureIndex()

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:7700/indexes',
        expect.any(Object)
      )
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:7700/indexes/articles/settings',
        expect.any(Object)
      )
    })

    it('should log success message', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true })
      mockFetch.mockResolvedValueOnce({ ok: true })

      await service.ensureIndex()

      expect(consoleSpy).toHaveBeenCalledWith('[Search] MeiliSearch index configured')
    })
  })

  // ==================== indexArticle() 测试 ====================

  describe('indexArticle', () => {
    it('should index a single article', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true })

      await service.indexArticle({
        id: 1,
        userId: 1,
        fakeid: 'test_fakeid',
        title: 'Test Article',
        link: 'https://mp.weixin.qq.com/s/test',
        cover: 'https://example.com/cover.jpg',
        digest: 'Test digest',
        authorName: 'Test Author',
        createTime: 1234567890,
        isDeleted: 0,
      })

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:7700/indexes/articles/documents',
        expect.objectContaining({
          method: 'POST',
        })
      )
    })

    it('should include all article fields', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true })

      const article = {
        id: 1,
        userId: 1,
        fakeid: 'test_fakeid',
        title: 'Test Article',
        link: 'https://mp.weixin.qq.com/s/test',
        cover: 'https://example.com/cover.jpg',
        digest: 'Test digest',
        authorName: 'Test Author',
        createTime: 1234567890,
        isDeleted: 0,
      }

      await service.indexArticle(article)

      const call = mockFetch.mock.calls[0]
      const body = JSON.parse(call[1].body)

      expect(body[0]).toEqual(article)
    })

    it('should handle null optional fields', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true })

      await service.indexArticle({
        id: 1,
        userId: 1,
        fakeid: 'test_fakeid',
        title: 'Test Article',
        link: 'https://mp.weixin.qq.com/s/test',
        cover: null,
        digest: null,
        authorName: null,
        createTime: null,
      })

      const call = mockFetch.mock.calls[0]
      const body = JSON.parse(call[1].body)

      expect(body[0].cover).toBe('')
      expect(body[0].digest).toBe('')
      expect(body[0].authorName).toBe('')
      expect(body[0].createTime).toBe(0)
    })

    it('should silently fail when service is unavailable', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'))

      await service.ensureIndex()

      mockFetch.mockClear()

      await service.indexArticle({
        id: 1,
        userId: 1,
        fakeid: 'test',
        title: 'Test',
        link: 'http://test.com',
      })

      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should silently fail on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(service.indexArticle({
        id: 1,
        userId: 1,
        fakeid: 'test',
        title: 'Test',
        link: 'http://test.com',
      })).resolves.toBeUndefined()
    })

    it('should handle deleted articles', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true })

      await service.indexArticle({
        id: 1,
        userId: 1,
        fakeid: 'test_fakeid',
        title: 'Deleted Article',
        link: 'https://mp.weixin.qq.com/s/test',
        isDeleted: 1,
      })

      const call = mockFetch.mock.calls[0]
      const body = JSON.parse(call[1].body)

      expect(body[0].isDeleted).toBe(1)
    })
  })

  // ==================== indexArticles() 测试 ====================

  describe('indexArticles', () => {
    it('should index multiple articles', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true })

      const articles = [
        {
          id: 1,
          userId: 1,
          fakeid: 'test_fakeid',
          title: 'Article 1',
          link: 'https://mp.weixin.qq.com/s/test1',
        },
        {
          id: 2,
          userId: 1,
          fakeid: 'test_fakeid',
          title: 'Article 2',
          link: 'https://mp.weixin.qq.com/s/test2',
        },
      ]

      await service.indexArticles(articles)

      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('should handle empty array', async () => {
      await service.indexArticles([])

      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should split large batches into chunks', async () => {
      mockFetch.mockResolvedValue({ ok: true })

      const articles = Array.from({ length: 2500 }, (_, i) => ({
        id: i + 1,
        userId: 1,
        fakeid: 'test_fakeid',
        title: `Article ${i + 1}`,
        link: `https://mp.weixin.qq.com/s/test${i}`,
      }))

      await service.indexArticles(articles)

      // Should be split into 3 chunks (1000 + 1000 + 500)
      expect(mockFetch).toHaveBeenCalledTimes(3)
    })

    it('should handle batch of exactly 1000 articles', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true })

      const articles = Array.from({ length: 1000 }, (_, i) => ({
        id: i + 1,
        userId: 1,
        fakeid: 'test_fakeid',
        title: `Article ${i + 1}`,
        link: `https://mp.weixin.qq.com/s/test${i}`,
      }))

      await service.indexArticles(articles)

      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('should silently fail when service is unavailable', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'))

      await service.ensureIndex()

      mockFetch.mockClear()

      const articles = [
        { id: 1, userId: 1, fakeid: 'test', title: 'Test', link: 'http://test.com' },
      ]

      await service.indexArticles(articles)

      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should silently fail on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const articles = [
        { id: 1, userId: 1, fakeid: 'test', title: 'Test', link: 'http://test.com' },
      ]

      await expect(service.indexArticles(articles)).resolves.toBeUndefined()
    })

    it('should handle articles with all optional fields', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true })

      const articles = [
        {
          id: 1,
          userId: 1,
          fakeid: 'test_fakeid',
          title: 'Article 1',
          link: 'https://mp.weixin.qq.com/s/test1',
          cover: 'https://example.com/cover1.jpg',
          digest: 'Digest 1',
          authorName: 'Author 1',
          createTime: 1234567890,
          isDeleted: 0,
        },
      ]

      await service.indexArticles(articles)

      const call = mockFetch.mock.calls[0]
      const body = JSON.parse(call[1].body)

      expect(body[0]).toEqual(articles[0])
    })
  })

  // ==================== deleteArticle() 测试 ====================

  describe('deleteArticle', () => {
    it('should delete article by id', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true })

      await service.deleteArticle(123)

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:7700/indexes/articles/documents/123',
        expect.objectContaining({
          method: 'DELETE',
        })
      )
    })

    it('should use DELETE method', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true })

      await service.deleteArticle(123)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      )
    })

    it('should silently fail when service is unavailable', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'))

      await service.ensureIndex()

      mockFetch.mockClear()

      await service.deleteArticle(123)

      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should silently fail on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(service.deleteArticle(123)).resolves.toBeUndefined()
    })

    it('should handle different article IDs', async () => {
      mockFetch.mockResolvedValue({ ok: true })

      await service.deleteArticle(1)
      await service.deleteArticle(999)
      await service.deleteArticle(123456)

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:7700/indexes/articles/documents/1',
        expect.any(Object)
      )
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:7700/indexes/articles/documents/999',
        expect.any(Object)
      )
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:7700/indexes/articles/documents/123456',
        expect.any(Object)
      )
    })
  })

  // ==================== deleteByFakeid() 测试 ====================

  describe('deleteByFakeid', () => {
    it('should delete all articles for userId and fakeid', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true })

      await service.deleteByFakeid(1, 'test_fakeid')

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:7700/indexes/articles/documents/delete',
        expect.objectContaining({
          method: 'POST',
        })
      )
    })

    it('should use correct filter', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true })

      await service.deleteByFakeid(123, 'test_fakeid')

      const call = mockFetch.mock.calls[0]
      const body = JSON.parse(call[1].body)

      expect(body.filter).toBe('userId = 123 AND fakeid = "test_fakeid"')
    })

    it('should handle different userId values', async () => {
      mockFetch.mockResolvedValue({ ok: true })

      await service.deleteByFakeid(1, 'fakeid1')
      await service.deleteByFakeid(999, 'fakeid2')

      const call1 = mockFetch.mock.calls[0]
      const body1 = JSON.parse(call1[1].body)
      expect(body1.filter).toBe('userId = 1 AND fakeid = "fakeid1"')

      const call2 = mockFetch.mock.calls[1]
      const body2 = JSON.parse(call2[1].body)
      expect(body2.filter).toBe('userId = 999 AND fakeid = "fakeid2"')
    })

    it('should silently fail when service is unavailable', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'))

      await service.ensureIndex()

      mockFetch.mockClear()

      await service.deleteByFakeid(1, 'test_fakeid')

      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should silently fail on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(service.deleteByFakeid(1, 'test_fakeid')).resolves.toBeUndefined()
    })

    it('should use POST method with filter', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true })

      await service.deleteByFakeid(1, 'test_fakeid')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      )
    })
  })

  // ==================== 集成场景测试 ====================

  describe('Integration Scenarios', () => {
    it('should handle full article lifecycle', async () => {
      mockFetch.mockResolvedValue({ ok: true })

      // Ensure index
      await service.ensureIndex()

      // Index article
      await service.indexArticle({
        id: 1,
        userId: 1,
        fakeid: 'test_fakeid',
        title: 'Test Article',
        link: 'https://mp.weixin.qq.com/s/test',
      })

      // Delete article
      await service.deleteArticle(1)

      expect(mockFetch).toHaveBeenCalledTimes(4) // 2 for ensureIndex, 1 for index, 1 for delete
    })

    it('should handle batch operations', async () => {
      mockFetch.mockResolvedValue({ ok: true })

      const articles = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        userId: 1,
        fakeid: 'test_fakeid',
        title: `Article ${i + 1}`,
        link: `https://mp.weixin.qq.com/s/test${i}`,
      }))

      // Index all articles
      await service.indexArticles(articles)

      // Delete all by fakeid
      await service.deleteByFakeid(1, 'test_fakeid')

      expect(mockFetch).toHaveBeenCalledTimes(2) // 1 for indexArticles, 1 for deleteByFakeid
    })

    it('should handle service becoming unavailable', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true })
      mockFetch.mockResolvedValueOnce({ ok: true })

      await service.ensureIndex()

      // Service becomes unavailable
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      mockFetch.mockRejectedValueOnce(new Error('Connection lost'))

      const newService = new SearchService()
      await newService.ensureIndex()

      // Subsequent operations should silently fail
      mockFetch.mockClear()
      await newService.indexArticle({
        id: 1,
        userId: 1,
        fakeid: 'test',
        title: 'Test',
        link: 'http://test.com',
      })

      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should handle multiple concurrent indexing operations', async () => {
      mockFetch.mockResolvedValue({ ok: true })

      const promises = [
        service.indexArticle({
          id: 1,
          userId: 1,
          fakeid: 'test',
          title: 'Article 1',
          link: 'http://test1.com',
        }),
        service.indexArticle({
          id: 2,
          userId: 1,
          fakeid: 'test',
          title: 'Article 2',
          link: 'http://test2.com',
        }),
        service.indexArticle({
          id: 3,
          userId: 1,
          fakeid: 'test',
          title: 'Article 3',
          link: 'http://test3.com',
        }),
      ]

      await Promise.all(promises)

      expect(mockFetch).toHaveBeenCalledTimes(3)
    })

    it('should handle mixed success and failure', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true }) // Success
      mockFetch.mockRejectedValueOnce(new Error('Network error')) // Failure
      mockFetch.mockResolvedValueOnce({ ok: true }) // Success

      await service.indexArticle({
        id: 1,
        userId: 1,
        fakeid: 'test',
        title: 'Article 1',
        link: 'http://test1.com',
      })

      await service.indexArticle({
        id: 2,
        userId: 1,
        fakeid: 'test',
        title: 'Article 2',
        link: 'http://test2.com',
      })

      await service.indexArticle({
        id: 3,
        userId: 1,
        fakeid: 'test',
        title: 'Article 3',
        link: 'http://test3.com',
      })

      expect(mockFetch).toHaveBeenCalledTimes(3)
    })
  })

  // ==================== 边界情况测试 ====================

  describe('Edge Cases', () => {
    it('should handle very long article titles', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true })

      const longTitle = 'A'.repeat(1000)

      await service.indexArticle({
        id: 1,
        userId: 1,
        fakeid: 'test',
        title: longTitle,
        link: 'http://test.com',
      })

      const call = mockFetch.mock.calls[0]
      const body = JSON.parse(call[1].body)

      expect(body[0].title).toBe(longTitle)
    })

    it('should handle special characters in fakeid', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true })

      await service.deleteByFakeid(1, 'test_fakeid_with_$pecial_ch@rs')

      const call = mockFetch.mock.calls[0]
      const body = JSON.parse(call[1].body)

      expect(body.filter).toContain('test_fakeid_with_$pecial_ch@rs')
    })

    it('should handle zero userId', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true })

      await service.deleteByFakeid(0, 'test_fakeid')

      const call = mockFetch.mock.calls[0]
      const body = JSON.parse(call[1].body)

      expect(body.filter).toBe('userId = 0 AND fakeid = "test_fakeid"')
    })

    it('should handle negative articleId', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true })

      await service.deleteArticle(-1)

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:7700/indexes/articles/documents/-1',
        expect.any(Object)
      )
    })

    it('should handle empty string fields', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true })

      await service.indexArticle({
        id: 1,
        userId: 1,
        fakeid: '',
        title: '',
        link: '',
      })

      const call = mockFetch.mock.calls[0]
      const body = JSON.parse(call[1].body)

      expect(body[0].fakeid).toBe('')
      expect(body[0].title).toBe('')
      expect(body[0].link).toBe('')
    })
  })
})
