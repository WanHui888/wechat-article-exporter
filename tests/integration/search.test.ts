/**
 * 搜索功能 API 集成测试
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createApiClient } from '../helpers/api-client'
import { testDb, seedTestDatabase, cleanTestDatabase } from '../helpers/database'
import { assert } from '../helpers/assertions'

describe('Search API Integration Tests', () => {
  const client = createApiClient()
  let userToken: string
  let userId: number
  let accountId: number

  beforeEach(async () => {
    cleanTestDatabase()
    const { normalUser, account1 } = await seedTestDatabase()
    userId = normalUser.id
    accountId = account1.id

    userToken = 'fake-jwt-token-for-testing'
    client.setAuth(userToken)

    // 创建测试文章用于搜索
    const articles = [
      { title: 'JavaScript 入门教程', author: '张三', digest: '学习 JavaScript 基础知识' },
      { title: 'Python 数据分析', author: '李四', digest: '使用 Python 进行数据分析' },
      { title: 'JavaScript 高级技巧', author: '王五', digest: 'JavaScript 进阶内容' },
      { title: 'React 组件开发', author: '赵六', digest: '学习 React 组件化开发' },
      { title: 'Vue3 实战项目', author: '张三', digest: 'Vue3 项目实战教程' },
    ]

    for (const article of articles) {
      testDb.createArticle({
        userId,
        accountId,
        ...article,
      })
    }
  })

  afterEach(() => {
    client.clearAuth()
    cleanTestDatabase()
  })

  describe('GET /api/search/articles', () => {
    it('should search articles by title', async () => {
      const response = await client.get('/api/search/articles', {
        query: { q: 'JavaScript' },
      })

      assert.api.isSuccess(response)
      assert.api.hasPagination(response)

      const articles = response.data.items
      expect(articles.length).toBe(2)
      expect(articles.every((a: any) => a.title.includes('JavaScript'))).toBe(true)
    })

    it('should search articles by author', async () => {
      const response = await client.get('/api/search/articles', {
        query: { q: '张三', field: 'author' },
      })

      assert.api.isSuccess(response)

      const articles = response.data.items
      expect(articles.every((a: any) => a.author === '张三')).toBe(true)
    })

    it('should search articles by digest', async () => {
      const response = await client.get('/api/search/articles', {
        query: { q: '数据分析', field: 'digest' },
      })

      assert.api.isSuccess(response)

      const articles = response.data.items
      expect(articles.length).toBeGreaterThan(0)
      expect(articles.some((a: any) => a.digest.includes('数据分析'))).toBe(true)
    })

    it('should support full-text search across all fields', async () => {
      const response = await client.get('/api/search/articles', {
        query: { q: 'React', field: 'all' },
      })

      assert.api.isSuccess(response)

      const articles = response.data.items
      expect(articles.length).toBeGreaterThan(0)
    })

    it('should support case-insensitive search', async () => {
      const response = await client.get('/api/search/articles', {
        query: { q: 'javascript' }, // lowercase
      })

      assert.api.isSuccess(response)

      const articles = response.data.items
      expect(articles.length).toBe(2)
    })

    it('should support fuzzy search', async () => {
      const response = await client.get('/api/search/articles', {
        query: { q: 'Javascrpt', fuzzy: 'true' }, // 拼写错误
      })

      assert.api.isSuccess(response)

      // 应该能找到相似的结果
      const articles = response.data.items
      expect(articles.length).toBeGreaterThan(0)
    })

    it('should filter by account', async () => {
      const account2 = testDb.createAccount({ userId, nickname: '账号2' })
      testDb.createArticle({
        userId,
        accountId: account2.id,
        title: 'JavaScript 测试',
      })

      const response = await client.get('/api/search/articles', {
        query: { q: 'JavaScript', accountId },
      })

      assert.api.isSuccess(response)

      const articles = response.data.items
      expect(articles.every((a: any) => a.accountId === accountId)).toBe(true)
    })

    it('should filter by date range', async () => {
      const response = await client.get('/api/search/articles', {
        query: {
          q: 'JavaScript',
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString(),
        },
      })

      assert.api.isSuccess(response)
    })

    it('should support pagination', async () => {
      const response = await client.get('/api/search/articles', {
        query: {
          q: 'JavaScript',
          page: 1,
          limit: 1,
        },
      })

      assert.api.isSuccess(response)
      assert.api.hasPagination(response)
      expect(response.data.items.length).toBeLessThanOrEqual(1)
      expect(response.data.total).toBeGreaterThanOrEqual(2)
    })

    it('should support sorting', async () => {
      const response = await client.get('/api/search/articles', {
        query: {
          q: 'JavaScript',
          sortBy: 'publishTime',
          sortOrder: 'desc',
        },
      })

      assert.api.isSuccess(response)

      const articles = response.data.items
      if (articles.length > 1) {
        expect(articles[0].publishTime).toBeGreaterThanOrEqual(articles[1].publishTime)
      }
    })

    it('should return empty results for no matches', async () => {
      const response = await client.get('/api/search/articles', {
        query: { q: 'NonExistentKeyword12345' },
      })

      assert.api.isSuccess(response)
      expect(response.data.items.length).toBe(0)
      expect(response.data.total).toBe(0)
    })

    it('should require search query', async () => {
      const response = await client.get('/api/search/articles')

      assert.api.isBadRequest(response)
      assert.api.hasErrorMessage(response, '搜索关键词')
    })

    it('should handle empty search query', async () => {
      const response = await client.get('/api/search/articles', {
        query: { q: '' },
      })

      assert.api.isBadRequest(response)
    })

    it('should limit search query length', async () => {
      const longQuery = 'a'.repeat(1001) // 超过最大长度

      const response = await client.get('/api/search/articles', {
        query: { q: longQuery },
      })

      assert.api.isBadRequest(response)
      assert.api.hasErrorMessage(response, '长度')
    })

    it('should require authentication', async () => {
      client.clearAuth()

      const response = await client.get('/api/search/articles', {
        query: { q: 'JavaScript' },
      })

      assert.api.isUnauthorized(response)
    })
  })

  describe('Search Filters', () => {
    it('should filter by favorite status', async () => {
      const article = testDb.createArticle({
        userId,
        accountId,
        title: 'Favorite Article',
        isFavorite: 1,
      })

      const response = await client.get('/api/search/articles', {
        query: { q: 'Article', isFavorite: 'true' },
      })

      assert.api.isSuccess(response)

      const articles = response.data.items
      expect(articles.every((a: any) => a.isFavorite === 1)).toBe(true)
    })

    it('should filter by has video', async () => {
      testDb.createArticle({
        userId,
        accountId,
        title: 'Video Article',
        hasVideo: 1,
      })

      const response = await client.get('/api/search/articles', {
        query: { q: 'Article', hasVideo: 'true' },
      })

      assert.api.isSuccess(response)

      const articles = response.data.items
      expect(articles.every((a: any) => a.hasVideo === 1)).toBe(true)
    })

    it('should combine multiple filters', async () => {
      const response = await client.get('/api/search/articles', {
        query: {
          q: 'JavaScript',
          accountId,
          isFavorite: 'false',
          sortBy: 'publishTime',
          sortOrder: 'desc',
        },
      })

      assert.api.isSuccess(response)
    })
  })

  describe('Search Highlighting', () => {
    it('should return highlighted search results', async () => {
      const response = await client.get('/api/search/articles', {
        query: { q: 'JavaScript', highlight: 'true' },
      })

      assert.api.isSuccess(response)

      const articles = response.data.items
      if (articles.length > 0) {
        expect(articles[0]).toHaveProperty('highlight')
      }
    })
  })

  describe('Search Suggestions', () => {
    it('should get search suggestions', async () => {
      const response = await client.get('/api/search/suggestions', {
        query: { q: 'Java' },
      })

      assert.api.isSuccess(response)
      assert.api.isArray(response)

      const suggestions = response.data
      expect(suggestions.length).toBeGreaterThan(0)
      expect(suggestions).toContain('JavaScript')
    })

    it('should limit number of suggestions', async () => {
      const response = await client.get('/api/search/suggestions', {
        query: { q: 'J', limit: 5 },
      })

      assert.api.isSuccess(response)
      expect(response.data.length).toBeLessThanOrEqual(5)
    })
  })

  describe('Search History', () => {
    it('should save search history', async () => {
      await client.get('/api/search/articles', {
        query: { q: 'JavaScript' },
      })

      const response = await client.get('/api/search/history')

      assert.api.isSuccess(response)
      assert.api.isArray(response)

      const history = response.data
      expect(history.some((h: any) => h.query === 'JavaScript')).toBe(true)
    })

    it('should limit search history size', async () => {
      // 执行多次搜索
      for (let i = 0; i < 15; i++) {
        await client.get('/api/search/articles', {
          query: { q: `search${i}` },
        })
      }

      const response = await client.get('/api/search/history')

      assert.api.isSuccess(response)
      expect(response.data.length).toBeLessThanOrEqual(10) // 假设最多保存 10 条
    })

    it('should delete search history', async () => {
      const response = await client.delete('/api/search/history')

      assert.api.isSuccess(response)

      const historyResponse = await client.get('/api/search/history')
      expect(historyResponse.data.length).toBe(0)
    })
  })

  describe('Performance Tests', () => {
    it('should search large dataset efficiently', async () => {
      // 创建 500 篇文章
      for (let i = 0; i < 500; i++) {
        testDb.createArticle({
          userId,
          accountId,
          title: i % 10 === 0 ? 'JavaScript Guide' : `Article ${i}`,
        })
      }

      await assert.perf.respondsWithin(async () => {
        await client.get('/api/search/articles', {
          query: { q: 'JavaScript' },
        })
      }, 500) // 应该在 500ms 内完成
    })

    it('should handle complex search query efficiently', async () => {
      await assert.perf.respondsWithin(async () => {
        await client.get('/api/search/articles', {
          query: {
            q: 'JavaScript React Vue',
            accountId,
            isFavorite: 'false',
            sortBy: 'publishTime',
            sortOrder: 'desc',
            page: 1,
            limit: 20,
          },
        })
      }, 1000)
    })
  })

  describe('Edge Cases', () => {
    it('should handle special characters in search', async () => {
      testDb.createArticle({
        userId,
        accountId,
        title: 'C++ & C# 编程',
      })

      const response = await client.get('/api/search/articles', {
        query: { q: 'C++' },
      })

      assert.api.isSuccess(response)
    })

    it('should handle Chinese search', async () => {
      const response = await client.get('/api/search/articles', {
        query: { q: '数据分析' },
      })

      assert.api.isSuccess(response)
      expect(response.data.items.length).toBeGreaterThan(0)
    })

    it('should handle mixed language search', async () => {
      const response = await client.get('/api/search/articles', {
        query: { q: 'JavaScript 教程' },
      })

      assert.api.isSuccess(response)
    })

    it('should handle search with numbers', async () => {
      testDb.createArticle({
        userId,
        accountId,
        title: 'ES6 新特性',
      })

      const response = await client.get('/api/search/articles', {
        query: { q: 'ES6' },
      })

      assert.api.isSuccess(response)
    })

    it('should handle very short search query', async () => {
      const response = await client.get('/api/search/articles', {
        query: { q: 'JS' },
      })

      assert.api.isSuccess(response)
    })
  })

  describe('Search Analytics', () => {
    it('should track popular searches', async () => {
      // 多次搜索相同关键词
      for (let i = 0; i < 5; i++) {
        await client.get('/api/search/articles', {
          query: { q: 'JavaScript' },
        })
      }

      const response = await client.get('/api/search/popular')

      assert.api.isSuccess(response)
      assert.api.isArray(response)

      const popular = response.data
      expect(popular.some((p: any) => p.query === 'JavaScript')).toBe(true)
    })
  })
})
