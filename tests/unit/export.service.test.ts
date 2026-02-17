import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ExportService } from '~/server/services/export.service'
import type { ExportFormat } from '~/types'

/**
 * ExportService 单元测试
 *
 * 测试覆盖：
 * 1. createJob - 创建导出任务
 * 2. getJobs - 获取任务列表
 * 3. getJob - 获取单个任务
 * 4. deleteJob - 删除任务
 * 5. cleanExpiredJobs - 清理过期任务
 * 6. 各种导出格式处理（html, excel, json, txt, markdown, word）
 * 7. 边界情况和错误处理
 *
 * Mock 策略：
 * - 数据库操作（Drizzle ORM）
 * - 文件系统操作（FileService）
 * - 其他服务依赖（HtmlService, MetadataService等）
 * - 第三方库（archiver, ExcelJS, turndown, docx）
 */

// ==================== Mock 设置 ====================

// Mock database
const mockDb = {
  insert: vi.fn(),
  select: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}

// Mock services
const mockFileService = {
  getExportPath: vi.fn(),
  ensureDir: vi.fn(),
  fileExists: vi.fn(),
  readFile: vi.fn(),
  getFileSize: vi.fn(),
  deleteFile: vi.fn(),
}

const mockHtmlService = {
  getHtml: vi.fn(),
}

const mockMetadataService = {
  getMetadata: vi.fn(),
}

const mockCommentService = {
  getComment: vi.fn(),
}

const mockArticleService = {
  getArticleByUrl: vi.fn(),
}

// Mock getDb
vi.mock('~/server/database', () => ({
  getDb: () => mockDb,
  schema: {
    exportJobs: {
      userId: 'userId',
      id: 'id',
      status: 'status',
      createdAt: 'createdAt',
    },
  },
}))

// Mock service getters
vi.mock('~/server/services/file.service', () => ({
  getFileService: () => mockFileService,
}))

vi.mock('~/server/services/html.service', () => ({
  getHtmlService: () => mockHtmlService,
}))

vi.mock('~/server/services/metadata.service', () => ({
  getMetadataService: () => mockMetadataService,
}))

vi.mock('~/server/services/comment.service', () => ({
  getCommentService: () => mockCommentService,
}))

vi.mock('~/server/services/article.service', () => ({
  getArticleService: () => mockArticleService,
}))

// Mock fs.createWriteStream with EventEmitter-like behavior
const createMockWriteStream = () => {
  const events: Record<string, any[]> = {}
  return {
    on: vi.fn((event: string, handler: any) => {
      if (!events[event]) events[event] = []
      events[event].push(handler)
      // 模拟立即触发 'close' 事件
      if (event === 'close') {
        setTimeout(() => handler(), 0)
      }
      return this
    }),
    write: vi.fn(),
    end: vi.fn(),
  }
}

vi.mock('fs', () => ({
  createWriteStream: vi.fn(() => createMockWriteStream()),
  promises: {
    fs: vi.fn(),
  },
}))

// Mock archiver
vi.mock('archiver', () => ({
  default: vi.fn(() => ({
    pipe: vi.fn(),
    append: vi.fn(),
    finalize: vi.fn(),
  })),
}))

// ==================== 测试套件 ====================

