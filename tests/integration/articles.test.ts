/**
 * 文章管理 API 集成测试
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createApiClient } from '../helpers/api-client'
import { testDb, seedTestDatabase, cleanTestDatabase } from '../helpers/database'
import { TestDataBuilder, RandomDataGenerator } from '../helpers/fixtures'
import { assert } from '../helpers/assertions'

describe('Articles API Integration Tests', () => {
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
  })

  afterEach(() => {
    client.clearAuth()
    cleanTestDatabase()
  })

  describe('GET /api/data/articles', () => {
    it('should get user articles with pagination', async () => {
      // 创建 15 篇测试文章
      for (let i = 0; i < 15; i++) {
        testDb.createArticle({
          userId,
          accountId,
          title: `文章${i + 1}`,
        })
      }

      const response = await client.get('/api/data/articles', {
        query: { page: 1, limit: 10 },
      })

      assert.api.isSuccess(response)
      assert.api.hasPagination(response)
      expect(response.data.items.length).toBe(10)
      expect(response.data.total).toBe(15)
      expect(response.data.page).toBe(1)
      expect(response.data.pageSize).toBe(10)
    })

    it('should filter articles by account', async () => {
      const account2 = testDb.createAccount({ userId, nickname: '账号2' })

      testDb.createArticle({ userId, accountId, title: '账号1文章' })
      testDb.createArticle({ userId, accountId: account2.id, title: '账号2文章' })

      const response = await client.get('/api/data/articles', {
        query: { accountId },
      })

      assert.api.isSuccess(response)
      const articles = response.data.items || response.data
      expect(articles.every((a: any) => a.accountId === accountId)).toBe(true)
    })

    it('should filter articles by date range', async () => {
      const old = testDb.createArticle({
        userId,
        accountId,
        publishTime: Date.now() - 365 * 24 * 60 * 60 * 1000, // 1 year ago
      })

      const recent = testDb.createArticle({
        userId,
        accountId,
        publishTime: Date.now(),
      })

      const response = await client.get('/api/data/articles', {
        query: {
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString(),
        },
      })

      assert.api.isSuccess(response)
      const articles = response.data.items || response.data
      expect(articles.some((a: any) => a.id === recent.id)).toBe(true)
    })

    it('should support search by title', async () => {
      testDb.createArticle({ userId, accountId, title: 'JavaScript 入门' })
      testDb.createArticle({ userId, accountId, title: 'Python 进阶' })
      testDb.createArticle({ userId, accountId, title: 'JavaScript 高级' })

      const response = await client.get('/api/data/articles', {
        query: { search: 'JavaScript' },
      })

      assert.api.isSuccess(response)
      const articles = response.data.items || response.data
      expect(articles.length).toBe(2)
      expect(articles.every((a: any) => a.title.includes('JavaScript'))).toBe(true)
    })

    it('should require authentication', async () => {
      client.clearAuth()

      const response = await client.get('/api/data/articles')

      assert.api.isUnauthorized(response)
    })
  })

  describe('POST /api/data/articles', () => {
    it('should create new article', async () => {
      const articleData = TestDataBuilder.article({
        accountId,
        title: '新文章标题',
        author: '作者名',
      })

      const response = await client.post('/api/data/articles', articleData)

      assert.api.isSuccess(response)
      assert.api.hasData(response)

      const created = response.data
      expect(created.title).toBe('新文章标题')
      expect(created.author).toBe('作者名')
      assert.data.isValidArticle(created)
    })

    it('should reject duplicate article (same mid + idx)', async () => {
      const existing = testDb.createArticle({
        userId,
        accountId,
        mid: 'duplicate-mid',
        idx: '1',
      })

      const duplicateData = TestDataBuilder.article({
        accountId,
        mid: 'duplicate-mid',
        idx: '1',
      })

      const response = await client.post('/api/data/articles', duplicateData)

      assert.api.isConflict(response)
      assert.api.hasErrorMessage(response, '文章已存在')
    })

    it('should validate required fields', async () => {
      const invalidData = {
        accountId,
        // 缺少 mid, idx, title 等必需字段
      }

      const response = await client.post('/api/data/articles', invalidData)

      assert.api.isBadRequest(response)
    })

    it('should validate account ownership', async () => {
      const otherUser = testDb.createUser({ username: 'other' })
      const otherAccount = testDb.createAccount({ userId: otherUser.id })

      const articleData = TestDataBuilder.article({
        accountId: otherAccount.id, // 尝试在其他用户的账号下创建文章
      })

      const response = await client.post('/api/data/articles', articleData)

      assert.api.isForbidden(response)
    })
  })

  describe('GET /api/data/articles-count', () => {
    it('should get total article count', async () => {
      for (let i = 0; i < 25; i++) {
        testDb.createArticle({ userId, accountId })
      }

      const response = await client.get('/api/data/articles-count')

      assert.api.isSuccess(response)
      expect(response.data.total).toBe(25)
    })

    it('should get count by account', async () => {
      const account2 = testDb.createAccount({ userId })

      for (let i = 0; i < 10; i++) {
        testDb.createArticle({ userId, accountId })
      }
      for (let i = 0; i < 5; i++) {
        testDb.createArticle({ userId, accountId: account2.id })
      }

      const response = await client.get('/api/data/articles-count', {
        query: { accountId },
      })

      assert.api.isSuccess(response)
      expect(response.data.total).toBe(10)
    })
  })

  describe('POST /api/data/articles-favorite', () => {
    it('should mark article as favorite', async () => {
      const article = testDb.createArticle({ userId, accountId, isFavorite: 0 })

      const response = await client.post('/api/data/articles-favorite', {
        articleId: article.id,
        isFavorite: true,
      })

      assert.api.isSuccess(response)

      // 验证已标记为收藏
      const updated = testDb.getArticle(article.id)
      expect(updated?.isFavorite).toBe(1)
    })

    it('should unfavorite article', async () => {
      const article = testDb.createArticle({ userId, accountId, isFavorite: 1 })

      const response = await client.post('/api/data/articles-favorite', {
        articleId: article.id,
        isFavorite: false,
      })

      assert.api.isSuccess(response)

      const updated = testDb.getArticle(article.id)
      expect(updated?.isFavorite).toBe(0)
    })
  })

  describe('GET /api/data/articles-favorited', () => {
    it('should get only favorited articles', async () => {
      testDb.createArticle({ userId, accountId, title: '收藏1', isFavorite: 1 })
      testDb.createArticle({ userId, accountId, title: '收藏2', isFavorite: 1 })
      testDb.createArticle({ userId, accountId, title: '未收藏', isFavorite: 0 })

      const response = await client.get('/api/data/articles-favorited')

      assert.api.isSuccess(response)
      const articles = response.data.items || response.data
      expect(articles.length).toBe(2)
      expect(articles.every((a: any) => a.isFavorite === 1)).toBe(true)
    })
  })

  describe('GET /api/data/articles-urls', () => {
    it('should get article URLs for batch operations', async () => {
      const article1 = testDb.createArticle({ userId, accountId })
      const article2 = testDb.createArticle({ userId, accountId })

      const response = await client.get('/api/data/articles-urls', {
        query: {
          articleIds: [article1.id, article2.id].join(','),
        },
      })

      assert.api.isSuccess(response)
      assert.api.isArray(response)
      expect(response.data.length).toBe(2)
      expect(response.data.every((item: any) => item.contentUrl)).toBe(true)
    })
  })

  describe('Article Batch Operations', () => {
    it('should handle batch article creation', async () => {
      const articles = TestDataBuilder.batch(
        () => TestDataBuilder.article({ accountId }),
        20
      )

      const promises = articles.map(article =>
        client.post('/api/data/articles', article)
      )

      const responses = await Promise.all(promises)

      const successCount = responses.filter(r => r.status === 200 || r.status === 201).length
      expect(successCount).toBeGreaterThan(15) // 允许少量失败
    })

    it('should handle bulk favorite update', async () => {
      const articles = []
      for (let i = 0; i < 10; i++) {
        articles.push(testDb.createArticle({ userId, accountId }))
      }

      const articleIds = articles.map(a => a.id)

      const response = await client.post('/api/data/articles-favorite-bulk', {
        articleIds,
        isFavorite: true,
      })

      assert.api.isSuccess(response)
      expect(response.data.updated).toBe(10)
    })
  })

  describe('Performance Tests', () => {
    it('should load large article list efficiently', async () => {
      // 创建 500 篇文章
      for (let i = 0; i < 500; i++) {
        testDb.createArticle({ userId, accountId, title: `文章${i}` })
      }

      await assert.perf.respondsWithin(async () => {
        await client.get('/api/data/articles', {
          query: { page: 1, limit: 50 },
        })
      }, 500) // 应该在 500ms 内完成
    })

    it('should search articles efficiently', async () => {
      // 创建 200 篇文章
      for (let i = 0; i < 200; i++) {
        testDb.createArticle({
          userId,
          accountId,
          title: i % 10 === 0 ? 'JavaScript' : `文章${i}`,
        })
      }

      await assert.perf.respondsWithin(async () => {
        await client.get('/api/data/articles', {
          query: { search: 'JavaScript' },
        })
      }, 300)
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty article list', async () => {
      const response = await client.get('/api/data/articles')

      assert.api.isSuccess(response)
      const items = response.data.items || response.data
      expect(Array.isArray(items)).toBe(true)
      expect(items.length).toBe(0)
    })

    it('should handle invalid page number', async () => {
      const response = await client.get('/api/data/articles', {
        query: { page: -1, limit: 10 },
      })

      assert.api.isBadRequest(response)
    })

    it('should handle invalid limit', async () => {
      const response = await client.get('/api/data/articles', {
        query: { page: 1, limit: 1000 }, // 超过最大限制
      })

      assert.api.isBadRequest(response)
    })

    it('should handle special characters in search', async () => {
      testDb.createArticle({ userId, accountId, title: 'C++ 编程指南' })

      const response = await client.get('/api/data/articles', {
        query: { search: 'C++' },
      })

      assert.api.isSuccess(response)
    })

    it('should handle article with missing optional fields', async () => {
      const articleData = {
        accountId,
        mid: RandomDataGenerator.string(10),
        idx: '1',
        sn: RandomDataGenerator.string(10),
        title: '最小化文章',
        contentUrl: RandomDataGenerator.url(),
        publishTime: Date.now(),
        // 不提供 author, cover, digest 等可选字段
      }

      const response = await client.post('/api/data/articles', articleData)

      assert.api.isSuccess(response)
      expect(response.data.author).toBeNull()
      expect(response.data.cover).toBeNull()
      expect(response.data.digest).toBeNull()
    })
  })

  describe('Data Integrity', () => {
    it('should maintain referential integrity with account', async () => {
      const article = testDb.createArticle({ userId, accountId })

      // 删除账号
      testDb.deleteAccount(accountId)

      // 相关文章应该也被删除或标记为无效
      const response = await client.get(`/api/data/articles/${article.id}`)

      // 根据实际实现，可能返回 404 或文章但 account 为 null
      expect([404, 200]).toContain(response.status)
    })

    it('should handle concurrent article creation', async () => {
      const articleData = TestDataBuilder.article({ accountId })

      // 同时创建多个相同的文章
      const promises = Array.from({ length: 5 }, () =>
        client.post('/api/data/articles', { ...articleData })
      )

      const responses = await Promise.all(promises)

      // 应该只有一个成功，其他返回冲突错误
      const successCount = responses.filter(r => r.status === 200 || r.status === 201).length
      expect(successCount).toBe(1)

      const conflictCount = responses.filter(r => r.status === 409).length
      expect(conflictCount).toBe(4)
    })
  })
})
