import { describe, it, expect, vi, beforeEach } from 'vitest'
import { FileService } from '~/server/services/file.service'

/**
 * FileService 单元测试
 *
 * 测试覆盖：
 * 1. getUploadPath - 获取上传路径
 * 2. getExportPath - 获取导出路径
 * 3. ensureDir - 确保目录存在
 * 4. saveFile - 保存文件
 * 5. readFile - 读取文件
 * 6. deleteFile - 删除文件
 * 7. deleteDir - 删除目录
 * 8. getFileSize - 获取文件大小
 * 9. fileExists - 检查文件是否存在
 * 10. checkQuota - 检查存储配额
 * 11. updateStorageUsed - 更新已用存储
 * 12. recalculateStorage - 重新计算存储
 */

// ==================== Mock 设置 ====================

// Use vi.hoisted to declare mocks before vi.mock calls
const { mockFs, mockDb, mockUseRuntimeConfig } = vi.hoisted(() => {
  return {
    mockFs: {
      mkdir: vi.fn(),
      writeFile: vi.fn(),
      readFile: vi.fn(),
      unlink: vi.fn(),
      rm: vi.fn(),
      stat: vi.fn(),
      access: vi.fn(),
    },
    mockDb: {
      select: vi.fn(),
      update: vi.fn(),
    },
    mockUseRuntimeConfig: vi.fn(() => ({
      dataDir: './test-data',
    })),
  }
})

// Mock modules
vi.mock('fs', () => ({
  promises: mockFs,
}))

vi.mock('~/server/database', () => ({
  getDb: () => mockDb,
  schema: {
    users: {
      id: 'id',
      storageQuota: 'storageQuota',
      storageUsed: 'storageUsed',
    },
    articleHtml: {
      userId: 'userId',
      fileSize: 'file_size',
    },
    resources: {
      userId: 'userId',
      fileSize: 'file_size',
    },
  },
}))

// Mock global useRuntimeConfig (Nuxt function)
global.useRuntimeConfig = mockUseRuntimeConfig as any

// ==================== 测试套件 ====================

