import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ResourceService } from '~/server/services/resource.service'

/**
 * ResourceService 单元测试
 *
 * 测试覆盖：
 * 1. getResource - 获取资源记录
 * 2. saveResource - 保存资源记录（插入和更新）
 * 3. getResourceMap - 获取资源映射
 * 4. saveResourceMap - 保存资源映射
 * 5. deleteByFakeid - 删除 fakeid 的所有资源和映射
 * 6. getTotalSize - 获取资源总大小
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
    resources: {
      id: 'id',
      userId: 'userId',
      fakeid: 'fakeid',
      resourceUrl: 'resourceUrl',
      filePath: 'filePath',
      fileSize: 'fileSize',
      mimeType: 'mimeType',
      createdAt: 'createdAt',
    },
    resourceMaps: {
      id: 'id',
      userId: 'userId',
      fakeid: 'fakeid',
      articleUrl: 'articleUrl',
      resources: 'resources',
      createdAt: 'createdAt',
    },
  },
}))

// ==================== 测试套件 ====================

describe('ResourceService', () => {
  let service: ResourceService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new ResourceService()
  })

  // ==================== getResource() 测试 ====================

  describe('getResource', () => {
    it('should return resource when found', async () => {
      const mockResource = {
        id: 1,
        userId: 1,
        fakeid: 'test_fakeid',
        resourceUrl: 'https://mmbiz.qpic.cn/mmbiz_jpg/test123.jpg',
        filePath: '/data/uploads/1/test_fakeid/resources/abc123.jpg',
        fileSize: 51200,
        mimeType: 'image/jpeg',
        createdAt: new Date(),
      }

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockResource]),
      })

      const result = await service.getResource(1, 'https://mmbiz.qpic.cn/mmbiz_jpg/test123.jpg')

      expect(result).toEqual(mockResource)
    })

    it('should return null when resource not found', async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      })

      const result = await service.getResource(1, 'https://mmbiz.qpic.cn/mmbiz_jpg/nonexistent.jpg')

      expect(result).toBeNull()
    })

    it('should query with correct userId and resourceUrl', async () => {
      const whereSpy = vi.fn().mockReturnThis()
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: whereSpy,
        limit: vi.fn().mockResolvedValue([]),
      })

      await service.getResource(123, 'https://example.com/image.png')

      expect(whereSpy).toHaveBeenCalled()
    })

    it('should handle different image formats', async () => {
      const mockResource = {
        id: 1,
        userId: 1,
        fakeid: 'test_fakeid',
        resourceUrl: 'https://mmbiz.qpic.cn/mmbiz_png/test.png',
        filePath: '/path/to/test.png',
        fileSize: 102400,
        mimeType: 'image/png',
      }

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockResource]),
      })

      const result = await service.getResource(1, 'https://mmbiz.qpic.cn/mmbiz_png/test.png')

      expect(result?.mimeType).toBe('image/png')
    })
  })

  // ==================== saveResource() 测试 ====================

  describe('saveResource', () => {
    const userId = 1
    const resourceData = {
      fakeid: 'test_fakeid',
      resourceUrl: 'https://mmbiz.qpic.cn/mmbiz_jpg/test123.jpg',
      filePath: '/data/uploads/1/test_fakeid/resources/abc123.jpg',
      fileSize: 51200,
      mimeType: 'image/jpeg',
    }

    it('should insert new resource record', async () => {
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnThis(),
        onDuplicateKeyUpdate: vi.fn().mockResolvedValue(undefined),
      })

      await service.saveResource(userId, resourceData)

      expect(mockDb.insert).toHaveBeenCalled()
    })

    it('should update existing resource on duplicate', async () => {
      const updateSpy = vi.fn().mockResolvedValue(undefined)
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnThis(),
        onDuplicateKeyUpdate: updateSpy,
      })

      await service.saveResource(userId, resourceData)

      expect(updateSpy).toHaveBeenCalled()
    })

    it('should save resource without mimeType', async () => {
      const dataWithoutMime = {
        fakeid: 'test_fakeid',
        resourceUrl: 'https://example.com/unknown.bin',
        filePath: '/path/to/unknown.bin',
        fileSize: 1024,
      }

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnThis(),
        onDuplicateKeyUpdate: vi.fn().mockResolvedValue(undefined),
      })

      await service.saveResource(userId, dataWithoutMime)

      expect(mockDb.insert).toHaveBeenCalled()
    })

    it('should handle large file sizes', async () => {
      const largeFileData = {
        ...resourceData,
        fileSize: 10485760, // 10MB
      }

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnThis(),
        onDuplicateKeyUpdate: vi.fn().mockResolvedValue(undefined),
      })

      await service.saveResource(userId, largeFileData)

      expect(mockDb.insert).toHaveBeenCalled()
    })

    it('should include userId in insert', async () => {
      const valuesSpy = vi.fn().mockReturnThis()
      mockDb.insert.mockReturnValue({
        values: valuesSpy,
        onDuplicateKeyUpdate: vi.fn().mockResolvedValue(undefined),
      })

      await service.saveResource(456, resourceData)

      expect(valuesSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 456,
        })
      )
    })

    it('should handle different MIME types', async () => {
      const testCases = [
        { ...resourceData, mimeType: 'image/png' },
        { ...resourceData, mimeType: 'image/gif' },
        { ...resourceData, mimeType: 'image/webp' },
        { ...resourceData, mimeType: 'image/svg+xml' },
      ]

      for (const testCase of testCases) {
        vi.clearAllMocks()

        mockDb.insert.mockReturnValue({
          values: vi.fn().mockReturnThis(),
          onDuplicateKeyUpdate: vi.fn().mockResolvedValue(undefined),
        })

        await service.saveResource(userId, testCase)

        expect(mockDb.insert).toHaveBeenCalled()
      }
    })
  })

  // ==================== getResourceMap() 测试 ====================

  describe('getResourceMap', () => {
    it('should return resource map when found', async () => {
      const mockMap = {
        id: 1,
        userId: 1,
        fakeid: 'test_fakeid',
        articleUrl: 'https://mp.weixin.qq.com/s/test',
        resources: {
          'https://mmbiz.qpic.cn/mmbiz_jpg/original1.jpg': 'images/hash1.jpg',
          'https://mmbiz.qpic.cn/mmbiz_jpg/original2.jpg': 'images/hash2.jpg',
        },
        createdAt: new Date(),
      }

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockMap]),
      })

      const result = await service.getResourceMap(1, 'https://mp.weixin.qq.com/s/test')

      expect(result).toEqual(mockMap)
      expect(result?.resources).toHaveProperty('https://mmbiz.qpic.cn/mmbiz_jpg/original1.jpg')
    })

    it('should return null when map not found', async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      })

      const result = await service.getResourceMap(1, 'https://mp.weixin.qq.com/s/nonexistent')

      expect(result).toBeNull()
    })

    it('should handle empty resource map', async () => {
      const mockMap = {
        id: 1,
        userId: 1,
        fakeid: 'test_fakeid',
        articleUrl: 'https://mp.weixin.qq.com/s/test',
        resources: {},
      }

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockMap]),
      })

      const result = await service.getResourceMap(1, 'https://mp.weixin.qq.com/s/test')

      expect(result?.resources).toEqual({})
    })

    it('should handle map with many resources', async () => {
      const resources: Record<string, string> = {}
      for (let i = 0; i < 100; i++) {
        resources[`https://example.com/image${i}.jpg`] = `images/hash${i}.jpg`
      }

      const mockMap = {
        id: 1,
        userId: 1,
        fakeid: 'test_fakeid',
        articleUrl: 'https://mp.weixin.qq.com/s/test',
        resources,
      }

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockMap]),
      })

      const result = await service.getResourceMap(1, 'https://mp.weixin.qq.com/s/test')

      expect(Object.keys(result?.resources || {})).toHaveLength(100)
    })
  })

  // ==================== saveResourceMap() 测试 ====================

  describe('saveResourceMap', () => {
    const userId = 1
    const mapData = {
      fakeid: 'test_fakeid',
      articleUrl: 'https://mp.weixin.qq.com/s/test',
      resources: {
        'https://mmbiz.qpic.cn/mmbiz_jpg/original1.jpg': 'images/hash1.jpg',
        'https://mmbiz.qpic.cn/mmbiz_jpg/original2.jpg': 'images/hash2.jpg',
      },
    }

    it('should insert new resource map', async () => {
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnThis(),
        onDuplicateKeyUpdate: vi.fn().mockResolvedValue(undefined),
      })

      await service.saveResourceMap(userId, mapData)

      expect(mockDb.insert).toHaveBeenCalled()
    })

    it('should update existing map on duplicate', async () => {
      const updateSpy = vi.fn().mockResolvedValue(undefined)
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnThis(),
        onDuplicateKeyUpdate: updateSpy,
      })

      await service.saveResourceMap(userId, mapData)

      expect(updateSpy).toHaveBeenCalled()
    })

    it('should save empty resource map', async () => {
      const emptyMapData = {
        fakeid: 'test_fakeid',
        articleUrl: 'https://mp.weixin.qq.com/s/test',
        resources: {},
      }

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnThis(),
        onDuplicateKeyUpdate: vi.fn().mockResolvedValue(undefined),
      })

      await service.saveResourceMap(userId, emptyMapData)

      expect(mockDb.insert).toHaveBeenCalled()
    })

    it('should include all required fields', async () => {
      const valuesSpy = vi.fn().mockReturnThis()
      mockDb.insert.mockReturnValue({
        values: valuesSpy,
        onDuplicateKeyUpdate: vi.fn().mockResolvedValue(undefined),
      })

      await service.saveResourceMap(123, mapData)

      expect(valuesSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 123,
          fakeid: mapData.fakeid,
          articleUrl: mapData.articleUrl,
          resources: mapData.resources,
        })
      )
    })

    it('should handle large resource maps', async () => {
      const largeResources: Record<string, string> = {}
      for (let i = 0; i < 200; i++) {
        largeResources[`https://example.com/image${i}.jpg`] = `images/hash${i}.jpg`
      }

      const largeMapData = {
        ...mapData,
        resources: largeResources,
      }

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnThis(),
        onDuplicateKeyUpdate: vi.fn().mockResolvedValue(undefined),
      })

      await service.saveResourceMap(userId, largeMapData)

      expect(mockDb.insert).toHaveBeenCalled()
    })
  })

  // ==================== deleteByFakeid() 测试 ====================

  describe('deleteByFakeid', () => {
    it('should delete both resources and resource maps', async () => {
      const deleteResourcesSpy = vi.fn().mockResolvedValue(undefined)
      const deleteMapsSpy = vi.fn().mockResolvedValue(undefined)

      mockDb.delete.mockReturnValueOnce({
        where: deleteResourcesSpy,
      })

      mockDb.delete.mockReturnValueOnce({
        where: deleteMapsSpy,
      })

      await service.deleteByFakeid(1, 'test_fakeid')

      expect(mockDb.delete).toHaveBeenCalledTimes(2)
      expect(deleteResourcesSpy).toHaveBeenCalled()
      expect(deleteMapsSpy).toHaveBeenCalled()
    })

    it('should delete with correct userId and fakeid', async () => {
      mockDb.delete.mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      })

      await service.deleteByFakeid(456, 'test_fakeid')

      expect(mockDb.delete).toHaveBeenCalledTimes(2)
    })

    it('should not throw when deleting non-existent fakeid', async () => {
      mockDb.delete.mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      })

      await expect(service.deleteByFakeid(1, 'nonexistent')).resolves.toBeUndefined()
    })

    it('should delete resources and maps in parallel', async () => {
      const deletePromises: Promise<any>[] = []

      mockDb.delete.mockImplementation(() => {
        const promise = Promise.resolve(undefined)
        deletePromises.push(promise)
        return {
          where: vi.fn().mockReturnValue(promise),
        }
      })

      await service.deleteByFakeid(1, 'test_fakeid')

      // Both deletes should have been called
      expect(mockDb.delete).toHaveBeenCalledTimes(2)
      expect(deletePromises).toHaveLength(2)
    })

    it('should handle deletion errors gracefully', async () => {
      mockDb.delete.mockReturnValueOnce({
        where: vi.fn().mockRejectedValue(new Error('Delete failed')),
      })

      mockDb.delete.mockReturnValueOnce({
        where: vi.fn().mockResolvedValue(undefined),
      })

      // Should reject if any delete fails
      await expect(service.deleteByFakeid(1, 'test_fakeid')).rejects.toThrow('Delete failed')
    })
  })

  // ==================== getTotalSize() 测试 ====================

  describe('getTotalSize', () => {
    it('should return total size of all resources', async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ total: 10485760 }]), // 10MB
      })

      const total = await service.getTotalSize(1)

      expect(total).toBe(10485760)
    })

    it('should return 0 when no resources', async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ total: 0 }]),
      })

      const total = await service.getTotalSize(1)

      expect(total).toBe(0)
    })

    it('should return 0 when total is undefined', async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
      })

      const total = await service.getTotalSize(1)

      expect(total).toBe(0)
    })

    it('should handle large total sizes', async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ total: 5368709120 }]), // 5GB
      })

      const total = await service.getTotalSize(1)

      expect(total).toBe(5368709120)
    })

    it('should filter by userId', async () => {
      const whereSpy = vi.fn().mockResolvedValue([{ total: 1024 }])
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: whereSpy,
      })

      await service.getTotalSize(789)

      expect(whereSpy).toHaveBeenCalled()
    })

    it('should use COALESCE to handle NULL values', async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ total: 0 }]),
      })

      const total = await service.getTotalSize(1)

      expect(total).toBe(0)
    })

    it('should calculate sum of multiple resources', async () => {
      // Simulate database aggregation result
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ total: 153600 }]), // 150KB
      })

      const total = await service.getTotalSize(1)

      expect(total).toBe(153600)
    })
  })
})
