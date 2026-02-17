import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AccountService } from '~/server/services/account.service'

/**
 * AccountService 单元测试
 *
 * 测试覆盖：
 * 1. getAccounts - 获取用户的所有公众号账号
 * 2. getAccount - 获取单个公众号账号
 * 3. upsertAccount - 插入或更新公众号账号
 * 4. deleteAccount - 删除公众号账号
 * 5. updateSyncProgress - 更新同步进度
 * 6. setAutoSync - 设置自动同步
 * 7. getAutoSyncAccounts - 获取所有开启自动同步的账号
 * 8. importAccounts - 批量导入账号
 */

// ==================== Mock 设置 ====================

// Use vi.hoisted to declare mocks before vi.mock calls
const { mockDb } = vi.hoisted(() => {
  return {
    mockDb: {
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  }
})

// Mock modules
vi.mock('~/server/database', () => ({
  getDb: () => mockDb,
  schema: {
    mpAccounts: {
      id: 'id',
      userId: 'userId',
      fakeid: 'fakeid',
      nickname: 'nickname',
      alias: 'alias',
      roundHeadImg: 'roundHeadImg',
      serviceType: 'serviceType',
      signature: 'signature',
      totalCount: 'totalCount',
      syncedCount: 'syncedCount',
      syncedArticles: 'syncedArticles',
      completed: 'completed',
      lastSyncAt: 'lastSyncAt',
      autoSync: 'autoSync',
      syncInterval: 'syncInterval',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
    },
  },
}))

// ==================== 测试套件 ====================

describe('AccountService', () => {
  let service: AccountService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new AccountService()
  })

  // ==================== getAccounts() 测试 ====================

  describe('getAccounts', () => {
    it('should return all accounts for user', async () => {
      const mockAccounts = [
        {
          id: 1,
          userId: 1,
          fakeid: 'fakeid1',
          nickname: 'Account 1',
          alias: 'account1',
          createdAt: new Date(),
        },
        {
          id: 2,
          userId: 1,
          fakeid: 'fakeid2',
          nickname: 'Account 2',
          alias: 'account2',
          createdAt: new Date(),
        },
      ]

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue(mockAccounts),
      })

      const result = await service.getAccounts(1)

      expect(result).toEqual(mockAccounts)
      expect(result).toHaveLength(2)
    })

    it('should return empty array when no accounts', async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue([]),
      })

      const result = await service.getAccounts(1)

      expect(result).toEqual([])
    })

    it('should filter by userId', async () => {
      const whereSpy = vi.fn().mockReturnThis()
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: whereSpy,
        orderBy: vi.fn().mockResolvedValue([]),
      })

      await service.getAccounts(456)

      expect(whereSpy).toHaveBeenCalled()
    })

    it('should order by createdAt descending', async () => {
      const orderBySpy = vi.fn().mockResolvedValue([])
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: orderBySpy,
      })

      await service.getAccounts(1)

      expect(orderBySpy).toHaveBeenCalled()
    })
  })

  // ==================== getAccount() 测试 ====================

  describe('getAccount', () => {
    it('should return account when found', async () => {
      const mockAccount = {
        id: 1,
        userId: 1,
        fakeid: 'test_fakeid',
        nickname: 'Test Account',
        alias: 'testaccount',
        roundHeadImg: 'https://example.com/avatar.jpg',
        serviceType: 2,
        signature: 'Test signature',
        createdAt: new Date(),
      }

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockAccount]),
      })

      const result = await service.getAccount(1, 'test_fakeid')

      expect(result).toEqual(mockAccount)
    })

    it('should return null when account not found', async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      })

      const result = await service.getAccount(1, 'nonexistent')

      expect(result).toBeNull()
    })

    it('should query with correct userId and fakeid', async () => {
      const whereSpy = vi.fn().mockReturnThis()
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: whereSpy,
        limit: vi.fn().mockResolvedValue([]),
      })

      await service.getAccount(123, 'test_fakeid')

      expect(whereSpy).toHaveBeenCalled()
    })
  })

  // ==================== upsertAccount() 测试 ====================

  describe('upsertAccount', () => {
    const userId = 1
    const accountData = {
      fakeid: 'test_fakeid',
      nickname: 'Test Account',
      alias: 'testaccount',
      roundHeadImg: 'https://example.com/avatar.jpg',
      serviceType: 2,
      signature: 'Test signature',
    }

    it('should insert new account when not exists', async () => {
      // First call: getAccount returns null (not exists)
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      })

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      })

      // Second call: getAccount returns the newly created account
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ id: 1, userId, ...accountData }]),
      })

      const result = await service.upsertAccount(userId, accountData)

      expect(mockDb.insert).toHaveBeenCalled()
      expect(result).toBeDefined()
      expect(result?.fakeid).toBe(accountData.fakeid)
    })

    it('should update existing account when exists', async () => {
      const existingAccount = { id: 1, userId, ...accountData }

      // First call: getAccount returns existing account
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([existingAccount]),
      })

      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      })

      // Second call: getAccount returns updated account
      const updatedAccount = { ...existingAccount, nickname: 'Updated Name' }
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([updatedAccount]),
      })

      const result = await service.upsertAccount(userId, {
        ...accountData,
        nickname: 'Updated Name',
      })

      expect(mockDb.update).toHaveBeenCalled()
      expect(mockDb.insert).not.toHaveBeenCalled()
      expect(result?.nickname).toBe('Updated Name')
    })

    it('should handle account with minimal data', async () => {
      const minimalData = {
        fakeid: 'test_fakeid',
      }

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      })

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      })

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ id: 1, userId, ...minimalData }]),
      })

      const result = await service.upsertAccount(userId, minimalData)

      expect(result).toBeDefined()
      expect(result?.fakeid).toBe(minimalData.fakeid)
    })

    it('should include userId in insert', async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      })

      const valuesSpy = vi.fn().mockResolvedValue(undefined)
      mockDb.insert.mockReturnValue({
        values: valuesSpy,
      })

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ id: 1, userId: 123, ...accountData }]),
      })

      await service.upsertAccount(123, accountData)

      expect(valuesSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 123,
        })
      )
    })
  })

  // ==================== deleteAccount() 测试 ====================

  describe('deleteAccount', () => {
    it('should delete account successfully', async () => {
      mockDb.delete.mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      })

      await service.deleteAccount(1, 'test_fakeid')

      expect(mockDb.delete).toHaveBeenCalled()
    })

    it('should delete with correct userId and fakeid', async () => {
      const whereSpy = vi.fn().mockResolvedValue(undefined)
      mockDb.delete.mockReturnValue({
        where: whereSpy,
      })

      await service.deleteAccount(456, 'test_fakeid')

      expect(whereSpy).toHaveBeenCalled()
    })

    it('should not throw when deleting non-existent account', async () => {
      mockDb.delete.mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      })

      await expect(service.deleteAccount(1, 'nonexistent')).resolves.toBeUndefined()
    })
  })

  // ==================== updateSyncProgress() 测试 ====================

  describe('updateSyncProgress', () => {
    it('should update all progress fields', async () => {
      const progressData = {
        totalCount: 100,
        syncedCount: 50,
        syncedArticles: 50,
        completed: 0,
        lastSyncAt: new Date(),
      }

      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      })

      await service.updateSyncProgress(1, 'test_fakeid', progressData)

      expect(mockDb.update).toHaveBeenCalled()
    })

    it('should update partial progress fields', async () => {
      const partialData = {
        syncedCount: 30,
        syncedArticles: 30,
      }

      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      })

      await service.updateSyncProgress(1, 'test_fakeid', partialData)

      expect(mockDb.update).toHaveBeenCalled()
    })

    it('should update completed status', async () => {
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      })

      await service.updateSyncProgress(1, 'test_fakeid', { completed: 1 })

      expect(mockDb.update).toHaveBeenCalled()
    })

    it('should update with correct userId and fakeid', async () => {
      const whereSpy = vi.fn().mockResolvedValue(undefined)
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: whereSpy,
      })

      await service.updateSyncProgress(789, 'test_fakeid', { syncedCount: 10 })

      expect(whereSpy).toHaveBeenCalled()
    })
  })

  // ==================== setAutoSync() 测试 ====================

  describe('setAutoSync', () => {
    it('should enable auto sync without interval', async () => {
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      })

      await service.setAutoSync(1, 'test_fakeid', true)

      expect(mockDb.update).toHaveBeenCalled()
    })

    it('should enable auto sync with interval', async () => {
      const setSpy = vi.fn().mockReturnThis()
      mockDb.update.mockReturnValue({
        set: setSpy,
        where: vi.fn().mockResolvedValue(undefined),
      })

      await service.setAutoSync(1, 'test_fakeid', true, 3600)

      expect(setSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          autoSync: 1,
          syncInterval: 3600,
        })
      )
    })

    it('should disable auto sync', async () => {
      const setSpy = vi.fn().mockReturnThis()
      mockDb.update.mockReturnValue({
        set: setSpy,
        where: vi.fn().mockResolvedValue(undefined),
      })

      await service.setAutoSync(1, 'test_fakeid', false)

      expect(setSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          autoSync: 0,
        })
      )
    })

    it('should update interval without changing autoSync status', async () => {
      const setSpy = vi.fn().mockReturnThis()
      mockDb.update.mockReturnValue({
        set: setSpy,
        where: vi.fn().mockResolvedValue(undefined),
      })

      await service.setAutoSync(1, 'test_fakeid', true, 7200)

      expect(setSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          syncInterval: 7200,
        })
      )
    })

    it('should not include interval when undefined', async () => {
      const setSpy = vi.fn().mockReturnThis()
      mockDb.update.mockReturnValue({
        set: setSpy,
        where: vi.fn().mockResolvedValue(undefined),
      })

      await service.setAutoSync(1, 'test_fakeid', true, undefined)

      expect(setSpy).toHaveBeenCalledWith(
        expect.not.objectContaining({
          syncInterval: expect.anything(),
        })
      )
    })
  })

  // ==================== getAutoSyncAccounts() 测试 ====================

  describe('getAutoSyncAccounts', () => {
    it('should return all auto-sync enabled accounts', async () => {
      const mockAccounts = [
        {
          id: 1,
          userId: 1,
          fakeid: 'fakeid1',
          nickname: 'Account 1',
          autoSync: 1,
        },
        {
          id: 2,
          userId: 2,
          fakeid: 'fakeid2',
          nickname: 'Account 2',
          autoSync: 1,
        },
      ]

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(mockAccounts),
      })

      const result = await service.getAutoSyncAccounts()

      expect(result).toEqual(mockAccounts)
      expect(result).toHaveLength(2)
    })

    it('should return empty array when no auto-sync accounts', async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
      })

      const result = await service.getAutoSyncAccounts()

      expect(result).toEqual([])
    })

    it('should filter by autoSync = 1', async () => {
      const whereSpy = vi.fn().mockResolvedValue([])
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: whereSpy,
      })

      await service.getAutoSyncAccounts()

      expect(whereSpy).toHaveBeenCalled()
    })

    it('should return accounts from different users', async () => {
      const mockAccounts = [
        { id: 1, userId: 1, fakeid: 'f1', autoSync: 1 },
        { id: 2, userId: 2, fakeid: 'f2', autoSync: 1 },
        { id: 3, userId: 3, fakeid: 'f3', autoSync: 1 },
      ]

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(mockAccounts),
      })

      const result = await service.getAutoSyncAccounts()

      expect(result).toHaveLength(3)
      expect(new Set(result.map(a => a.userId)).size).toBe(3)
    })
  })

  // ==================== importAccounts() 测试 ====================

  describe('importAccounts', () => {
    it('should import multiple accounts', async () => {
      const accounts = [
        { fakeid: 'f1', nickname: 'Account 1', alias: 'a1' },
        { fakeid: 'f2', nickname: 'Account 2', alias: 'a2' },
      ]

      // Mock for first account (not exists)
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      })
      mockDb.insert.mockReturnValueOnce({
        values: vi.fn().mockResolvedValue(undefined),
      })
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ id: 1, userId: 1, ...accounts[0] }]),
      })

      // Mock for second account (not exists)
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      })
      mockDb.insert.mockReturnValueOnce({
        values: vi.fn().mockResolvedValue(undefined),
      })
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ id: 2, userId: 1, ...accounts[1] }]),
      })

      const result = await service.importAccounts(1, accounts)

      expect(result).toHaveLength(2)
      expect(result[0]?.fakeid).toBe('f1')
      expect(result[1]?.fakeid).toBe('f2')
    })

    it('should handle empty import list', async () => {
      const result = await service.importAccounts(1, [])

      expect(result).toEqual([])
      expect(mockDb.select).not.toHaveBeenCalled()
    })

    it('should handle single account import', async () => {
      const account = { fakeid: 'f1', nickname: 'Account 1' }

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      })
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      })
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ id: 1, userId: 1, ...account }]),
      })

      const result = await service.importAccounts(1, [account])

      expect(result).toHaveLength(1)
      expect(result[0]?.fakeid).toBe('f1')
    })

    it('should update existing accounts during import', async () => {
      const account = { fakeid: 'existing', nickname: 'Updated Name' }
      const existingAccount = { id: 1, userId: 1, fakeid: 'existing', nickname: 'Old Name' }

      // Mock: account exists
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([existingAccount]),
      })
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      })
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ ...existingAccount, nickname: 'Updated Name' }]),
      })

      const result = await service.importAccounts(1, [account])

      expect(result).toHaveLength(1)
      expect(result[0]?.nickname).toBe('Updated Name')
      expect(mockDb.update).toHaveBeenCalled()
    })

    it('should handle mixed new and existing accounts', async () => {
      const accounts = [
        { fakeid: 'new1', nickname: 'New Account' },
        { fakeid: 'existing1', nickname: 'Updated Account' },
      ]

      // First account: new
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      })
      mockDb.insert.mockReturnValueOnce({
        values: vi.fn().mockResolvedValue(undefined),
      })
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ id: 1, userId: 1, ...accounts[0] }]),
      })

      // Second account: existing
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ id: 2, userId: 1, fakeid: 'existing1', nickname: 'Old' }]),
      })
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      })
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ id: 2, userId: 1, ...accounts[1] }]),
      })

      const result = await service.importAccounts(1, accounts)

      expect(result).toHaveLength(2)
      expect(mockDb.insert).toHaveBeenCalledTimes(1)
      expect(mockDb.update).toHaveBeenCalledTimes(1)
    })
  })
})
