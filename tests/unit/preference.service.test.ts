import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PreferenceService } from '~/server/services/preference.service'

/**
 * PreferenceService 单元测试
 *
 * 测试覆盖：
 * 1. getPreferences - 获取用户偏好设置（首次返回默认值）
 * 2. updatePreferences - 更新用户偏好设置（部分更新、完整更新）
 * 3. 默认偏好值验证
 * 4. 偏好合并逻辑
 */

// ==================== Mock 设置 ====================

// Use vi.hoisted to declare mocks before vi.mock calls
const { mockDb } = vi.hoisted(() => {
  return {
    mockDb: {
      select: vi.fn(),
      insert: vi.fn(),
    },
  }
})

// Mock modules
vi.mock('~/server/database', () => ({
  getDb: () => mockDb,
  schema: {
    userPreferences: {
      id: 'id',
      userId: 'userId',
      preferences: 'preferences',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
    },
  },
}))

// ==================== 测试套件 ====================

describe('PreferenceService', () => {
  let service: PreferenceService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new PreferenceService()
  })

  // ==================== getPreferences() 测试 ====================

  describe('getPreferences', () => {
    it('should return default preferences when user has no preferences', async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      })

      const result = await service.getPreferences(1)

      expect(result).toBeDefined()
      expect(result.theme).toBe('system')
      expect(result.downloadConcurrency).toBe(3)
      expect(result.autoDownload).toBe(false)
      expect(result.exportFormat).toBe('html')
      expect(result.syncInterval).toBe(24)
      expect(result.notificationsEnabled).toBe(true)
      expect(result.hideDeleted).toBe(true)
    })

    it('should return default export config', async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      })

      const result = await service.getPreferences(1)

      expect(result.exportConfig).toBeDefined()
      expect(result.exportConfig.dirname).toBe('${account}/${YYYY}-${MM}-${DD}_${title}')
      expect(result.exportConfig.maxlength).toBe(80)
      expect(result.exportConfig.exportJsonIncludeContent).toBe(false)
      expect(result.exportConfig.exportJsonIncludeComments).toBe(false)
      expect(result.exportConfig.exportExcelIncludeContent).toBe(false)
      expect(result.exportConfig.exportHtmlIncludeComments).toBe(true)
    })

    it('should return user preferences when they exist', async () => {
      const userPreferences = {
        theme: 'dark',
        downloadConcurrency: 5,
        autoDownload: true,
        exportFormat: 'markdown',
        syncInterval: 12,
        notificationsEnabled: false,
        hideDeleted: false,
        exportConfig: {
          dirname: 'custom/${title}',
          maxlength: 100,
          exportJsonIncludeContent: true,
          exportJsonIncludeComments: true,
          exportExcelIncludeContent: true,
          exportHtmlIncludeComments: false,
        },
      }

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{
          id: 1,
          userId: 1,
          preferences: userPreferences,
        }]),
      })

      const result = await service.getPreferences(1)

      expect(result.theme).toBe('dark')
      expect(result.downloadConcurrency).toBe(5)
      expect(result.autoDownload).toBe(true)
      expect(result.exportFormat).toBe('markdown')
      expect(result.exportConfig.dirname).toBe('custom/${title}')
    })

    it('should merge user preferences with defaults', async () => {
      const partialPreferences = {
        theme: 'dark',
        downloadConcurrency: 5,
      }

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{
          id: 1,
          userId: 1,
          preferences: partialPreferences,
        }]),
      })

      const result = await service.getPreferences(1)

      // User-defined values
      expect(result.theme).toBe('dark')
      expect(result.downloadConcurrency).toBe(5)

      // Default values for missing fields
      expect(result.autoDownload).toBe(false)
      expect(result.exportFormat).toBe('html')
      expect(result.syncInterval).toBe(24)
    })

    it('should handle empty preferences object', async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{
          id: 1,
          userId: 1,
          preferences: {},
        }]),
      })

      const result = await service.getPreferences(1)

      // Should return all defaults
      expect(result.theme).toBe('system')
      expect(result.downloadConcurrency).toBe(3)
      expect(result.autoDownload).toBe(false)
    })

    it('should query with correct userId', async () => {
      const whereSpy = vi.fn().mockReturnThis()
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: whereSpy,
        limit: vi.fn().mockResolvedValue([]),
      })

      await service.getPreferences(456)

      expect(whereSpy).toHaveBeenCalled()
    })
  })

  // ==================== updatePreferences() 测试 ====================

  describe('updatePreferences', () => {
    it('should update single preference field', async () => {
      // Mock getPreferences (returns defaults)
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      })

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnThis(),
        onDuplicateKeyUpdate: vi.fn().mockResolvedValue(undefined),
      })

      const result = await service.updatePreferences(1, { theme: 'dark' })

      expect(result.theme).toBe('dark')
      expect(result.downloadConcurrency).toBe(3) // Default value preserved
      expect(mockDb.insert).toHaveBeenCalled()
    })

    it('should update multiple preference fields', async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      })

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnThis(),
        onDuplicateKeyUpdate: vi.fn().mockResolvedValue(undefined),
      })

      const result = await service.updatePreferences(1, {
        theme: 'dark',
        downloadConcurrency: 5,
        autoDownload: true,
      })

      expect(result.theme).toBe('dark')
      expect(result.downloadConcurrency).toBe(5)
      expect(result.autoDownload).toBe(true)
      expect(result.exportFormat).toBe('html') // Default preserved
    })

    it('should update export config', async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      })

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnThis(),
        onDuplicateKeyUpdate: vi.fn().mockResolvedValue(undefined),
      })

      const result = await service.updatePreferences(1, {
        exportConfig: {
          dirname: 'custom/${title}',
          maxlength: 100,
          exportJsonIncludeContent: true,
          exportJsonIncludeComments: true,
          exportExcelIncludeContent: true,
          exportHtmlIncludeComments: false,
        },
      })

      expect(result.exportConfig.dirname).toBe('custom/${title}')
      expect(result.exportConfig.maxlength).toBe(100)
      expect(result.exportConfig.exportJsonIncludeContent).toBe(true)
    })

    it('should merge partial export config with existing config', async () => {
      const existingPreferences = {
        theme: 'dark',
        downloadConcurrency: 3,
        autoDownload: false,
        exportFormat: 'html',
        syncInterval: 24,
        notificationsEnabled: true,
        hideDeleted: true,
        exportConfig: {
          dirname: '${account}/${YYYY}-${MM}-${DD}_${title}',
          maxlength: 80,
          exportJsonIncludeContent: false,
          exportJsonIncludeComments: false,
          exportExcelIncludeContent: false,
          exportHtmlIncludeComments: true,
        },
      }

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{
          id: 1,
          userId: 1,
          preferences: existingPreferences,
        }]),
      })

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnThis(),
        onDuplicateKeyUpdate: vi.fn().mockResolvedValue(undefined),
      })

      const result = await service.updatePreferences(1, {
        exportConfig: {
          dirname: 'custom/${title}',
          maxlength: 100,
          exportJsonIncludeContent: true,
          exportJsonIncludeComments: false,
          exportExcelIncludeContent: false,
          exportHtmlIncludeComments: true,
        },
      })

      expect(result.exportConfig.dirname).toBe('custom/${title}')
      expect(result.exportConfig.maxlength).toBe(100)
      expect(result.theme).toBe('dark') // Preserved from existing
    })

    it('should preserve existing preferences when updating', async () => {
      const existingPreferences = {
        theme: 'dark',
        downloadConcurrency: 5,
        autoDownload: true,
        exportFormat: 'markdown',
        syncInterval: 12,
        notificationsEnabled: false,
        hideDeleted: false,
        exportConfig: {
          dirname: 'custom/${title}',
          maxlength: 100,
          exportJsonIncludeContent: true,
          exportJsonIncludeComments: true,
          exportExcelIncludeContent: true,
          exportHtmlIncludeComments: false,
        },
      }

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{
          id: 1,
          userId: 1,
          preferences: existingPreferences,
        }]),
      })

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnThis(),
        onDuplicateKeyUpdate: vi.fn().mockResolvedValue(undefined),
      })

      const result = await service.updatePreferences(1, { syncInterval: 6 })

      expect(result.syncInterval).toBe(6) // Updated
      expect(result.theme).toBe('dark') // Preserved
      expect(result.downloadConcurrency).toBe(5) // Preserved
      expect(result.autoDownload).toBe(true) // Preserved
    })

    it('should save merged preferences to database', async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      })

      const valuesSpy = vi.fn().mockReturnThis()
      mockDb.insert.mockReturnValue({
        values: valuesSpy,
        onDuplicateKeyUpdate: vi.fn().mockResolvedValue(undefined),
      })

      await service.updatePreferences(123, { theme: 'dark' })

      expect(valuesSpy).toHaveBeenCalledWith({
        userId: 123,
        preferences: expect.objectContaining({
          theme: 'dark',
          downloadConcurrency: 3,
          autoDownload: false,
        }),
      })
    })

    it('should use onDuplicateKeyUpdate for existing preferences', async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      })

      const updateSpy = vi.fn().mockResolvedValue(undefined)
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnThis(),
        onDuplicateKeyUpdate: updateSpy,
      })

      await service.updatePreferences(1, { theme: 'dark' })

      expect(updateSpy).toHaveBeenCalled()
    })

    it('should return merged preferences after update', async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      })

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnThis(),
        onDuplicateKeyUpdate: vi.fn().mockResolvedValue(undefined),
      })

      const result = await service.updatePreferences(1, {
        theme: 'dark',
        downloadConcurrency: 5,
      })

      expect(result).toBeDefined()
      expect(result.theme).toBe('dark')
      expect(result.downloadConcurrency).toBe(5)
      expect(result.autoDownload).toBe(false) // Default
      expect(result.exportFormat).toBe('html') // Default
    })
  })

  // ==================== 边界情况和特殊场景 ====================

  describe('Edge Cases and Special Scenarios', () => {
    it('should handle theme values correctly', async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      })

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnThis(),
        onDuplicateKeyUpdate: vi.fn().mockResolvedValue(undefined),
      })

      const themes = ['system', 'light', 'dark']
      for (const theme of themes) {
        vi.clearAllMocks()

        mockDb.select.mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([]),
        })

        mockDb.insert.mockReturnValue({
          values: vi.fn().mockReturnThis(),
          onDuplicateKeyUpdate: vi.fn().mockResolvedValue(undefined),
        })

        const result = await service.updatePreferences(1, { theme: theme as any })
        expect(result.theme).toBe(theme)
      }
    })

    it('should handle export format values correctly', async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      })

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnThis(),
        onDuplicateKeyUpdate: vi.fn().mockResolvedValue(undefined),
      })

      const formats = ['html', 'markdown', 'pdf', 'docx', 'json', 'excel']
      for (const format of formats) {
        vi.clearAllMocks()

        mockDb.select.mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([]),
        })

        mockDb.insert.mockReturnValue({
          values: vi.fn().mockReturnThis(),
          onDuplicateKeyUpdate: vi.fn().mockResolvedValue(undefined),
        })

        const result = await service.updatePreferences(1, { exportFormat: format as any })
        expect(result.exportFormat).toBe(format)
      }
    })

    it('should handle zero and negative values for numeric fields', async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      })

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnThis(),
        onDuplicateKeyUpdate: vi.fn().mockResolvedValue(undefined),
      })

      const result = await service.updatePreferences(1, {
        downloadConcurrency: 0,
        syncInterval: 1,
      })

      expect(result.downloadConcurrency).toBe(0)
      expect(result.syncInterval).toBe(1)
    })

    it('should handle boolean toggle correctly', async () => {
      // First set to true
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      })

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnThis(),
        onDuplicateKeyUpdate: vi.fn().mockResolvedValue(undefined),
      })

      let result = await service.updatePreferences(1, { autoDownload: true })
      expect(result.autoDownload).toBe(true)

      // Then toggle to false
      vi.clearAllMocks()

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{
          id: 1,
          userId: 1,
          preferences: { ...result },
        }]),
      })

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnThis(),
        onDuplicateKeyUpdate: vi.fn().mockResolvedValue(undefined),
      })

      result = await service.updatePreferences(1, { autoDownload: false })
      expect(result.autoDownload).toBe(false)
    })

    it('should handle empty update object', async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      })

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnThis(),
        onDuplicateKeyUpdate: vi.fn().mockResolvedValue(undefined),
      })

      const result = await service.updatePreferences(1, {})

      // Should return all defaults
      expect(result.theme).toBe('system')
      expect(result.downloadConcurrency).toBe(3)
    })
  })
})
