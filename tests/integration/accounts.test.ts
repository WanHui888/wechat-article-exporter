/**
 * 账号管理 API 集成测试
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createApiClient } from '../helpers/api-client'
import { testDb, seedTestDatabase, cleanTestDatabase } from '../helpers/database'
import { TestDataBuilder } from '../helpers/fixtures'
import { assert } from '../helpers/assertions'

describe('Accounts API Integration Tests', () => {
  const client = createApiClient()
  let userToken: string
  let userId: number

  beforeEach(async () => {
    // 清理并初始化测试数据库
    cleanTestDatabase()
    const { normalUser } = await seedTestDatabase()
    userId = normalUser.id

    // 模拟用户登录获取 token（实际应该调用真实的登录 API）
    userToken = 'fake-jwt-token-for-testing'
    client.setAuth(userToken)
  })

  afterEach(() => {
    client.clearAuth()
    cleanTestDatabase()
  })

  describe('GET /api/data/accounts', () => {
    it('should get user accounts', async () => {
      // 准备：创建一些测试账号
      testDb.createAccount({ userId, nickname: '公众号1' })
      testDb.createAccount({ userId, nickname: '公众号2' })

      // 执行：获取账号列表
      const response = await client.get('/api/data/accounts')

      // 断言
      assert.api.isSuccess(response)
      assert.api.isArray(response)
      assert.api.hasMinLength(response, 2)

      // 验证数据结构
      const account = response.data[0]
      assert.data.isValidAccount(account)
    })

    it('should return empty array when user has no accounts', async () => {
      const response = await client.get('/api/data/accounts')

      assert.api.isSuccess(response)
      assert.api.isArray(response)
      assert.api.hasLength(response, 0)
    })

    it('should require authentication', async () => {
      client.clearAuth()

      const response = await client.get('/api/data/accounts')

      assert.api.isUnauthorized(response)
    })
  })

  describe('POST /api/data/accounts', () => {
    it('should create new account', async () => {
      const accountData = TestDataBuilder.account({
        nickname: '新公众号',
        fakeid: 'new-fakeid-123',
      })

      const response = await client.post('/api/data/accounts', accountData)

      assert.api.isSuccess(response)
      assert.api.hasData(response)

      // 验证创建的账号
      const createdAccount = response.data
      expect(createdAccount.nickname).toBe('新公众号')
      expect(createdAccount.fakeid).toBe('new-fakeid-123')
      assert.data.isValidAccount(createdAccount)
    })

    it('should reject duplicate fakeid', async () => {
      // 先创建一个账号
      const existing = testDb.createAccount({ userId, fakeid: 'duplicate-id' })

      // 尝试创建相同 fakeid 的账号
      const accountData = TestDataBuilder.account({
        fakeid: 'duplicate-id',
      })

      const response = await client.post('/api/data/accounts', accountData)

      assert.api.isError(response)
      assert.api.hasStatus(response, 409) // Conflict
    })

    it('should validate required fields', async () => {
      const invalidData = { nickname: '公众号' } // 缺少 fakeid

      const response = await client.post('/api/data/accounts', invalidData)

      assert.api.isBadRequest(response)
      assert.api.hasErrorMessage(response, 'required')
    })
  })

  describe('DELETE /api/data/accounts', () => {
    it('should delete account', async () => {
      const account = testDb.createAccount({ userId, nickname: '待删除' })

      const response = await client.delete(`/api/data/accounts?id=${account.id}`)

      assert.api.isSuccess(response)

      // 验证账号已删除
      const deletedAccount = testDb.getAccount(account.id)
      expect(deletedAccount).toBeUndefined()
    })

    it('should not delete other user account', async () => {
      // 创建另一个用户的账号
      const otherUser = testDb.createUser({ username: 'otheruser' })
      const otherAccount = testDb.createAccount({ userId: otherUser.id })

      const response = await client.delete(`/api/data/accounts?id=${otherAccount.id}`)

      assert.api.isForbidden(response)
    })

    it('should return 404 for non-existent account', async () => {
      const response = await client.delete('/api/data/accounts?id=99999')

      assert.api.isNotFound(response)
    })
  })

  describe('POST /api/data/accounts-sync', () => {
    it('should sync account articles', async () => {
      const account = testDb.createAccount({ userId })

      const response = await client.post('/api/data/accounts-sync', {
        accountId: account.id,
        startDate: new Date('2024-01-01').toISOString(),
        endDate: new Date('2024-12-31').toISOString(),
      })

      assert.api.isSuccess(response)
      assert.api.hasData(response)

      // 验证同步结果
      expect(response.data).toHaveProperty('total')
      expect(response.data).toHaveProperty('synced')
      expect(typeof response.data.total).toBe('number')
      expect(typeof response.data.synced).toBe('number')
    })

    it('should require valid date range', async () => {
      const account = testDb.createAccount({ userId })

      const response = await client.post('/api/data/accounts-sync', {
        accountId: account.id,
        startDate: '2024-12-31',
        endDate: '2024-01-01', // 结束日期早于开始日期
      })

      assert.api.isBadRequest(response)
    })
  })

  describe('POST /api/data/accounts-import', () => {
    it('should import accounts from JSON', async () => {
      const importData = {
        accounts: [
          TestDataBuilder.account({ nickname: '导入1' }),
          TestDataBuilder.account({ nickname: '导入2' }),
        ],
      }

      const response = await client.post('/api/data/accounts-import', importData)

      assert.api.isSuccess(response)
      assert.api.hasData(response)

      // 验证导入结果
      expect(response.data.imported).toBe(2)
      expect(response.data.failed).toBe(0)

      // 验证账号已创建
      const accounts = testDb.getAccountsByUserId(userId)
      expect(accounts.length).toBeGreaterThanOrEqual(2)
    })

    it('should skip invalid accounts', async () => {
      const importData = {
        accounts: [
          TestDataBuilder.account({ nickname: '有效账号' }),
          { nickname: '无效账号' }, // 缺少必需字段
        ],
      }

      const response = await client.post('/api/data/accounts-import', importData)

      assert.api.isSuccess(response)
      expect(response.data.imported).toBe(1)
      expect(response.data.failed).toBe(1)
    })
  })

  describe('Performance Tests', () => {
    it('should handle bulk account creation efficiently', async () => {
      const accounts = TestDataBuilder.batch(
        () => TestDataBuilder.account(),
        50
      )

      await assert.perf.respondsWithin(async () => {
        for (const account of accounts) {
          testDb.createAccount({ ...account, userId })
        }
      }, 1000) // 应该在 1 秒内完成
    })

    it('should paginate large account lists', async () => {
      // 创建 100 个账号
      for (let i = 0; i < 100; i++) {
        testDb.createAccount({ userId, nickname: `账号${i}` })
      }

      const response = await client.get('/api/data/accounts', {
        query: { page: 1, limit: 20 },
      })

      assert.api.isSuccess(response)
      assert.api.hasPagination(response)
      expect(response.data.items.length).toBeLessThanOrEqual(20)
      expect(response.data.total).toBe(100)
    })
  })
})