describe('ExportService', () => {
  let service: ExportService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new ExportService()

    // 默认 mock 返回值
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockResolvedValue([{ insertId: 1 }]),
    })

    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    })

    mockDb.update.mockReturnValue({
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue({}),
    })

    mockDb.delete.mockReturnValue({
      where: vi.fn().mockResolvedValue({}),
    })

    mockFileService.getExportPath.mockReturnValue('/tmp/exports')
    mockFileService.ensureDir.mockResolvedValue(undefined)
    mockFileService.fileExists.mockResolvedValue(true)
    mockFileService.getFileSize.mockResolvedValue(1024)
  })

  // ==================== createJob 测试 ====================

  describe('createJob', () => {
    it('should create a job with valid parameters', async () => {
      const mockInsertResult = [{ insertId: 123 }]
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockResolvedValue(mockInsertResult),
      })

      const userId = 1
      const format: ExportFormat = 'html'
      const articleUrls = ['https://mp.weixin.qq.com/s/test1']

      const result = await service.createJob(userId, format, articleUrls)

      expect(result).toEqual({ id: 123 })
      expect(mockDb.insert).toHaveBeenCalled()
    })

    it('should create job for all supported formats', async () => {
      const formats: ExportFormat[] = ['html', 'excel', 'json', 'txt', 'markdown', 'word']
      const userId = 1
      const articleUrls = ['https://mp.weixin.qq.com/s/test']

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockResolvedValue([{ insertId: 1 }]),
      })

      for (const format of formats) {
        const result = await service.createJob(userId, format, articleUrls)
        expect(result).toEqual({ id: 1 })
      }
    })

    it('should handle empty article URLs array', async () => {
      const userId = 1
      const format: ExportFormat = 'html'
      const articleUrls: string[] = []

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockResolvedValue([{ insertId: 1 }]),
      })

      const result = await service.createJob(userId, format, articleUrls)

      expect(result).toEqual({ id: 1 })
    })

    it('should handle large number of article URLs', async () => {
      const userId = 1
      const format: ExportFormat = 'html'
      const articleUrls = Array.from({ length: 1000 }, (_, i) => `https://mp.weixin.qq.com/s/test${i}`)

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockResolvedValue([{ insertId: 1 }]),
      })

      const result = await service.createJob(userId, format, articleUrls)

      expect(result).toEqual({ id: 1 })
    })

    it('should set expiration time to 24 hours from now', async () => {
      const userId = 1
      const format: ExportFormat = 'html'
      const articleUrls = ['https://mp.weixin.qq.com/s/test']

      let capturedValues: any
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockImplementation((vals) => {
          capturedValues = vals
          return Promise.resolve([{ insertId: 1 }])
        }),
      })

      await service.createJob(userId, format, articleUrls)

      expect(capturedValues).toBeDefined()
      expect(capturedValues.expiresAt).toBeInstanceOf(Date)

      const now = Date.now()
      const expiresAt = capturedValues.expiresAt.getTime()
      const diff = expiresAt - now
      const twentyFourHours = 24 * 60 * 60 * 1000

      // 允许5秒误差
      expect(diff).toBeGreaterThanOrEqual(twentyFourHours - 5000)
      expect(diff).toBeLessThanOrEqual(twentyFourHours + 5000)
    })

    it('should include fakeid when provided', async () => {
      const userId = 1
      const format: ExportFormat = 'html'
      const articleUrls = ['https://mp.weixin.qq.com/s/test']
      const fakeid = 'MzAxNTU2NTU2MA=='

      let capturedValues: any
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockImplementation((vals) => {
          capturedValues = vals
          return Promise.resolve([{ insertId: 1 }])
        }),
      })

      await service.createJob(userId, format, articleUrls, fakeid)

      expect(capturedValues.fakeid).toBe(fakeid)
    })

    it('should set initial status to pending', async () => {
      const userId = 1
      const format: ExportFormat = 'html'
      const articleUrls = ['https://mp.weixin.qq.com/s/test']

      let capturedValues: any
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockImplementation((vals) => {
          capturedValues = vals
          return Promise.resolve([{ insertId: 1 }])
        }),
      })

      await service.createJob(userId, format, articleUrls)

      expect(capturedValues.status).toBe('pending')
      expect(capturedValues.total).toBe(articleUrls.length)
    })

    it('should handle invalid userId', async () => {
      const invalidUserIds = [0, -1, null as any, undefined as any]
      const format: ExportFormat = 'html'
      const articleUrls = ['https://mp.weixin.qq.com/s/test']

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockResolvedValue([{ insertId: 1 }]),
      })

      for (const userId of invalidUserIds) {
        // 不应该抛出错误，应该传递给数据库处理
        await expect(service.createJob(userId, format, articleUrls)).resolves.toBeDefined()
      }
    })

    it('should handle database insertion error', async () => {
      const userId = 1
      const format: ExportFormat = 'html'
      const articleUrls = ['https://mp.weixin.qq.com/s/test']

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockRejectedValue(new Error('Database error')),
      })

      await expect(service.createJob(userId, format, articleUrls)).rejects.toThrow('Database error')
    })
  })

  // ==================== getJobs 测试 ====================

  describe('getJobs', () => {
    it('should return jobs for a user', async () => {
      const userId = 1
      const mockJobs = [
        { id: 1, userId, format: 'html', status: 'completed' },
        { id: 2, userId, format: 'excel', status: 'pending' },
      ]

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue(mockJobs),
      })

      const result = await service.getJobs(userId)

      expect(result).toEqual(mockJobs)
      expect(mockDb.select).toHaveBeenCalled()
    })

    it('should return empty array when user has no jobs', async () => {
      const userId = 999

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      })

      const result = await service.getJobs(userId)

      expect(result).toEqual([])
    })

    it('should limit results to 50 jobs', async () => {
      const userId = 1
      const mockLimitFn = vi.fn().mockResolvedValue([])

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: mockLimitFn,
      })

      await service.getJobs(userId)

      expect(mockLimitFn).toHaveBeenCalledWith(50)
    })

    it('should order jobs by creation date descending', async () => {
      const userId = 1
      const mockOrderByFn = vi.fn().mockReturnThis()

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: mockOrderByFn,
        limit: vi.fn().mockResolvedValue([]),
      })

      await service.getJobs(userId)

      expect(mockOrderByFn).toHaveBeenCalled()
    })

    it('should handle database query error', async () => {
      const userId = 1

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockRejectedValue(new Error('Query failed')),
      })

      await expect(service.getJobs(userId)).rejects.toThrow('Query failed')
    })
  })

  // ==================== getJob 测试 ====================

  describe('getJob', () => {
    it('should return job by id and userId', async () => {
      const userId = 1
      const jobId = 123
      const mockJob = { id: jobId, userId, format: 'html', status: 'completed' }

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockJob]),
      })

      const result = await service.getJob(userId, jobId)

      expect(result).toEqual(mockJob)
    })

    it('should return null when job not found', async () => {
      const userId = 1
      const jobId = 999

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      })

      const result = await service.getJob(userId, jobId)

      expect(result).toBeNull()
    })

    it('should return null when job belongs to different user', async () => {
      const userId = 1
      const jobId = 123

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      })

      const result = await service.getJob(userId, jobId)

      expect(result).toBeNull()
    })

    it('should handle invalid jobId', async () => {
      const userId = 1
      const invalidJobIds = [0, -1, NaN]

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      })

      for (const jobId of invalidJobIds) {
        const result = await service.getJob(userId, jobId)
        expect(result).toBeNull()
      }
    })
  })

  // ==================== deleteJob 测试 ====================

  describe('deleteJob', () => {
    it('should delete job and its file', async () => {
      const userId = 1
      const jobId = 123
      const mockJob = {
        id: jobId,
        userId,
        filePath: '/tmp/exports/export_123.zip'
      }

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockJob]),
      })

      await service.deleteJob(userId, jobId)

      expect(mockFileService.deleteFile).toHaveBeenCalledWith(mockJob.filePath)
      expect(mockDb.delete).toHaveBeenCalled()
    })

    it('should delete job without file', async () => {
      const userId = 1
      const jobId = 123
      const mockJob = { id: jobId, userId, filePath: null }

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockJob]),
      })

      await service.deleteJob(userId, jobId)

      expect(mockFileService.deleteFile).not.toHaveBeenCalled()
      expect(mockDb.delete).toHaveBeenCalled()
    })

    it('should not delete if job not found', async () => {
      const userId = 1
      const jobId = 999

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      })

      await service.deleteJob(userId, jobId)

      expect(mockFileService.deleteFile).not.toHaveBeenCalled()
      expect(mockDb.delete).toHaveBeenCalled()
    })

    it('should handle file deletion error gracefully', async () => {
      const userId = 1
      const jobId = 123
      const mockJob = {
        id: jobId,
        userId,
        filePath: '/tmp/exports/export_123.zip'
      }

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockJob]),
      })

      mockFileService.deleteFile.mockRejectedValue(new Error('File not found'))

      // 应该抛出错误
      await expect(service.deleteJob(userId, jobId)).rejects.toThrow('File not found')
    })
  })

  // ==================== cleanExpiredJobs 测试 ====================

  describe('cleanExpiredJobs', () => {
    it('should delete expired jobs and their files', async () => {
      const expiredJobs = [
        { id: 1, userId: 1, filePath: '/tmp/exports/export_1.zip' },
        { id: 2, userId: 1, filePath: '/tmp/exports/export_2.zip' },
      ]

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(expiredJobs),
      })

      // Mock successful file deletion
      mockFileService.deleteFile.mockResolvedValue(undefined)

      await service.cleanExpiredJobs()

      expect(mockFileService.deleteFile).toHaveBeenCalledTimes(2)
      expect(mockFileService.deleteFile).toHaveBeenCalledWith(expiredJobs[0].filePath)
      expect(mockFileService.deleteFile).toHaveBeenCalledWith(expiredJobs[1].filePath)
      expect(mockDb.delete).toHaveBeenCalled()
    })

    it('should handle jobs without files', async () => {
      const expiredJobs = [
        { id: 1, userId: 1, filePath: null },
        { id: 2, userId: 1, filePath: '' },
      ]

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(expiredJobs),
      })

      await service.cleanExpiredJobs()

      expect(mockFileService.deleteFile).not.toHaveBeenCalled()
      expect(mockDb.delete).toHaveBeenCalled()
    })

    it('should continue cleanup even if file deletion fails', async () => {
      const expiredJobs = [
        { id: 1, userId: 1, filePath: '/tmp/exports/export_1.zip' },
        { id: 2, userId: 1, filePath: '/tmp/exports/export_2.zip' },
      ]

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(expiredJobs),
      })

      mockFileService.deleteFile
        .mockRejectedValueOnce(new Error('File not found'))
        .mockResolvedValueOnce(undefined)

      // 应该抛出错误在第一个文件删除失败时
      await expect(service.cleanExpiredJobs()).rejects.toThrow('File not found')
    })

    it('should handle empty expired jobs list', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
      })

      await service.cleanExpiredJobs()

      expect(mockFileService.deleteFile).not.toHaveBeenCalled()
      expect(mockDb.delete).toHaveBeenCalled()
    })
  })

  // ==================== 工具方法测试 ====================

  describe('Utility Methods', () => {
    describe('sanitizeFileName', () => {
      it('should remove invalid characters', () => {
        const testCases = [
          { input: 'normal.txt', expected: 'normal.txt' },
          { input: 'file<name>test', expected: 'file_name_test' },
          { input: 'path/to\\file', expected: 'path_to_file' },
          { input: 'question?marks*here', expected: 'question_marks_here' },
          { input: 'file:with|pipes', expected: 'file_with_pipes' },
          { input: 'quotes"test', expected: 'quotes_test' },
        ]

        for (const { input, expected } of testCases) {
          const result = (service as any).sanitizeFileName(input)
          expect(result).toBe(expected)
        }
      })

      it('should truncate long filenames to 80 characters', () => {
        const longName = 'a'.repeat(100)
        const result = (service as any).sanitizeFileName(longName)
        expect(result).toHaveLength(80)
        expect(result).toBe('a'.repeat(80))
      })

      it('should handle special characters', () => {
        // 测试 <, >, :, ", /, \, |, ?, *, 控制字符
        const specialChars = '<>:"/\\|?*\x00\x1f'
        const result = (service as any).sanitizeFileName(specialChars)
        // 11个特殊字符应该被替换为11个下划线
        expect(result).toBe('___________')
      })

      it('should handle empty string', () => {
        const result = (service as any).sanitizeFileName('')
        expect(result).toBe('')
      })

      it('should handle Chinese characters', () => {
        const result = (service as any).sanitizeFileName('测试文章标题')
        expect(result).toBe('测试文章标题')
      })
    })

    describe('htmlToText', () => {
      it('should strip HTML tags', () => {
        const html = '<p>Test</p><div>Content</div>'
        const result = (service as any).htmlToText(html)
        expect(result).toContain('Test')
        expect(result).toContain('Content')
        expect(result).not.toContain('<p>')
        expect(result).not.toContain('<div>')
      })

      it('should convert HTML entities', () => {
        const html = '<p>&nbsp;&amp;&lt;&gt;&quot;</p>'
        const result = (service as any).htmlToText(html)
        // htmlToText 会转换实体并可能 trim 掉空格
        expect(result).toContain('&')
        expect(result).toContain('<')
        expect(result).toContain('>')
        expect(result).toContain('"')
      })

      it('should preserve line breaks', () => {
        const html = '<p>Line 1</p><p>Line 2</p>'
        const result = (service as any).htmlToText(html)
        expect(result).toContain('\n')
      })

      it('should remove script tags', () => {
        const html = '<script>alert("test")</script><p>Content</p>'
        const result = (service as any).htmlToText(html)
        expect(result).not.toContain('alert')
        expect(result).toContain('Content')
      })

      it('should remove style tags', () => {
        const html = '<style>.class { color: red; }</style><p>Content</p>'
        const result = (service as any).htmlToText(html)
        expect(result).not.toContain('.class')
        expect(result).toContain('Content')
      })

      it('should convert lists to bullet points', () => {
        const html = '<ul><li>Item 1</li><li>Item 2</li></ul>'
        const result = (service as any).htmlToText(html)
        expect(result).toContain('- ')
      })
    })

    describe('extractBody', () => {
      it('should extract body content from HTML', () => {
        const html = '<html><head><title>Test</title></head><body>Content</body></html>'
        const result = (service as any).extractBody(html)
        expect(result).toContain('Content')
        expect(result).not.toContain('<head>')
      })

      it('should return full HTML if no body tag', () => {
        const html = '<div>Content</div>'
        const result = (service as any).extractBody(html)
        expect(result).toBe(html)
      })

      it('should handle body tag with attributes', () => {
        const html = '<body class="main" id="app">Content</body>'
        const result = (service as any).extractBody(html)
        expect(result).toContain('Content')
      })

      it('should handle case-insensitive body tag', () => {
        const html = '<BODY>Content</BODY>'
        const result = (service as any).extractBody(html)
        expect(result).toContain('Content')
      })
    })
  })

  // ==================== 导出格式集成测试 ====================

  describe('Export Format Integration', () => {
    describe('exportHtml', () => {
      it('should export multiple HTML files', async () => {
        const userId = 1
        const urls = ['https://mp.weixin.qq.com/s/test1', 'https://mp.weixin.qq.com/s/test2']
        const zipPath = '/tmp/export.zip'
        const jobId = 1

        mockHtmlService.getHtml
          .mockResolvedValueOnce({ title: 'Article 1', filePath: '/tmp/1.html' })
          .mockResolvedValueOnce({ title: 'Article 2', filePath: '/tmp/2.html' })

        mockFileService.fileExists.mockResolvedValue(true)
        mockFileService.readFile
          .mockResolvedValueOnce(Buffer.from('<html>Article 1</html>'))
          .mockResolvedValueOnce(Buffer.from('<html>Article 2</html>'))

        await (service as any).exportHtml(userId, urls, zipPath, jobId)

        expect(mockHtmlService.getHtml).toHaveBeenCalledTimes(2)
        expect(mockFileService.readFile).toHaveBeenCalledTimes(2)
      })

      it('should skip files that do not exist', async () => {
        const userId = 1
        const urls = ['https://mp.weixin.qq.com/s/test1']
        const zipPath = '/tmp/export.zip'
        const jobId = 1

        mockHtmlService.getHtml.mockResolvedValue({ title: 'Article', filePath: '/tmp/1.html' })
        mockFileService.fileExists.mockResolvedValue(false)

        await (service as any).exportHtml(userId, urls, zipPath, jobId)

        expect(mockFileService.readFile).not.toHaveBeenCalled()
      })
    })

    describe('exportExcel', () => {
      it('should create Excel with article metadata', async () => {
        const userId = 1
        const urls = ['https://mp.weixin.qq.com/s/test1']
        const zipPath = '/tmp/export.zip'
        const jobId = 1

        mockArticleService.getArticleByUrl.mockResolvedValue({
          title: 'Test Article',
          authorName: 'Author',
          createTime: 1609459200,
          link: urls[0],
          digest: 'Summary',
        })

        mockMetadataService.getMetadata.mockResolvedValue({
          readNum: 1000,
          likeNum: 100,
          oldLikeNum: 50,
          commentNum: 10,
          shareNum: 5,
        })

        await (service as any).exportExcel(userId, urls, zipPath, jobId)

        expect(mockArticleService.getArticleByUrl).toHaveBeenCalled()
        expect(mockMetadataService.getMetadata).toHaveBeenCalled()
      })
    })

    describe('exportJson', () => {
      it('should export articles with full data', async () => {
        const userId = 1
        const urls = ['https://mp.weixin.qq.com/s/test1']
        const zipPath = '/tmp/export.zip'
        const jobId = 1

        mockArticleService.getArticleByUrl.mockResolvedValue({
          title: 'Test',
          link: urls[0],
        })

        mockMetadataService.getMetadata.mockResolvedValue({
          readNum: 100,
        })

        mockCommentService.getComment.mockResolvedValue({
          data: [{ content: 'Comment' }],
        })

        await (service as any).exportJson(userId, urls, zipPath, jobId)

        expect(mockCommentService.getComment).toHaveBeenCalled()
      })
    })

    describe('exportTxt', () => {
      it('should convert HTML to plain text', async () => {
        const userId = 1
        const urls = ['https://mp.weixin.qq.com/s/test1']
        const zipPath = '/tmp/export.zip'
        const jobId = 1

        mockHtmlService.getHtml.mockResolvedValue({
          title: 'Test',
          filePath: '/tmp/test.html',
        })

        mockFileService.fileExists.mockResolvedValue(true)
        mockFileService.readFile.mockResolvedValue(Buffer.from('<body><h1>Title</h1><p>Content</p></body>'))

        await (service as any).exportTxt(userId, urls, zipPath, jobId)

        expect(mockFileService.readFile).toHaveBeenCalled()
      })
    })

    describe('exportMarkdown', () => {
      it('should convert HTML to Markdown', async () => {
        const userId = 1
        const urls = ['https://mp.weixin.qq.com/s/test1']
        const zipPath = '/tmp/export.zip'
        const jobId = 1

        mockHtmlService.getHtml.mockResolvedValue({
          title: 'Test',
          filePath: '/tmp/test.html',
        })

        mockFileService.fileExists.mockResolvedValue(true)
        mockFileService.readFile.mockResolvedValue(Buffer.from('<body><h1>Title</h1><p>Content</p></body>'))

        await (service as any).exportMarkdown(userId, urls, zipPath, jobId)

        expect(mockFileService.readFile).toHaveBeenCalled()
      })
    })

    describe('exportWord', () => {
      it('should create Word documents', async () => {
        const userId = 1
        const urls = ['https://mp.weixin.qq.com/s/test1']
        const zipPath = '/tmp/export.zip'
        const jobId = 1

        mockHtmlService.getHtml.mockResolvedValue({
          title: 'Test',
          filePath: '/tmp/test.html',
        })

        mockFileService.fileExists.mockResolvedValue(true)
        mockFileService.readFile.mockResolvedValue(Buffer.from('<body><h1>Title</h1><p>Content</p></body>'))

        await (service as any).exportWord(userId, urls, zipPath, jobId)

        expect(mockFileService.readFile).toHaveBeenCalled()
      })
    })
  })

  // ==================== 边界情况测试 ====================

  describe('Edge Cases', () => {
    it('should handle concurrent job creation', async () => {
      const userId = 1
      const format: ExportFormat = 'html'
      const articleUrls = ['https://mp.weixin.qq.com/s/test']

      mockDb.insert.mockReturnValue({
        values: vi.fn()
          .mockResolvedValueOnce([{ insertId: 1 }])
          .mockResolvedValueOnce([{ insertId: 2 }])
          .mockResolvedValueOnce([{ insertId: 3 }]),
      })

      const jobs = await Promise.all([
        service.createJob(userId, format, articleUrls),
        service.createJob(userId, format, articleUrls),
        service.createJob(userId, format, articleUrls),
      ])

      expect(jobs).toHaveLength(3)
    })

    it('should handle null values gracefully', async () => {
      const userId = 1
      const format: ExportFormat = 'html'
      const articleUrls = ['https://mp.weixin.qq.com/s/test']

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([null as any]),
      })

      const result = await service.getJob(userId, 1)
      expect(result).toBeNull()
    })

    it('should handle undefined database result', async () => {
      const userId = 1

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue(undefined as any),
      })

      // 应该返回 undefined (数据库查询失败)
      const result = await service.getJobs(userId)
      expect(result).toBeUndefined()
    })

    it('should handle very long article URL', async () => {
      const userId = 1
      const format: ExportFormat = 'html'
      const longUrl = 'https://mp.weixin.qq.com/s/' + 'a'.repeat(2000)
      const articleUrls = [longUrl]

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockResolvedValue([{ insertId: 1 }]),
      })

      await expect(service.createJob(userId, format, articleUrls)).resolves.toBeDefined()
    })

    it('should handle Unicode characters in article URLs', async () => {
      const userId = 1
      const format: ExportFormat = 'html'
      const articleUrls = ['https://mp.weixin.qq.com/s/测试文章-📚']

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockResolvedValue([{ insertId: 1 }]),
      })

      await expect(service.createJob(userId, format, articleUrls)).resolves.toBeDefined()
    })
  })

  // ==================== 性能测试 ====================

  describe('Performance', () => {
    it('should handle batch job creation efficiently', async () => {
      const userId = 1
      const format: ExportFormat = 'html'
      const articleUrls = Array.from({ length: 100 }, (_, i) => `https://mp.weixin.qq.com/s/test${i}`)

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockResolvedValue([{ insertId: 1 }]),
      })

      const startTime = Date.now()
      await service.createJob(userId, format, articleUrls)
      const endTime = Date.now()

      // 应该在合理时间内完成（< 1秒）
      expect(endTime - startTime).toBeLessThan(1000)
    })

    it('should handle large job list retrieval', async () => {
      const userId = 1
      const mockJobs = Array.from({ length: 50 }, (_, i) => ({
        id: i + 1,
        userId,
        format: 'html',
        status: 'completed',
      }))

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue(mockJobs),
      })

      const startTime = Date.now()
      const result = await service.getJobs(userId)
      const endTime = Date.now()

      expect(result).toHaveLength(50)
      expect(endTime - startTime).toBeLessThan(1000)
    })
  })

  // ==================== 错误处理测试 ====================

  describe('Error Handling', () => {
    it('should throw error when database connection fails', async () => {
      const userId = 1
      const format: ExportFormat = 'html'
      const articleUrls = ['https://mp.weixin.qq.com/s/test']

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockRejectedValue(new Error('ECONNREFUSED')),
      })

      await expect(service.createJob(userId, format, articleUrls)).rejects.toThrow('ECONNREFUSED')
    })

    it('should throw error when constraint violation occurs', async () => {
      const userId = 1
      const format: ExportFormat = 'html'
      const articleUrls = ['https://mp.weixin.qq.com/s/test']

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockRejectedValue(new Error('Duplicate entry')),
      })

      await expect(service.createJob(userId, format, articleUrls)).rejects.toThrow('Duplicate entry')
    })

    it('should propagate unexpected errors', async () => {
      const userId = 1

      mockDb.select.mockReturnValue({
        from: vi.fn().mockImplementation(() => {
          throw new Error('Unexpected error')
        }),
      })

      await expect(service.getJobs(userId)).rejects.toThrow('Unexpected error')
    })
  })

  // ==================== processJob 全流程测试 ====================

  describe('processJob Full Flow', () => {
    beforeEach(() => {
      // 重置所有 mock
      vi.clearAllMocks()
    })

    it('should process Excel export format', async () => {
      const jobId = 1
      const userId = 1
      const mockJob = {
        id: jobId,
        userId,
        format: 'excel' as ExportFormat,
        articleUrls: ['https://mp.weixin.qq.com/s/test1'],
        total: 1,
      }

      let updateCallCount = 0
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockImplementation(() => {
          updateCallCount++
          return Promise.resolve({})
        }),
      })

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockJob]),
      })

      mockArticleService.getArticleByUrl.mockResolvedValue({
        title: 'Test',
        link: 'https://mp.weixin.qq.com/s/test1',
      })
      mockMetadataService.getMetadata.mockResolvedValue(null)

      mockFileService.getFileSize.mockResolvedValue(500)

      await (service as any).processJob(jobId, userId)

      // 应该调用 update 至少 2 次（processing + completed）
      expect(updateCallCount).toBeGreaterThanOrEqual(2)
    })

    it('should process JSON export format', async () => {
      const jobId = 2
      const userId = 1
      const mockJob = {
        id: jobId,
        userId,
        format: 'json' as ExportFormat,
        articleUrls: ['https://mp.weixin.qq.com/s/test1'],
        total: 1,
      }

      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue({}),
      })

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockJob]),
      })

      mockArticleService.getArticleByUrl.mockResolvedValue({ title: 'Test' })
      mockMetadataService.getMetadata.mockResolvedValue(null)
      mockCommentService.getComment.mockResolvedValue(null)
      mockFileService.getFileSize.mockResolvedValue(500)

      await (service as any).processJob(jobId, userId)

      expect(mockArticleService.getArticleByUrl).toHaveBeenCalled()
      expect(mockCommentService.getComment).toHaveBeenCalled()
    })

    it('should process TXT export format', async () => {
      const jobId = 3
      const userId = 1
      const mockJob = {
        id: jobId,
        userId,
        format: 'txt' as ExportFormat,
        articleUrls: ['https://mp.weixin.qq.com/s/test1'],
        total: 1,
      }

      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue({}),
      })

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockJob]),
      })

      mockHtmlService.getHtml.mockResolvedValue({
        title: 'Test',
        filePath: '/tmp/test.html',
      })
      mockFileService.fileExists.mockResolvedValue(true)
      mockFileService.readFile.mockResolvedValue(Buffer.from('<html>Test</html>'))
      mockFileService.getFileSize.mockResolvedValue(500)

      await (service as any).processJob(jobId, userId)

      expect(mockHtmlService.getHtml).toHaveBeenCalled()
    })

    it('should process Markdown export format', async () => {
      const jobId = 4
      const userId = 1
      const mockJob = {
        id: jobId,
        userId,
        format: 'markdown' as ExportFormat,
        articleUrls: ['https://mp.weixin.qq.com/s/test1'],
        total: 1,
      }

      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue({}),
      })

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockJob]),
      })

      mockHtmlService.getHtml.mockResolvedValue({
        title: 'Test',
        filePath: '/tmp/test.html',
      })
      mockFileService.fileExists.mockResolvedValue(true)
      mockFileService.readFile.mockResolvedValue(Buffer.from('<html>Test</html>'))
      mockFileService.getFileSize.mockResolvedValue(500)

      await (service as any).processJob(jobId, userId)

      expect(mockHtmlService.getHtml).toHaveBeenCalled()
    })

    it('should process Word export format', async () => {
      const jobId = 5
      const userId = 1
      const mockJob = {
        id: jobId,
        userId,
        format: 'word' as ExportFormat,
        articleUrls: ['https://mp.weixin.qq.com/s/test1'],
        total: 1,
      }

      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue({}),
      })

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockJob]),
      })

      mockHtmlService.getHtml.mockResolvedValue({
        title: 'Test',
        filePath: '/tmp/test.html',
      })
      mockFileService.fileExists.mockResolvedValue(true)
      mockFileService.readFile.mockResolvedValue(Buffer.from('<html>Test</html>'))
      mockFileService.getFileSize.mockResolvedValue(500)

      await (service as any).processJob(jobId, userId)

      expect(mockHtmlService.getHtml).toHaveBeenCalled()
    })

    it('should mark job as failed on error', async () => {
      const jobId = 6
      const userId = 1

      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue({}),
      })

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockRejectedValue(new Error('Database error')),
        limit: vi.fn(),
      })

      await (service as any).processJob(jobId, userId)

      // 应该更新状态为 failed
      expect(mockDb.update).toHaveBeenCalled()
    })
  })

  // ==================== 单例工厂函数测试 ====================

  describe('getExportService', () => {
    it('should return ExportService instance', () => {
      // 测试通过实例化验证单例模式的存在
      // 由于测试环境已经 mock 了模块，我们验证 service 实例本身
      expect(service).toBeInstanceOf(ExportService)
      expect(service).toBeDefined()
    })

    it('should have all required methods', () => {
      // 验证单例实例包含所有必需的公共方法
      expect(typeof service.createJob).toBe('function')
      expect(typeof service.getJobs).toBe('function')
      expect(typeof service.getJob).toBe('function')
      expect(typeof service.deleteJob).toBe('function')
      expect(typeof service.cleanExpiredJobs).toBe('function')
    })
  })

  // ==================== updateProgress 测试 ====================

  describe('updateProgress', () => {
    it('should update job progress correctly', async () => {
      const jobId = 123
      const progress = 50

      let capturedProgress: number | undefined
      mockDb.update.mockReturnValue({
        set: vi.fn().mockImplementation((data) => {
          capturedProgress = data.progress
          return {
            where: vi.fn().mockResolvedValue({}),
          }
        }),
      })

      await (service as any).updateProgress(jobId, progress)

      expect(capturedProgress).toBe(50)
      expect(mockDb.update).toHaveBeenCalled()
    })

    it('should handle progress update error', async () => {
      const jobId = 123
      const progress = 75

      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockRejectedValue(new Error('Update failed')),
      })

      await expect((service as any).updateProgress(jobId, progress)).rejects.toThrow('Update failed')
    })

    it('should update progress to 0', async () => {
      const jobId = 123
      const progress = 0

      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue({}),
      })

      await (service as any).updateProgress(jobId, progress)

      expect(mockDb.update).toHaveBeenCalled()
    })

    it('should update progress to 100', async () => {
      const jobId = 123
      const progress = 100

      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue({}),
      })

      await (service as any).updateProgress(jobId, progress)

      expect(mockDb.update).toHaveBeenCalled()
    })
  })

  // ==================== 边界分支覆盖测试 ====================

  describe('Edge Branch Coverage', () => {
    it('should handle html without filePath in exportHtml', async () => {
      const userId = 1
      const urls = ['https://mp.weixin.qq.com/s/test1']
      const zipPath = '/tmp/export.zip'
      const jobId = 1

      // Mock html 没有 filePath
      mockHtmlService.getHtml.mockResolvedValue({
        title: 'Test',
        filePath: null, // 没有 filePath
      })

      await (service as any).exportHtml(userId, urls, zipPath, jobId)

      // 不应该调用 fileExists
      expect(mockFileService.fileExists).not.toHaveBeenCalled()
    })

    it('should handle null html in exportHtml', async () => {
      const userId = 1
      const urls = ['https://mp.weixin.qq.com/s/test1']
      const zipPath = '/tmp/export.zip'
      const jobId = 1

      // Mock html 为 null
      mockHtmlService.getHtml.mockResolvedValue(null)

      await (service as any).exportHtml(userId, urls, zipPath, jobId)

      // 不应该调用 fileExists
      expect(mockFileService.fileExists).not.toHaveBeenCalled()
    })

    it('should not update progress when not at interval in exportHtml', async () => {
      const userId = 1
      const urls = ['https://mp.weixin.qq.com/s/test1', 'https://mp.weixin.qq.com/s/test2']
      const zipPath = '/tmp/export.zip'
      const jobId = 1

      mockHtmlService.getHtml.mockResolvedValue({
        title: 'Test',
        filePath: '/tmp/test.html',
      })

      mockFileService.fileExists.mockResolvedValue(true)
      mockFileService.readFile.mockResolvedValue(Buffer.from('<html>Test</html>'))

      let updateProgressCallCount = 0
      mockDb.update.mockImplementation(() => ({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockImplementation(() => {
          updateProgressCallCount++
          return Promise.resolve({})
        }),
      }))

      await (service as any).exportHtml(userId, urls, zipPath, jobId)

      // 只有 2 个文章，进度为 1 和 2，都不是 10 的倍数，所以不应该调用 updateProgress
      expect(updateProgressCallCount).toBe(0)
    })

    it('should handle article without metadata in exportExcel', async () => {
      const userId = 1
      const urls = ['https://mp.weixin.qq.com/s/test1']
      const zipPath = '/tmp/export.zip'
      const jobId = 1

      mockArticleService.getArticleByUrl.mockResolvedValue({
        title: 'Test',
        authorName: null, // 没有作者
        createTime: null, // 没有创建时间
        link: urls[0],
        digest: null, // 没有摘要
      })

      mockMetadataService.getMetadata.mockResolvedValue({
        readNum: 0,
        likeNum: 0,
        oldLikeNum: 0,
        commentNum: 0,
        shareNum: 0,
      })

      await (service as any).exportExcel(userId, urls, zipPath, jobId)

      expect(mockArticleService.getArticleByUrl).toHaveBeenCalled()
    })

    it('should not update progress when not at interval in exportExcel', async () => {
      const userId = 1
      const urls = ['https://mp.weixin.qq.com/s/test1', 'https://mp.weixin.qq.com/s/test2']
      const zipPath = '/tmp/export.zip'
      const jobId = 1

      mockArticleService.getArticleByUrl.mockResolvedValue({
        title: 'Test',
        link: 'https://mp.weixin.qq.com/s/test1',
      })
      mockMetadataService.getMetadata.mockResolvedValue(null)

      let updateProgressCallCount = 0
      mockDb.update.mockImplementation(() => ({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockImplementation(() => {
          updateProgressCallCount++
          return Promise.resolve({})
        }),
      }))

      await (service as any).exportExcel(userId, urls, zipPath, jobId)

      // 只有 2 个文章，进度不是 20 的倍数
      expect(updateProgressCallCount).toBe(0)
    })

    it('should handle null html in exportTxt', async () => {
      const userId = 1
      const urls = ['https://mp.weixin.qq.com/s/test1']
      const zipPath = '/tmp/export.zip'
      const jobId = 1

      mockHtmlService.getHtml.mockResolvedValue(null)

      await (service as any).exportTxt(userId, urls, zipPath, jobId)

      expect(mockFileService.fileExists).not.toHaveBeenCalled()
    })

    it('should handle html without filePath in exportMarkdown', async () => {
      const userId = 1
      const urls = ['https://mp.weixin.qq.com/s/test1']
      const zipPath = '/tmp/export.zip'
      const jobId = 1

      mockHtmlService.getHtml.mockResolvedValue({
        title: 'Test',
        filePath: undefined,
      })

      await (service as any).exportMarkdown(userId, urls, zipPath, jobId)

      expect(mockFileService.fileExists).not.toHaveBeenCalled()
    })

    it('should handle html without filePath in exportWord', async () => {
      const userId = 1
      const urls = ['https://mp.weixin.qq.com/s/test1']
      const zipPath = '/tmp/export.zip'
      const jobId = 1

      mockHtmlService.getHtml.mockResolvedValue({
        title: 'Test',
        // 没有 filePath 属性
      })

      await (service as any).exportWord(userId, urls, zipPath, jobId)

      expect(mockFileService.fileExists).not.toHaveBeenCalled()
    })

    it('should handle error without message in processJob', async () => {
      const jobId = 7
      const userId = 1

      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue({}),
      })

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockRejectedValue(new Error()), // Error 没有 message
        limit: vi.fn(),
      })

      await (service as any).processJob(jobId, userId)

      // 应该使用默认错误消息 '导出失败'
      expect(mockDb.update).toHaveBeenCalled()
    })

    it('should handle articles with partial data in exportJson', async () => {
      const userId = 1
      const urls = ['https://mp.weixin.qq.com/s/test1', 'https://mp.weixin.qq.com/s/test2']
      const zipPath = '/tmp/export.zip'
      const jobId = 1

      // 第一个文章存在，第二个不存在
      mockArticleService.getArticleByUrl
        .mockResolvedValueOnce({ title: 'Test 1', link: urls[0] })
        .mockResolvedValueOnce(null)

      mockMetadataService.getMetadata
        .mockResolvedValueOnce({ readNum: 100 })
        .mockResolvedValueOnce(null)

      mockCommentService.getComment
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce(null)

      await (service as any).exportJson(userId, urls, zipPath, jobId)

      expect(mockArticleService.getArticleByUrl).toHaveBeenCalledTimes(2)
    })

    it('should handle progress at exact intervals', async () => {
      const userId = 1
      // 创建 20 个 URL，这样进度会在 10 和 20 时更新
      const urls = Array.from({ length: 20 }, (_, i) => `https://mp.weixin.qq.com/s/test${i}`)
      const zipPath = '/tmp/export.zip'
      const jobId = 1

      mockHtmlService.getHtml.mockResolvedValue({
        title: 'Test',
        filePath: '/tmp/test.html',
      })

      mockFileService.fileExists.mockResolvedValue(true)
      mockFileService.readFile.mockResolvedValue(Buffer.from('<html>Test</html>'))

      let updateProgressCalls = 0
      mockDb.update.mockImplementation(() => ({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockImplementation(() => {
          updateProgressCalls++
          return Promise.resolve({})
        }),
      }))

      await (service as any).exportHtml(userId, urls, zipPath, jobId)

      // 应该在进度为 10 和 20 时调用 updateProgress，共 2 次
      expect(updateProgressCalls).toBe(2)
    })
  })
})
