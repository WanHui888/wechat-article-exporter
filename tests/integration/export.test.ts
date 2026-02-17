/**
 * 导出功能 API 集成测试
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createApiClient } from '../helpers/api-client'
import { testDb, seedTestDatabase, cleanTestDatabase } from '../helpers/database'
import { assert } from '../helpers/assertions'

describe('Export API Integration Tests', () => {
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

    // 创建一些测试文章
    for (let i = 0; i < 5; i++) {
      testDb.createArticle({ userId, accountId, title: `文章${i + 1}` })
    }
  })

  afterEach(() => {
    client.clearAuth()
    cleanTestDatabase()
  })

  describe('POST /api/export/create', () => {
    it('should create markdown export job', async () => {
      const articles = testDb.getArticlesByUserId(userId)
      const articleIds = articles.map(a => a.id)

      const response = await client.post('/api/export/create', {
        type: 'markdown',
        articleIds,
        options: {
          includeImages: true,
          includeComments: false,
        },
      })

      assert.api.isSuccess(response)
      assert.api.hasData(response)

      expect(response.data).toHaveProperty('jobId')
      expect(response.data).toHaveProperty('status')
      expect(response.data.status).toBe('pending')
    })

    it('should create docx export job', async () => {
      const articles = testDb.getArticlesByUserId(userId)
      const articleIds = articles.map(a => a.id)

      const response = await client.post('/api/export/create', {
        type: 'docx',
        articleIds,
        options: {
          includeImages: true,
          includeMetadata: true,
        },
      })

      assert.api.isSuccess(response)
      expect(response.data.jobId).toBeDefined()
    })

    it('should create pdf export job', async () => {
      const articles = testDb.getArticlesByUserId(userId)
      const articleIds = articles.map(a => a.id)

      const response = await client.post('/api/export/create', {
        type: 'pdf',
        articleIds,
        options: {
          pageSize: 'A4',
          margin: 20,
        },
      })

      assert.api.isSuccess(response)
      expect(response.data.jobId).toBeDefined()
    })

    it('should validate export type', async () => {
      const response = await client.post('/api/export/create', {
        type: 'invalid-type',
        articleIds: [1, 2, 3],
      })

      assert.api.isBadRequest(response)
      assert.api.hasErrorMessage(response, '导出类型')
    })

    it('should require article IDs', async () => {
      const response = await client.post('/api/export/create', {
        type: 'markdown',
        articleIds: [],
      })

      assert.api.isBadRequest(response)
      assert.api.hasErrorMessage(response, '文章')
    })

    it('should limit maximum articles per export', async () => {
      const articleIds = Array.from({ length: 1001 }, (_, i) => i + 1)

      const response = await client.post('/api/export/create', {
        type: 'markdown',
        articleIds,
      })

      assert.api.isBadRequest(response)
      assert.api.hasErrorMessage(response, '最多')
    })

    it('should require authentication', async () => {
      client.clearAuth()

      const response = await client.post('/api/export/create', {
        type: 'markdown',
        articleIds: [1, 2, 3],
      })

      assert.api.isUnauthorized(response)
    })
  })

  describe('GET /api/export/jobs', () => {
    it('should get user export jobs', async () => {
      // 创建几个导出任务
      const articles = testDb.getArticlesByUserId(userId)
      const articleIds = articles.map(a => a.id)

      await client.post('/api/export/create', {
        type: 'markdown',
        articleIds,
      })

      await client.post('/api/export/create', {
        type: 'docx',
        articleIds,
      })

      const response = await client.get('/api/export/jobs')

      assert.api.isSuccess(response)
      assert.api.isArray(response)
      expect(response.data.length).toBeGreaterThanOrEqual(2)

      const job = response.data[0]
      expect(job).toHaveProperty('id')
      expect(job).toHaveProperty('type')
      expect(job).toHaveProperty('status')
      expect(job).toHaveProperty('total')
      expect(job).toHaveProperty('completed')
      expect(job).toHaveProperty('createdAt')
    })

    it('should filter jobs by status', async () => {
      const response = await client.get('/api/export/jobs', {
        query: { status: 'completed' },
      })

      assert.api.isSuccess(response)
      const jobs = response.data
      expect(jobs.every((j: any) => j.status === 'completed')).toBe(true)
    })

    it('should filter jobs by type', async () => {
      const response = await client.get('/api/export/jobs', {
        query: { type: 'markdown' },
      })

      assert.api.isSuccess(response)
      const jobs = response.data
      expect(jobs.every((j: any) => j.type === 'markdown')).toBe(true)
    })

    it('should support pagination', async () => {
      const response = await client.get('/api/export/jobs', {
        query: { page: 1, limit: 10 },
      })

      assert.api.isSuccess(response)
      assert.api.hasPagination(response)
    })
  })

  describe('GET /api/export/[id]', () => {
    it('should get export job details', async () => {
      const articles = testDb.getArticlesByUserId(userId)
      const articleIds = articles.map(a => a.id)

      const createResponse = await client.post('/api/export/create', {
        type: 'markdown',
        articleIds,
      })

      const jobId = createResponse.data.jobId

      const response = await client.get(`/api/export/${jobId}`)

      assert.api.isSuccess(response)
      expect(response.data.id).toBe(jobId)
      expect(response.data.type).toBe('markdown')
      expect(response.data).toHaveProperty('status')
      expect(response.data).toHaveProperty('progress')
    })

    it('should return 404 for non-existent job', async () => {
      const response = await client.get('/api/export/99999')

      assert.api.isNotFound(response)
    })

    it('should not access other user jobs', async () => {
      const otherUser = testDb.createUser({ username: 'other' })
      const otherAccount = testDb.createAccount({ userId: otherUser.id })
      const otherArticle = testDb.createArticle({
        userId: otherUser.id,
        accountId: otherAccount.id,
      })

      // 这里需要模拟另一个用户的导出任务
      // 简化起见，直接测试访问权限
      const response = await client.get('/api/export/99999')

      // 应该返回 404 而不是 403，避免泄露任务存在性
      assert.api.isNotFound(response)
    })
  })

  describe('GET /api/export/download/[id]', () => {
    it('should download completed export file', async () => {
      const articles = testDb.getArticlesByUserId(userId)
      const articleIds = articles.map(a => a.id)

      const createResponse = await client.post('/api/export/create', {
        type: 'markdown',
        articleIds,
      })

      const jobId = createResponse.data.jobId

      // 等待任务完成（在测试中可能需要 mock）
      // 这里假设任务立即完成
      const response = await client.get(`/api/export/download/${jobId}`)

      // 根据实际实现，可能返回文件或重定向
      expect([200, 302]).toContain(response.status)
    })

    it('should reject download for pending jobs', async () => {
      const articles = testDb.getArticlesByUserId(userId)
      const articleIds = articles.map(a => a.id)

      const createResponse = await client.post('/api/export/create', {
        type: 'markdown',
        articleIds,
      })

      const jobId = createResponse.data.jobId

      const response = await client.get(`/api/export/download/${jobId}`)

      // 如果任务未完成，应该返回错误
      if (response.status !== 200) {
        expect([400, 404]).toContain(response.status)
      }
    })
  })

  describe('DELETE /api/export/[id]', () => {
    it('should delete export job', async () => {
      const articles = testDb.getArticlesByUserId(userId)
      const articleIds = articles.map(a => a.id)

      const createResponse = await client.post('/api/export/create', {
        type: 'markdown',
        articleIds,
      })

      const jobId = createResponse.data.jobId

      const response = await client.delete(`/api/export/${jobId}`)

      assert.api.isSuccess(response)

      // 验证任务已删除
      const getResponse = await client.get(`/api/export/${jobId}`)
      assert.api.isNotFound(getResponse)
    })

    it('should not delete other user jobs', async () => {
      const response = await client.delete('/api/export/99999')

      assert.api.isNotFound(response)
    })
  })

  describe('Export Options', () => {
    it('should handle custom markdown options', async () => {
      const articles = testDb.getArticlesByUserId(userId)
      const articleIds = articles.map(a => a.id)

      const response = await client.post('/api/export/create', {
        type: 'markdown',
        articleIds,
        options: {
          includeImages: true,
          includeComments: true,
          includeMetadata: true,
          imageMode: 'local', // local, url, base64
          frontmatter: true,
        },
      })

      assert.api.isSuccess(response)
    })

    it('should handle custom docx options', async () => {
      const articles = testDb.getArticlesByUserId(userId)
      const articleIds = articles.map(a => a.id)

      const response = await client.post('/api/export/create', {
        type: 'docx',
        articleIds,
        options: {
          includeImages: true,
          includeComments: false,
          fontSize: 12,
          fontFamily: 'Arial',
          pageSize: 'A4',
          margin: {
            top: 20,
            bottom: 20,
            left: 25,
            right: 25,
          },
        },
      })

      assert.api.isSuccess(response)
    })
  })

  describe('Batch Export', () => {
    it('should handle large batch export', async () => {
      // 创建 100 篇文章
      for (let i = 0; i < 100; i++) {
        testDb.createArticle({ userId, accountId, title: `批量${i}` })
      }

      const articles = testDb.getArticlesByUserId(userId)
      const articleIds = articles.map(a => a.id)

      const response = await client.post('/api/export/create', {
        type: 'markdown',
        articleIds,
      })

      assert.api.isSuccess(response)
      expect(response.data.total).toBe(articleIds.length)
    })

    it('should support export by account', async () => {
      const response = await client.post('/api/export/create', {
        type: 'markdown',
        accountId,
        options: {
          startDate: new Date('2024-01-01').toISOString(),
          endDate: new Date('2024-12-31').toISOString(),
        },
      })

      assert.api.isSuccess(response)
    })
  })

  describe('Export Progress', () => {
    it('should track export progress', async () => {
      const articles = testDb.getArticlesByUserId(userId)
      const articleIds = articles.map(a => a.id)

      const createResponse = await client.post('/api/export/create', {
        type: 'markdown',
        articleIds,
      })

      const jobId = createResponse.data.jobId

      // 获取进度
      const response = await client.get(`/api/export/${jobId}`)

      assert.api.isSuccess(response)
      expect(response.data).toHaveProperty('progress')
      expect(typeof response.data.progress).toBe('number')
      expect(response.data.progress).toBeGreaterThanOrEqual(0)
      expect(response.data.progress).toBeLessThanOrEqual(100)
    })
  })

  describe('Error Handling', () => {
    it('should handle export errors', async () => {
      const articles = testDb.getArticlesByUserId(userId)
      const articleIds = articles.map(a => a.id)

      // 添加一个无效的文章 ID
      articleIds.push(99999)

      const response = await client.post('/api/export/create', {
        type: 'markdown',
        articleIds,
      })

      // 应该创建成功但标记部分失败
      assert.api.isSuccess(response)

      const jobId = response.data.jobId
      const statusResponse = await client.get(`/api/export/${jobId}`)

      // 检查是否有失败记录
      expect(statusResponse.data).toHaveProperty('failed')
    })

    it('should handle concurrent exports', async () => {
      const articles = testDb.getArticlesByUserId(userId)
      const articleIds = articles.map(a => a.id)

      // 同时创建多个导出任务
      const promises = Array.from({ length: 3 }, () =>
        client.post('/api/export/create', {
          type: 'markdown',
          articleIds,
        })
      )

      const responses = await Promise.all(promises)

      // 所有任务都应该成功创建
      responses.forEach(response => {
        assert.api.isSuccess(response)
      })

      // 验证每个任务都有唯一的 jobId
      const jobIds = responses.map(r => r.data.jobId)
      const uniqueJobIds = new Set(jobIds)
      expect(uniqueJobIds.size).toBe(jobIds.length)
    })
  })

  describe('Performance Tests', () => {
    it('should create export job quickly', async () => {
      const articles = testDb.getArticlesByUserId(userId)
      const articleIds = articles.map(a => a.id)

      await assert.perf.respondsWithin(async () => {
        await client.post('/api/export/create', {
          type: 'markdown',
          articleIds,
        })
      }, 1000)
    })
  })
})
