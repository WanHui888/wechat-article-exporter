import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CredentialService } from '~/server/services/credential.service'

/**
 * CredentialService 单元测试
 *
 * 测试覆盖：
 * 1. getCredentials - 获取用户的所有凭据
 * 2. getCredential - 获取单个凭据
 * 3. saveCredential - 保存凭据（插入和更新）
 * 4. invalidateCredential - 使凭据失效
 * 5. deleteCredential - 删除凭据
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
    userCredentials: {
      id: 'id',
      userId: 'userId',
      biz: 'biz',
      uin: 'uin',
      key: 'key',
      passTicket: 'passTicket',
      wapSid2: 'wapSid2',
      nickname: 'nickname',
      avatar: 'avatar',
      timestamp: 'timestamp',
      valid: 'valid',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
    },
  },
}))

// ==================== 测试套件 ====================

describe('CredentialService', () => {
  let service: CredentialService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new CredentialService()
  })

  // ==================== getCredentials() 测试 ====================

  describe('getCredentials', () => {
    it('should return all credentials for user', async () => {
      const mockCredentials = [
        {
          id: 1,
          userId: 1,
          biz: 'biz1',
          uin: 'uin1',
          key: 'key1',
          passTicket: 'ticket1',
          valid: 1,
          createdAt: new Date(),
        },
        {
          id: 2,
          userId: 1,
          biz: 'biz2',
          uin: 'uin2',
          key: 'key2',
          passTicket: 'ticket2',
          valid: 1,
          createdAt: new Date(),
        },
      ]

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(mockCredentials),
      })

      const result = await service.getCredentials(1)

      expect(result).toEqual(mockCredentials)
      expect(result).toHaveLength(2)
    })

    it('should return empty array when no credentials', async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
      })

      const result = await service.getCredentials(1)

      expect(result).toEqual([])
    })

    it('should filter by userId', async () => {
      const whereSpy = vi.fn().mockResolvedValue([])
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: whereSpy,
      })

      await service.getCredentials(456)

      expect(whereSpy).toHaveBeenCalled()
    })

    it('should return both valid and invalid credentials', async () => {
      const mockCredentials = [
        { id: 1, userId: 1, biz: 'biz1', valid: 1 },
        { id: 2, userId: 1, biz: 'biz2', valid: 0 },
      ]

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(mockCredentials),
      })

      const result = await service.getCredentials(1)

      expect(result).toHaveLength(2)
      expect(result.some(c => c.valid === 0)).toBe(true)
    })
  })

  // ==================== getCredential() 测试 ====================

  describe('getCredential', () => {
    it('should return credential when found', async () => {
      const mockCredential = {
        id: 1,
        userId: 1,
        biz: 'test_biz',
        uin: 'test_uin',
        key: 'test_key',
        passTicket: 'test_ticket',
        wapSid2: 'test_sid',
        nickname: 'Test User',
        avatar: 'https://example.com/avatar.jpg',
        timestamp: 1234567890,
        valid: 1,
        createdAt: new Date(),
      }

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockCredential]),
      })

      const result = await service.getCredential(1, 'test_biz')

      expect(result).toEqual(mockCredential)
    })

    it('should return null when credential not found', async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      })

      const result = await service.getCredential(1, 'nonexistent')

      expect(result).toBeNull()
    })

    it('should query with correct userId and biz', async () => {
      const whereSpy = vi.fn().mockReturnThis()
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: whereSpy,
        limit: vi.fn().mockResolvedValue([]),
      })

      await service.getCredential(123, 'test_biz')

      expect(whereSpy).toHaveBeenCalled()
    })

    it('should return invalid credential if exists', async () => {
      const mockCredential = {
        id: 1,
        userId: 1,
        biz: 'test_biz',
        uin: 'test_uin',
        key: 'test_key',
        passTicket: 'test_ticket',
        valid: 0,
      }

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockCredential]),
      })

      const result = await service.getCredential(1, 'test_biz')

      expect(result?.valid).toBe(0)
    })
  })

  // ==================== saveCredential() 测试 ====================

  describe('saveCredential', () => {
    const userId = 1
    const credentialData = {
      biz: 'test_biz',
      uin: 'test_uin',
      key: 'test_key',
      passTicket: 'test_ticket',
      wapSid2: 'test_sid',
      nickname: 'Test User',
      avatar: 'https://example.com/avatar.jpg',
      timestamp: 1234567890,
    }

    it('should insert new credential', async () => {
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnThis(),
        onDuplicateKeyUpdate: vi.fn().mockResolvedValue(undefined),
      })

      await service.saveCredential(userId, credentialData)

      expect(mockDb.insert).toHaveBeenCalled()
    })

    it('should set valid to 1 when saving', async () => {
      const valuesSpy = vi.fn().mockReturnThis()
      mockDb.insert.mockReturnValue({
        values: valuesSpy,
        onDuplicateKeyUpdate: vi.fn().mockResolvedValue(undefined),
      })

      await service.saveCredential(userId, credentialData)

      expect(valuesSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          valid: 1,
        })
      )
    })

    it('should update existing credential on duplicate', async () => {
      const updateSpy = vi.fn().mockResolvedValue(undefined)
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnThis(),
        onDuplicateKeyUpdate: updateSpy,
      })

      await service.saveCredential(userId, credentialData)

      expect(updateSpy).toHaveBeenCalled()
    })

    it('should save credential without optional fields', async () => {
      const minimalData = {
        biz: 'test_biz',
        uin: 'test_uin',
        key: 'test_key',
        passTicket: 'test_ticket',
        timestamp: 1234567890,
      }

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnThis(),
        onDuplicateKeyUpdate: vi.fn().mockResolvedValue(undefined),
      })

      await service.saveCredential(userId, minimalData)

      expect(mockDb.insert).toHaveBeenCalled()
    })

    it('should include userId in insert', async () => {
      const valuesSpy = vi.fn().mockReturnThis()
      mockDb.insert.mockReturnValue({
        values: valuesSpy,
        onDuplicateKeyUpdate: vi.fn().mockResolvedValue(undefined),
      })

      await service.saveCredential(456, credentialData)

      expect(valuesSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 456,
        })
      )
    })

    it('should include all credential fields', async () => {
      const valuesSpy = vi.fn().mockReturnThis()
      mockDb.insert.mockReturnValue({
        values: valuesSpy,
        onDuplicateKeyUpdate: vi.fn().mockResolvedValue(undefined),
      })

      await service.saveCredential(userId, credentialData)

      expect(valuesSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          biz: credentialData.biz,
          uin: credentialData.uin,
          key: credentialData.key,
          passTicket: credentialData.passTicket,
          wapSid2: credentialData.wapSid2,
          nickname: credentialData.nickname,
          avatar: credentialData.avatar,
          timestamp: credentialData.timestamp,
        })
      )
    })

    it('should revalidate credential on update', async () => {
      const updateSpy = vi.fn().mockResolvedValue(undefined)
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnThis(),
        onDuplicateKeyUpdate: updateSpy,
      })

      await service.saveCredential(userId, credentialData)

      expect(updateSpy).toHaveBeenCalledWith({
        set: expect.objectContaining({
          valid: 1,
        }),
      })
    })
  })

  // ==================== invalidateCredential() 测试 ====================

  describe('invalidateCredential', () => {
    it('should set valid to 0', async () => {
      const setSpy = vi.fn().mockReturnThis()
      mockDb.update.mockReturnValue({
        set: setSpy,
        where: vi.fn().mockResolvedValue(undefined),
      })

      await service.invalidateCredential(1, 'test_biz')

      expect(setSpy).toHaveBeenCalledWith({ valid: 0 })
    })

    it('should invalidate with correct userId and biz', async () => {
      const whereSpy = vi.fn().mockResolvedValue(undefined)
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: whereSpy,
      })

      await service.invalidateCredential(456, 'test_biz')

      expect(whereSpy).toHaveBeenCalled()
    })

    it('should not throw when invalidating non-existent credential', async () => {
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      })

      await expect(service.invalidateCredential(1, 'nonexistent')).resolves.toBeUndefined()
    })

    it('should handle multiple invalidations', async () => {
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      })

      await service.invalidateCredential(1, 'biz1')
      await service.invalidateCredential(1, 'biz2')

      expect(mockDb.update).toHaveBeenCalledTimes(2)
    })
  })

  // ==================== deleteCredential() 测试 ====================

  describe('deleteCredential', () => {
    it('should delete credential successfully', async () => {
      mockDb.delete.mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      })

      await service.deleteCredential(1, 'test_biz')

      expect(mockDb.delete).toHaveBeenCalled()
    })

    it('should delete with correct userId and biz', async () => {
      const whereSpy = vi.fn().mockResolvedValue(undefined)
      mockDb.delete.mockReturnValue({
        where: whereSpy,
      })

      await service.deleteCredential(456, 'test_biz')

      expect(whereSpy).toHaveBeenCalled()
    })

    it('should not throw when deleting non-existent credential', async () => {
      mockDb.delete.mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      })

      await expect(service.deleteCredential(1, 'nonexistent')).resolves.toBeUndefined()
    })

    it('should handle multiple deletions', async () => {
      mockDb.delete.mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      })

      await service.deleteCredential(1, 'biz1')
      await service.deleteCredential(1, 'biz2')
      await service.deleteCredential(1, 'biz3')

      expect(mockDb.delete).toHaveBeenCalledTimes(3)
    })

    it('should delete both valid and invalid credentials', async () => {
      mockDb.delete.mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      })

      // 方法不区分 valid 状态，都会删除
      await service.deleteCredential(1, 'biz1')

      expect(mockDb.delete).toHaveBeenCalled()
    })
  })

  // ==================== 集成场景测试 ====================

  describe('Integration Scenarios', () => {
    it('should save, invalidate, and then revalidate credential', async () => {
      const credentialData = {
        biz: 'test_biz',
        uin: 'test_uin',
        key: 'test_key',
        passTicket: 'test_ticket',
        timestamp: 1234567890,
      }

      // Save
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnThis(),
        onDuplicateKeyUpdate: vi.fn().mockResolvedValue(undefined),
      })
      await service.saveCredential(1, credentialData)

      // Invalidate
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      })
      await service.invalidateCredential(1, 'test_biz')

      // Revalidate by saving again
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnThis(),
        onDuplicateKeyUpdate: vi.fn().mockResolvedValue(undefined),
      })
      await service.saveCredential(1, credentialData)

      expect(mockDb.insert).toHaveBeenCalledTimes(2)
      expect(mockDb.update).toHaveBeenCalledTimes(1)
    })

    it('should save and delete credential', async () => {
      const credentialData = {
        biz: 'test_biz',
        uin: 'test_uin',
        key: 'test_key',
        passTicket: 'test_ticket',
        timestamp: 1234567890,
      }

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnThis(),
        onDuplicateKeyUpdate: vi.fn().mockResolvedValue(undefined),
      })
      await service.saveCredential(1, credentialData)

      mockDb.delete.mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      })
      await service.deleteCredential(1, 'test_biz')

      expect(mockDb.insert).toHaveBeenCalled()
      expect(mockDb.delete).toHaveBeenCalled()
    })

    it('should handle multiple credentials for same user', async () => {
      const cred1 = { biz: 'biz1', uin: 'uin1', key: 'key1', passTicket: 'ticket1', timestamp: 1 }
      const cred2 = { biz: 'biz2', uin: 'uin2', key: 'key2', passTicket: 'ticket2', timestamp: 2 }

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnThis(),
        onDuplicateKeyUpdate: vi.fn().mockResolvedValue(undefined),
      })

      await service.saveCredential(1, cred1)
      await service.saveCredential(1, cred2)

      expect(mockDb.insert).toHaveBeenCalledTimes(2)
    })
  })
})