describe('FileService', () => {
  let service: FileService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new FileService()
  })

  // ==================== getUploadPath() 测试 ====================

  describe('getUploadPath', () => {
    it('should return correct html upload path', () => {
      const path = service.getUploadPath(1, 'test_fakeid', 'html')
      expect(path).toContain('test-data')
      expect(path).toContain('uploads')
      expect(path).toContain('1')
      expect(path).toContain('test_fakeid')
      expect(path).toContain('html')
    })

    it('should return correct resources upload path', () => {
      const path = service.getUploadPath(1, 'test_fakeid', 'resources')
      expect(path).toContain('test-data')
      expect(path).toContain('uploads')
      expect(path).toContain('1')
      expect(path).toContain('test_fakeid')
      expect(path).toContain('resources')
    })

    it('should default to html type when not specified', () => {
      const path = service.getUploadPath(1, 'test_fakeid')
      expect(path).toContain('html')
    })

    it('should handle different user IDs', () => {
      const path1 = service.getUploadPath(1, 'fakeid')
      const path2 = service.getUploadPath(999, 'fakeid')

      expect(path1).toContain('1')
      expect(path2).toContain('999')
      expect(path1).not.toBe(path2)
    })

    it('should handle different fakeids', () => {
      const path1 = service.getUploadPath(1, 'fakeid1')
      const path2 = service.getUploadPath(1, 'fakeid2')

      expect(path1).toContain('fakeid1')
      expect(path2).toContain('fakeid2')
      expect(path1).not.toBe(path2)
    })
  })

  // ==================== getExportPath() 测试 ====================

  describe('getExportPath', () => {
    it('should return correct export path', () => {
      const path = service.getExportPath()
      expect(path).toContain('test-data')
      expect(path).toContain('exports')
    })
  })

  // ==================== ensureDir() 测试 ====================

  describe('ensureDir', () => {
    it('should create directory with recursive option', async () => {
      mockFs.mkdir.mockResolvedValue(undefined)

      await service.ensureDir('/test/path')

      expect(mockFs.mkdir).toHaveBeenCalledWith('/test/path', { recursive: true })
    })

    it('should handle errors', async () => {
      mockFs.mkdir.mockRejectedValue(new Error('Permission denied'))

      await expect(service.ensureDir('/forbidden/path')).rejects.toThrow('Permission denied')
    })
  })

  // ==================== saveFile() 测试 ====================

  describe('saveFile', () => {
    it('should save string content and return file size', async () => {
      mockFs.mkdir.mockResolvedValue(undefined)
      mockFs.writeFile.mockResolvedValue(undefined)
      mockFs.stat.mockResolvedValue({ size: 1024 } as any)

      const size = await service.saveFile('/test/file.txt', 'test content')

      expect(mockFs.mkdir).toHaveBeenCalled()
      expect(mockFs.writeFile).toHaveBeenCalledWith('/test/file.txt', 'test content')
      expect(size).toBe(1024)
    })

    it('should save Buffer content and return file size', async () => {
      const buffer = Buffer.from('test content')
      mockFs.mkdir.mockResolvedValue(undefined)
      mockFs.writeFile.mockResolvedValue(undefined)
      mockFs.stat.mockResolvedValue({ size: 2048 } as any)

      const size = await service.saveFile('/test/file.bin', buffer)

      expect(mockFs.writeFile).toHaveBeenCalledWith('/test/file.bin', buffer)
      expect(size).toBe(2048)
    })

    it('should create parent directory if not exists', async () => {
      mockFs.mkdir.mockResolvedValue(undefined)
      mockFs.writeFile.mockResolvedValue(undefined)
      mockFs.stat.mockResolvedValue({ size: 100 } as any)

      await service.saveFile('/path/to/nested/file.txt', 'content')

      expect(mockFs.mkdir).toHaveBeenCalled()
    })

    it('should handle write errors', async () => {
      mockFs.mkdir.mockResolvedValue(undefined)
      mockFs.writeFile.mockRejectedValue(new Error('Disk full'))

      await expect(service.saveFile('/test/file.txt', 'content')).rejects.toThrow('Disk full')
    })
  })

  // ==================== readFile() 测试 ====================

  describe('readFile', () => {
    it('should read and return file content as Buffer', async () => {
      const buffer = Buffer.from('file content')
      mockFs.readFile.mockResolvedValue(buffer)

      const result = await service.readFile('/test/file.txt')

      expect(mockFs.readFile).toHaveBeenCalledWith('/test/file.txt')
      expect(result).toBe(buffer)
    })

    it('should handle file not found error', async () => {
      mockFs.readFile.mockRejectedValue(new Error('ENOENT: no such file'))

      await expect(service.readFile('/nonexistent/file.txt')).rejects.toThrow('ENOENT')
    })
  })

  // ==================== deleteFile() 测试 ====================

  describe('deleteFile', () => {
    it('should delete file successfully', async () => {
      mockFs.unlink.mockResolvedValue(undefined)

      await service.deleteFile('/test/file.txt')

      expect(mockFs.unlink).toHaveBeenCalledWith('/test/file.txt')
    })

    it('should not throw when file does not exist', async () => {
      mockFs.unlink.mockRejectedValue(new Error('ENOENT'))

      // Should not throw
      await expect(service.deleteFile('/nonexistent/file.txt')).resolves.toBeUndefined()
    })

    it('should not throw on permission errors', async () => {
      mockFs.unlink.mockRejectedValue(new Error('EACCES'))

      // Should not throw
      await expect(service.deleteFile('/forbidden/file.txt')).resolves.toBeUndefined()
    })
  })

  // ==================== deleteDir() 测试 ====================

  describe('deleteDir', () => {
    it('should delete directory recursively', async () => {
      mockFs.rm.mockResolvedValue(undefined)

      await service.deleteDir('/test/dir')

      expect(mockFs.rm).toHaveBeenCalledWith('/test/dir', { recursive: true, force: true })
    })

    it('should not throw when directory does not exist', async () => {
      mockFs.rm.mockRejectedValue(new Error('ENOENT'))

      // Should not throw
      await expect(service.deleteDir('/nonexistent/dir')).resolves.toBeUndefined()
    })

    it('should not throw on permission errors', async () => {
      mockFs.rm.mockRejectedValue(new Error('EACCES'))

      // Should not throw
      await expect(service.deleteDir('/forbidden/dir')).resolves.toBeUndefined()
    })
  })

  // ==================== getFileSize() 测试 ====================

  describe('getFileSize', () => {
    it('should return file size when file exists', async () => {
      mockFs.stat.mockResolvedValue({ size: 4096 } as any)

      const size = await service.getFileSize('/test/file.txt')

      expect(mockFs.stat).toHaveBeenCalledWith('/test/file.txt')
      expect(size).toBe(4096)
    })

    it('should return 0 when file does not exist', async () => {
      mockFs.stat.mockRejectedValue(new Error('ENOENT'))

      const size = await service.getFileSize('/nonexistent/file.txt')

      expect(size).toBe(0)
    })

    it('should return 0 on any error', async () => {
      mockFs.stat.mockRejectedValue(new Error('Unknown error'))

      const size = await service.getFileSize('/test/file.txt')

      expect(size).toBe(0)
    })
  })

  // ==================== fileExists() 测试 ====================

  describe('fileExists', () => {
    it('should return true when file exists', async () => {
      mockFs.access.mockResolvedValue(undefined)

      const exists = await service.fileExists('/test/file.txt')

      expect(mockFs.access).toHaveBeenCalledWith('/test/file.txt')
      expect(exists).toBe(true)
    })

    it('should return false when file does not exist', async () => {
      mockFs.access.mockRejectedValue(new Error('ENOENT'))

      const exists = await service.fileExists('/nonexistent/file.txt')

      expect(exists).toBe(false)
    })

    it('should return false on permission errors', async () => {
      mockFs.access.mockRejectedValue(new Error('EACCES'))

      const exists = await service.fileExists('/forbidden/file.txt')

      expect(exists).toBe(false)
    })
  })

  // ==================== checkQuota() 测试 ====================

  describe('checkQuota', () => {
    it('should return true when quota is sufficient', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{
          storageQuota: 5368709120, // 5GB
          storageUsed: 1073741824,  // 1GB
        }]),
      })

      const hasQuota = await service.checkQuota(1, 1024 * 1024) // 1MB

      expect(hasQuota).toBe(true)
    })

    it('should return false when quota would be exceeded', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{
          storageQuota: 5368709120,    // 5GB
          storageUsed: 5368000000,      // Almost 5GB
        }]),
      })

      const hasQuota = await service.checkQuota(1, 1073741824) // 1GB

      expect(hasQuota).toBe(false)
    })

    it('should return false when user not found', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      })

      const hasQuota = await service.checkQuota(999, 1024)

      expect(hasQuota).toBe(false)
    })

    it('should handle exact quota limit', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{
          storageQuota: 1000,
          storageUsed: 500,
        }]),
      })

      const hasQuotaExact = await service.checkQuota(1, 500)
      expect(hasQuotaExact).toBe(true) // Exactly at limit

      const hasQuotaOver = await service.checkQuota(1, 501)
      expect(hasQuotaOver).toBe(false) // Over limit
    })

    it('should handle zero additional bytes', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{
          storageQuota: 1000,
          storageUsed: 999,
        }]),
      })

      const hasQuota = await service.checkQuota(1, 0)

      expect(hasQuota).toBe(true)
    })
  })

  // ==================== updateStorageUsed() 测试 ====================

  describe('updateStorageUsed', () => {
    it('should update storage with positive delta', async () => {
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      })

      await service.updateStorageUsed(1, 1024)

      expect(mockDb.update).toHaveBeenCalled()
    })

    it('should update storage with negative delta', async () => {
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      })

      await service.updateStorageUsed(1, -1024)

      expect(mockDb.update).toHaveBeenCalled()
    })

    it('should handle zero delta', async () => {
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      })

      await service.updateStorageUsed(1, 0)

      expect(mockDb.update).toHaveBeenCalled()
    })
  })

  // ==================== recalculateStorage() 测试 ====================

  describe('recalculateStorage', () => {
    it('should recalculate total storage from html and resources', async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ total: 1000 }]),
      })

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ total: 2000 }]),
      })

      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      })

      const total = await service.recalculateStorage(1)

      expect(total).toBe(3000)
      expect(mockDb.update).toHaveBeenCalled()
    })

    it('should handle when no html files exist', async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ total: 0 }]),
      })

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ total: 1000 }]),
      })

      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      })

      const total = await service.recalculateStorage(1)

      expect(total).toBe(1000)
    })

    it('should handle when no resources exist', async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ total: 1000 }]),
      })

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ total: 0 }]),
      })

      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      })

      const total = await service.recalculateStorage(1)

      expect(total).toBe(1000)
    })

    it('should handle when both are zero', async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ total: 0 }]),
      })

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ total: 0 }]),
      })

      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      })

      const total = await service.recalculateStorage(1)

      expect(total).toBe(0)
    })

    it('should handle null/undefined totals', async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
      })

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
      })

      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      })

      const total = await service.recalculateStorage(1)

      expect(total).toBe(0)
    })
  })
})
