/**
 * 管理员 API 集成测试
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createApiClient } from '../helpers/api-client'
import { testDb, seedTestDatabase, cleanTestDatabase } from '../helpers/database'
import { TestDataBuilder } from '../helpers/fixtures'
import { assert } from '../helpers/assertions'

describe('Admin API Integration Tests', () => {
  const client = createApiClient()
  let adminToken: string
  let userToken: string
  let adminId: number
  let userId: number

  beforeEach(async () => {
    cleanTestDatabase()
    const { adminUser, normalUser } = await seedTestDatabase()
    adminId = adminUser.id
    userId = normalUser.id

    adminToken = 'fake-admin-jwt-token'
    userToken = 'fake-user-jwt-token'
  })

  afterEach(() => {
    client.clearAuth()
    cleanTestDatabase()
  })

  describe('GET /api/admin/users', () => {
    it('should get all users as admin', async () => {
      client.setAuth(adminToken)

      const response = await client.get('/api/admin/users')

      assert.api.isSuccess(response)
      assert.api.hasPagination(response)

      const users = response.data.items || response.data
      expect(users.length).toBeGreaterThan(0)

      users.forEach((user: any) => {
        assert.data.isValidUser(user)
      })
    })

    it('should filter users by role', async () => {
      client.setAuth(adminToken)

      // 创建更多测试用户
      testDb.createUser({ username: 'user1', role: 'user' })
      testDb.createUser({ username: 'user2', role: 'user' })
      testDb.createUser({ username: 'admin2', role: 'admin' })

      const response = await client.get('/api/admin/users', {
        query: { role: 'user' },
      })

      assert.api.isSuccess(response)
      const users = response.data.items || response.data
      expect(users.every((u: any) => u.role === 'user')).toBe(true)
    })

    it('should filter users by status', async () => {
      client.setAuth(adminToken)

      testDb.createUser({ username: 'active1', status: 'active' })
      testDb.createUser({ username: 'disabled1', status: 'disabled' })

      const response = await client.get('/api/admin/users', {
        query: { status: 'active' },
      })

      assert.api.isSuccess(response)
      const users = response.data.items || response.data
      expect(users.every((u: any) => u.status === 'active')).toBe(true)
    })

    it('should search users by username', async () => {
      client.setAuth(adminToken)

      testDb.createUser({ username: 'john_doe' })
      testDb.createUser({ username: 'jane_smith' })

      const response = await client.get('/api/admin/users', {
        query: { search: 'john' },
      })

      assert.api.isSuccess(response)
      const users = response.data.items || response.data
      expect(users.some((u: any) => u.username.includes('john'))).toBe(true)
    })

    it('should reject non-admin users', async () => {
      client.setAuth(userToken)

      const response = await client.get('/api/admin/users')

      assert.api.isForbidden(response)
      assert.api.hasErrorMessage(response, '权限不足')
    })

    it('should reject unauthenticated requests', async () => {
      client.clearAuth()

      const response = await client.get('/api/admin/users')

      assert.api.isUnauthorized(response)
    })
  })

  describe('PUT /api/admin/users/status', () => {
    it('should enable/disable user account', async () => {
      client.setAuth(adminToken)

      const user = testDb.createUser({ username: 'test', status: 'active' })

      // 禁用用户
      const response1 = await client.put('/api/admin/users/status', {
        userId: user.id,
        status: 'disabled',
      })

      assert.api.isSuccess(response1)
      expect(testDb.getUser(user.id)?.status).toBe('disabled')

      // 启用用户
      const response2 = await client.put('/api/admin/users/status', {
        userId: user.id,
        status: 'active',
      })

      assert.api.isSuccess(response2)
      expect(testDb.getUser(user.id)?.status).toBe('active')
    })

    it('should not allow disabling admin accounts', async () => {
      client.setAuth(adminToken)

      const response = await client.put('/api/admin/users/status', {
        userId: adminId,
        status: 'disabled',
      })

      assert.api.isBadRequest(response)
      assert.api.hasErrorMessage(response, '不能禁用管理员')
    })

    it('should require admin role', async () => {
      client.setAuth(userToken)

      const response = await client.put('/api/admin/users/status', {
        userId: userId,
        status: 'disabled',
      })

      assert.api.isForbidden(response)
    })
  })

  describe('PUT /api/admin/users/role', () => {
    it('should change user role', async () => {
      client.setAuth(adminToken)

      const user = testDb.createUser({ username: 'test', role: 'user' })

      const response = await client.put('/api/admin/users/role', {
        userId: user.id,
        role: 'admin',
      })

      assert.api.isSuccess(response)
      expect(testDb.getUser(user.id)?.role).toBe('admin')
    })

    it('should validate role value', async () => {
      client.setAuth(adminToken)

      const user = testDb.createUser({ username: 'test' })

      const response = await client.put('/api/admin/users/role', {
        userId: user.id,
        role: 'invalid-role',
      })

      assert.api.isBadRequest(response)
    })

    it('should not allow changing own role', async () => {
      client.setAuth(adminToken)

      const response = await client.put('/api/admin/users/role', {
        userId: adminId,
        role: 'user',
      })

      assert.api.isBadRequest(response)
      assert.api.hasErrorMessage(response, '不能修改自己的角色')
    })
  })

  describe('POST /api/admin/users/reset-password', () => {
    it('should reset user password', async () => {
      client.setAuth(adminToken)

      const user = testDb.createUser({ username: 'test' })

      const response = await client.post('/api/admin/users/reset-password', {
        userId: user.id,
        newPassword: 'NewPassword123!',
      })

      assert.api.isSuccess(response)
      expect(response.data).toHaveProperty('message')
    })

    it('should validate password strength', async () => {
      client.setAuth(adminToken)

      const user = testDb.createUser({ username: 'test' })

      const response = await client.post('/api/admin/users/reset-password', {
        userId: user.id,
        newPassword: '123', // 太短
      })

      assert.api.isBadRequest(response)
      assert.api.hasErrorMessage(response, '密码长度')
    })
  })

  describe('POST /api/admin/users/delete', () => {
    it('should delete user account', async () => {
      client.setAuth(adminToken)

      const user = testDb.createUser({ username: 'to-delete' })

      const response = await client.post('/api/admin/users/delete', {
        userId: user.id,
      })

      assert.api.isSuccess(response)
      expect(testDb.getUser(user.id)).toBeUndefined()
    })

    it('should not allow deleting admin accounts', async () => {
      client.setAuth(adminToken)

      const response = await client.post('/api/admin/users/delete', {
        userId: adminId,
      })

      assert.api.isBadRequest(response)
      assert.api.hasErrorMessage(response, '不能删除管理员')
    })

    it('should cascade delete user data', async () => {
      client.setAuth(adminToken)

      const user = testDb.createUser({ username: 'cascade-test' })
      const account = testDb.createAccount({ userId: user.id })
      const article = testDb.createArticle({ userId: user.id, accountId: account.id })

      const response = await client.post('/api/admin/users/delete', {
        userId: user.id,
      })

      assert.api.isSuccess(response)

      // 验证相关数据已删除
      expect(testDb.getUser(user.id)).toBeUndefined()
      expect(testDb.getAccount(account.id)).toBeUndefined()
      expect(testDb.getArticle(article.id)).toBeUndefined()
    })
  })

  describe('GET /api/admin/monitor', () => {
    it('should get system statistics', async () => {
      client.setAuth(adminToken)

      const response = await client.get('/api/admin/monitor')

      assert.api.isSuccess(response)
      assert.api.hasFields(response, [
        'users',
        'accounts',
        'articles',
        'storage',
        'system',
      ])

      expect(typeof response.data.users.total).toBe('number')
      expect(typeof response.data.accounts.total).toBe('number')
      expect(typeof response.data.articles.total).toBe('number')
    })

    it('should include active user count', async () => {
      client.setAuth(adminToken)

      testDb.createUser({ username: 'active1', status: 'active' })
      testDb.createUser({ username: 'active2', status: 'active' })
      testDb.createUser({ username: 'disabled1', status: 'disabled' })

      const response = await client.get('/api/admin/monitor')

      assert.api.isSuccess(response)
      expect(response.data.users.active).toBeGreaterThan(0)
    })

    it('should require admin role', async () => {
      client.setAuth(userToken)

      const response = await client.get('/api/admin/monitor')

      assert.api.isForbidden(response)
    })
  })

  describe('GET /api/admin/tasks', () => {
    it('should get scheduled tasks status', async () => {
      client.setAuth(adminToken)

      const response = await client.get('/api/admin/tasks')

      assert.api.isSuccess(response)
      assert.api.isArray(response)

      if (response.data.length > 0) {
        const task = response.data[0]
        expect(task).toHaveProperty('name')
        expect(task).toHaveProperty('enabled')
        expect(task).toHaveProperty('schedule')
      }
    })
  })

  describe('PUT /api/admin/tasks/toggle', () => {
    it('should enable/disable scheduled task', async () => {
      client.setAuth(adminToken)

      const response = await client.put('/api/admin/tasks/toggle', {
        taskName: 'cleanup',
        enabled: false,
      })

      assert.api.isSuccess(response)
    })

    it('should validate task name', async () => {
      client.setAuth(adminToken)

      const response = await client.put('/api/admin/tasks/toggle', {
        taskName: 'invalid-task',
        enabled: true,
      })

      assert.api.isNotFound(response)
    })
  })

  describe('POST /api/admin/tasks/run', () => {
    it('should manually trigger task execution', async () => {
      client.setAuth(adminToken)

      const response = await client.post('/api/admin/tasks/run', {
        taskName: 'cleanup',
      })

      assert.api.isSuccess(response)
      expect(response.data).toHaveProperty('status')
    })

    it('should prevent concurrent task execution', async () => {
      client.setAuth(adminToken)

      // 同时触发两次相同任务
      const [response1, response2] = await Promise.all([
        client.post('/api/admin/tasks/run', { taskName: 'cleanup' }),
        client.post('/api/admin/tasks/run', { taskName: 'cleanup' }),
      ])

      // 一个应该成功，一个应该被拒绝
      const successCount = [response1, response2].filter(
        r => r.status === 200
      ).length
      expect(successCount).toBe(1)
    })
  })

  describe('Bulk Operations', () => {
    it('should handle bulk user status update', async () => {
      client.setAuth(adminToken)

      const user1 = testDb.createUser({ username: 'bulk1' })
      const user2 = testDb.createUser({ username: 'bulk2' })

      const response = await client.put('/api/admin/users/status-bulk', {
        userIds: [user1.id, user2.id],
        status: 'disabled',
      })

      assert.api.isSuccess(response)
      expect(response.data.updated).toBe(2)

      expect(testDb.getUser(user1.id)?.status).toBe('disabled')
      expect(testDb.getUser(user2.id)?.status).toBe('disabled')
    })
  })

  describe('Audit Logging', () => {
    it('should log admin actions', async () => {
      client.setAuth(adminToken)

      const user = testDb.createUser({ username: 'test' })

      await client.put('/api/admin/users/status', {
        userId: user.id,
        status: 'disabled',
      })

      // 验证审计日志已创建
      const logs = await client.get('/api/admin/audit-logs')
      assert.api.isSuccess(logs)

      const recentLog = logs.data[0]
      expect(recentLog.action).toContain('status')
      expect(recentLog.adminId).toBe(adminId)
    })
  })

  describe('Performance Tests', () => {
    it('should load large user list efficiently', async () => {
      client.setAuth(adminToken)

      // 创建 200 个用户
      for (let i = 0; i < 200; i++) {
        testDb.createUser({ username: `user${i}` })
      }

      await assert.perf.respondsWithin(async () => {
        await client.get('/api/admin/users', {
          query: { page: 1, limit: 50 },
        })
      }, 500)
    })
  })
})
