import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getDownloadService } from '~/server/services/download.service'
import {
  createMockHtmlResponse,
  createMockImageResponse,
  createMockErrorResponse,
} from '../helpers/mock-responses'

// 创建共享的Mock实例（在模块顶层，确保所有服务都使用同一套Mock）
const mockFileService = {
  checkQuota: vi.fn().mockResolvedValue(true),
  getUploadPath: vi.fn((userId: number, fakeid: string, type: string) => {
    // Mock实现：返回有效的路径字符串
    return `C:/Tare/微信公众号下载/wechat-article-exporter-v3/data/user${userId}/${type}`
  }),
  saveFile: vi.fn().mockResolvedValue(1000),
  updateStorageUsed: vi.fn().mockResolvedValue(undefined),
}

const mockHtmlService = {
  getHtml: vi.fn().mockResolvedValue(null),
  saveHtml: vi.fn().mockResolvedValue(undefined),
  getDownloadedUrls: vi.fn().mockResolvedValue([]),
}

const mockResourceService = {
  getResource: vi.fn().mockResolvedValue(null),
  saveResource: vi.fn().mockResolvedValue(undefined),
  saveResourceMap: vi.fn().mockResolvedValue(undefined),
}

// Mock所有依赖服务（返回共享的Mock实例）
vi.mock('~/server/services/file.service', () => ({
  getFileService: () => mockFileService,
}))

vi.mock('~/server/services/html.service', () => ({
  getHtmlService: () => mockHtmlService,
}))

vi.mock('~/server/services/resource.service', () => ({
  getResourceService: () => mockResourceService,
}))

/**
 * downloadArticle() 方法单元测试
 *
 * 测试范围:
 * 1. 缓存检查 (3个)
 * 2. 存储配额检查 (3个)
 * 3. HTML获取 (6个)
 * 4. 标题提取 (6个)
 * 5. CommentId提取 (2个)
 * 6. 图片下载 (8个)
 * 7. 文件保存 (3个)
 * 8. 数据库记录 (3个)
 * 9. 存储使用更新 (2个)
 *
 * 总计: 36个单元测试
 */

describe('DownloadService.downloadArticle()', () => {
  let downloadService: ReturnType<typeof getDownloadService>

  const TEST_USER_ID = 1
  const TEST_FAKEID = 'fake123'
  const TEST_ARTICLE_URL = 'https://mp.weixin.qq.com/s/abc123'

  beforeEach(() => {
    // 清除所有Mock调用记录，但保留默认返回值
    vi.clearAllMocks()

    // 重置默认Mock返回值（这些可以在具体测试中被覆盖）
    mockHtmlService.getHtml.mockResolvedValue(null)
    mockFileService.checkQuota.mockResolvedValue(true)
    mockFileService.saveFile.mockResolvedValue(1000)
    mockFileService.updateStorageUsed.mockResolvedValue(undefined)
    mockHtmlService.saveHtml.mockResolvedValue(undefined)
    mockResourceService.getResource.mockResolvedValue(null)
    mockResourceService.saveResource.mockResolvedValue(undefined)
    mockResourceService.saveResourceMap.mockResolvedValue(undefined)

    // 创建服务实例
    downloadService = getDownloadService()

    // Mock全局fetch
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ==================== 1. 缓存检查 (3个测试) ====================
  describe('缓存检查', () => {
    it('should return cached result if article already downloaded', async () => {
      // 模拟已下载的文章
      const cachedHtml = {
        id: 1,
        userId: TEST_USER_ID,
        fakeid: TEST_FAKEID,
        articleUrl: TEST_ARTICLE_URL,
        title: '已缓存的文章',
        commentId: 'comment123',
        filePath: '/data/user1/html/cached.html',
        fileSize: 5000,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockHtmlService.getHtml.mockResolvedValue(cachedHtml)

      const result = await downloadService.downloadArticle(
        TEST_USER_ID,
        TEST_FAKEID,
        TEST_ARTICLE_URL,
      )

      expect(result).toEqual({
        title: '已缓存的文章',
        commentId: 'comment123',
        filePath: '/data/user1/html/cached.html',
        fileSize: 5000,
        imageCount: 0,
        failedImages: [],
      })

      // 验证没有调用fetch
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('should return cached result without commentId when not present', async () => {
      const cachedHtml = {
        id: 1,
        userId: TEST_USER_ID,
        fakeid: TEST_FAKEID,
        articleUrl: TEST_ARTICLE_URL,
        title: '无评论文章',
        commentId: null,
        filePath: '/data/user1/html/no-comment.html',
        fileSize: 3000,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockHtmlService.getHtml.mockResolvedValue(cachedHtml)

      const result = await downloadService.downloadArticle(
        TEST_USER_ID,
        TEST_FAKEID,
        TEST_ARTICLE_URL,
      )

      expect(result.commentId).toBeUndefined()
    })

    it('should proceed to download when cache miss', async () => {
      mockHtmlService.getHtml.mockResolvedValue(null)
      mockFileService.checkQuota.mockResolvedValue(true)

      const html = '<html><head><title>Test</title></head><body><script>var msg_title = "新文章";</script></body></html>'
      global.fetch = vi.fn().mockResolvedValue(createMockHtmlResponse(html))

      mockFileService.saveFile.mockResolvedValue(1000)
      mockHtmlService.saveHtml.mockResolvedValue(undefined)
      mockFileService.updateStorageUsed.mockResolvedValue(undefined)

      const result = await downloadService.downloadArticle(
        TEST_USER_ID,
        TEST_FAKEID,
        TEST_ARTICLE_URL,
      )

      expect(result.title).toBe('新文章')
      expect(global.fetch).toHaveBeenCalled()
    })
  })

  // ==================== 2. 存储配额检查 (3个测试) ====================
  describe('存储配额检查', () => {
    beforeEach(() => {
      mockHtmlService.getHtml.mockResolvedValue(null)
    })

    it('should throw error when storage quota exceeded', async () => {
      mockFileService.checkQuota.mockResolvedValue(false)

      await expect(
        downloadService.downloadArticle(TEST_USER_ID, TEST_FAKEID, TEST_ARTICLE_URL),
      ).rejects.toThrow('storage_quota_exceeded')
    })

    it('should proceed when quota is sufficient', async () => {
      mockFileService.checkQuota.mockResolvedValue(true)

      const html = '<html><script>var msg_title = "Test";</script></html>'
      global.fetch = vi.fn().mockResolvedValue(createMockHtmlResponse(html))

      mockFileService.saveFile.mockResolvedValue(1000)
      mockHtmlService.saveHtml.mockResolvedValue(undefined)
      mockFileService.updateStorageUsed.mockResolvedValue(undefined)

      const result = await downloadService.downloadArticle(
        TEST_USER_ID,
        TEST_FAKEID,
        TEST_ARTICLE_URL,
      )

      expect(result).toBeDefined()
    })

    it('should check quota with estimated 2MB size', async () => {
      const checkQuotaSpy = mockFileService.checkQuota.mockResolvedValue(true)

      const html = '<html><script>var msg_title = "Test";</script></html>'
      global.fetch = vi.fn().mockResolvedValue(createMockHtmlResponse(html))

      mockFileService.saveFile.mockResolvedValue(1000)
      mockHtmlService.saveHtml.mockResolvedValue(undefined)
      mockFileService.updateStorageUsed.mockResolvedValue(undefined)

      await downloadService.downloadArticle(TEST_USER_ID, TEST_FAKEID, TEST_ARTICLE_URL)

      expect(checkQuotaSpy).toHaveBeenCalledWith(TEST_USER_ID, 2 * 1024 * 1024)
    })
  })

  // ==================== 3. HTML获取 (6个测试) ====================
  describe('HTML获取', () => {
    beforeEach(() => {
      mockHtmlService.getHtml.mockResolvedValue(null)
      mockFileService.checkQuota.mockResolvedValue(true)
    })

    it('should successfully fetch article HTML', async () => {
      const html = '<html><script>var msg_title = "成功获取";</script></html>'
      global.fetch = vi.fn().mockResolvedValue(createMockHtmlResponse(html))

      mockFileService.saveFile.mockResolvedValue(1000)
      mockHtmlService.saveHtml.mockResolvedValue(undefined)
      mockFileService.updateStorageUsed.mockResolvedValue(undefined)

      const result = await downloadService.downloadArticle(
        TEST_USER_ID,
        TEST_FAKEID,
        TEST_ARTICLE_URL,
      )

      expect(result.title).toBe('成功获取')
      expect(global.fetch).toHaveBeenCalledWith(
        TEST_ARTICLE_URL,
        expect.objectContaining({
          headers: expect.objectContaining({
            'User-Agent': expect.any(String),
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
          }),
          redirect: 'follow',
        }),
      )
    })

    it('should throw error on HTTP 404', async () => {
      global.fetch = vi.fn().mockResolvedValue(createMockErrorResponse(404, 'Not Found'))

      await expect(
        downloadService.downloadArticle(TEST_USER_ID, TEST_FAKEID, TEST_ARTICLE_URL),
      ).rejects.toThrow('HTTP 404')
    })

    it('should throw error on HTTP 500', async () => {
      global.fetch = vi.fn().mockResolvedValue(createMockErrorResponse(500, 'Server Error'))

      await expect(
        downloadService.downloadArticle(TEST_USER_ID, TEST_FAKEID, TEST_ARTICLE_URL),
      ).rejects.toThrow('HTTP 500')
    })

    it('should handle network timeout', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Request timeout'))

      await expect(
        downloadService.downloadArticle(TEST_USER_ID, TEST_FAKEID, TEST_ARTICLE_URL),
      ).rejects.toThrow('Request timeout')
    })

    it('should follow redirects', async () => {
      const html = '<html><script>var msg_title = "Redirected";</script></html>'
      global.fetch = vi.fn().mockResolvedValue(createMockHtmlResponse(html))

      mockFileService.saveFile.mockResolvedValue(1000)
      mockHtmlService.saveHtml.mockResolvedValue(undefined)
      mockFileService.updateStorageUsed.mockResolvedValue(undefined)

      await downloadService.downloadArticle(TEST_USER_ID, TEST_FAKEID, TEST_ARTICLE_URL)

      expect(global.fetch).toHaveBeenCalledWith(
        TEST_ARTICLE_URL,
        expect.objectContaining({ redirect: 'follow' }),
      )
    })

    it('should handle empty response body', async () => {
      global.fetch = vi.fn().mockResolvedValue(createMockHtmlResponse(''))

      mockFileService.saveFile.mockResolvedValue(0)
      mockHtmlService.saveHtml.mockResolvedValue(undefined)
      mockFileService.updateStorageUsed.mockResolvedValue(undefined)

      const result = await downloadService.downloadArticle(
        TEST_USER_ID,
        TEST_FAKEID,
        TEST_ARTICLE_URL,
      )

      expect(result.title).toBe('Untitled')
      expect(result.fileSize).toBe(0)
    })
  })

  // ==================== 4. 标题提取 (6个测试) ====================
  describe('标题提取', () => {
    beforeEach(() => {
      mockHtmlService.getHtml.mockResolvedValue(null)
      mockFileService.checkQuota.mockResolvedValue(true)
      mockFileService.saveFile.mockResolvedValue(1000)
      mockHtmlService.saveHtml.mockResolvedValue(undefined)
      mockFileService.updateStorageUsed.mockResolvedValue(undefined)
    })

    it('should extract title from msg_title variable', async () => {
      const html = `<html><script>var msg_title = '从msg_title提取';</script></html>`
      global.fetch = vi.fn().mockResolvedValue(createMockHtmlResponse(html))

      const result = await downloadService.downloadArticle(
        TEST_USER_ID,
        TEST_FAKEID,
        TEST_ARTICLE_URL,
      )

      expect(result.title).toBe('从msg_title提取')
    })

    it('should extract title from og:title meta tag', async () => {
      const html = `<html><meta property="og:title" content="从og:title提取"></html>`
      global.fetch = vi.fn().mockResolvedValue(createMockHtmlResponse(html))

      const result = await downloadService.downloadArticle(
        TEST_USER_ID,
        TEST_FAKEID,
        TEST_ARTICLE_URL,
      )

      expect(result.title).toBe('从og:title提取')
    })

    it('should extract title from <title> tag', async () => {
      const html = `<html><head><title>从title标签提取</title></head></html>`
      global.fetch = vi.fn().mockResolvedValue(createMockHtmlResponse(html))

      const result = await downloadService.downloadArticle(
        TEST_USER_ID,
        TEST_FAKEID,
        TEST_ARTICLE_URL,
      )

      expect(result.title).toBe('从title标签提取')
    })

    it('should use "Untitled" when no title found', async () => {
      const html = `<html><body>No title here</body></html>`
      global.fetch = vi.fn().mockResolvedValue(createMockHtmlResponse(html))

      const result = await downloadService.downloadArticle(
        TEST_USER_ID,
        TEST_FAKEID,
        TEST_ARTICLE_URL,
      )

      expect(result.title).toBe('Untitled')
    })

    it('should handle title with special characters', async () => {
      // 使用双引号包裹，避免嵌套引号问题
      const html = `<html><script>var msg_title = "特殊字符<>&标题";</script></html>`
      global.fetch = vi.fn().mockResolvedValue(createMockHtmlResponse(html))

      const result = await downloadService.downloadArticle(
        TEST_USER_ID,
        TEST_FAKEID,
        TEST_ARTICLE_URL,
      )

      expect(result.title).toBe('特殊字符<>&标题')
    })

    it('should trim whitespace from title', async () => {
      const html = `<html><script>var msg_title = '  空格标题  ';</script></html>`
      global.fetch = vi.fn().mockResolvedValue(createMockHtmlResponse(html))

      const result = await downloadService.downloadArticle(
        TEST_USER_ID,
        TEST_FAKEID,
        TEST_ARTICLE_URL,
      )

      expect(result.title).toBe('空格标题')
    })
  })

  // ==================== 5. CommentId提取 (2个测试) ====================
  describe('CommentId提取', () => {
    beforeEach(() => {
      mockHtmlService.getHtml.mockResolvedValue(null)
      mockFileService.checkQuota.mockResolvedValue(true)
      mockFileService.saveFile.mockResolvedValue(1000)
      mockHtmlService.saveHtml.mockResolvedValue(undefined)
      mockFileService.updateStorageUsed.mockResolvedValue(undefined)
    })

    it('should extract commentId when present', async () => {
      const html = `<html><script>var comment_id = "1234567890";</script></html>`
      global.fetch = vi.fn().mockResolvedValue(createMockHtmlResponse(html))

      const result = await downloadService.downloadArticle(
        TEST_USER_ID,
        TEST_FAKEID,
        TEST_ARTICLE_URL,
      )

      expect(result.commentId).toBe('1234567890')
    })

    it('should return undefined when commentId not present', async () => {
      const html = `<html><body>No comment_id here</body></html>`
      global.fetch = vi.fn().mockResolvedValue(createMockHtmlResponse(html))

      const result = await downloadService.downloadArticle(
        TEST_USER_ID,
        TEST_FAKEID,
        TEST_ARTICLE_URL,
      )

      expect(result.commentId).toBeUndefined()
    })
  })

  // ==================== 6. 图片下载 (8个测试) ====================
  describe('图片下载', () => {
    beforeEach(() => {
      mockHtmlService.getHtml.mockResolvedValue(null)
      mockFileService.checkQuota.mockResolvedValue(true)
      mockFileService.saveFile.mockResolvedValue(1000)
      mockHtmlService.saveHtml.mockResolvedValue(undefined)
      mockFileService.updateStorageUsed.mockResolvedValue(undefined)
      mockResourceService.saveResource.mockResolvedValue(undefined)
      mockResourceService.saveResourceMap.mockResolvedValue(undefined)
    })

    it('should handle article with no images', async () => {
      const html = `<html><script>var msg_title = "无图文章";</script><body><p>纯文字</p></body></html>`
      global.fetch = vi.fn().mockResolvedValue(createMockHtmlResponse(html))

      const result = await downloadService.downloadArticle(
        TEST_USER_ID,
        TEST_FAKEID,
        TEST_ARTICLE_URL,
      )

      expect(result.imageCount).toBe(0)
      expect(result.failedImages).toEqual([])
    })

    it('should successfully download all images', async () => {
      const html = `
        <html>
          <script>var msg_title = "多图文章";</script>
          <body>
            <img src="https://mmbiz.qpic.cn/mmbiz_jpg/img1/0?wx_fmt=jpeg">
            <img data-src="https://mmbiz.qpic.cn/mmbiz_png/img2/0?wx_fmt=png">
          </body>
        </html>
      `

      global.fetch = vi
        .fn()
        .mockResolvedValueOnce(createMockHtmlResponse(html))
        .mockResolvedValueOnce(createMockImageResponse(5000, 'image/jpeg'))
        .mockResolvedValueOnce(createMockImageResponse(3000, 'image/png'))

      mockResourceService.getResource.mockResolvedValue(null)

      const result = await downloadService.downloadArticle(
        TEST_USER_ID,
        TEST_FAKEID,
        TEST_ARTICLE_URL,
      )

      expect(result.imageCount).toBe(2)
      expect(result.failedImages).toEqual([])
    })

    it('should handle partial image download failures', async () => {
      const html = `
        <html>
          <script>var msg_title = "部分失败";</script>
          <body>
            <img src="https://mmbiz.qpic.cn/mmbiz_jpg/img1/0?wx_fmt=jpeg">
            <img src="https://mmbiz.qpic.cn/mmbiz_jpg/img2/0?wx_fmt=jpeg">
          </body>
        </html>
      `

      global.fetch = vi
        .fn()
        .mockResolvedValueOnce(createMockHtmlResponse(html))
        .mockResolvedValueOnce(createMockImageResponse(5000, 'image/jpeg'))
        .mockResolvedValueOnce(createMockErrorResponse(404, 'Not Found'))

      mockResourceService.getResource.mockResolvedValue(null)

      const result = await downloadService.downloadArticle(
        TEST_USER_ID,
        TEST_FAKEID,
        TEST_ARTICLE_URL,
      )

      expect(result.imageCount).toBe(1)
      expect(result.failedImages).toHaveLength(1)
      expect(result.failedImages[0]).toContain('img2')
    })

    it('should handle all images failed', async () => {
      const html = `
        <html>
          <script>var msg_title = "全部失败";</script>
          <body>
            <img src="https://mmbiz.qpic.cn/mmbiz_jpg/img1/0?wx_fmt=jpeg">
          </body>
        </html>
      `

      global.fetch = vi
        .fn()
        .mockResolvedValueOnce(createMockHtmlResponse(html))
        .mockRejectedValueOnce(new Error('Network error'))

      mockResourceService.getResource.mockResolvedValue(null)

      const result = await downloadService.downloadArticle(
        TEST_USER_ID,
        TEST_FAKEID,
        TEST_ARTICLE_URL,
      )

      expect(result.imageCount).toBe(0)
      expect(result.failedImages).toHaveLength(1)
    })

    it('should use cached resource when image already exists', async () => {
      const html = `
        <html>
          <script>var msg_title = "缓存图片";</script>
          <body>
            <img src="https://mmbiz.qpic.cn/mmbiz_jpg/cached/0?wx_fmt=jpeg">
          </body>
        </html>
      `

      global.fetch = vi.fn().mockResolvedValueOnce(createMockHtmlResponse(html))

      mockResourceService.getResource.mockResolvedValue({
        id: 1,
        userId: TEST_USER_ID,
        fakeid: TEST_FAKEID,
        resourceUrl: 'https://mmbiz.qpic.cn/mmbiz_jpg/cached/0?wx_fmt=jpeg',
        filePath: '/data/cached.jpeg',
        fileSize: 5000,
        mimeType: 'image/jpeg',
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const result = await downloadService.downloadArticle(
        TEST_USER_ID,
        TEST_FAKEID,
        TEST_ARTICLE_URL,
      )

      expect(result.imageCount).toBe(1)
      // 不应该再次下载
      expect(global.fetch).toHaveBeenCalledTimes(1) // 只有HTML请求
    })

    it('should deduplicate image URLs', async () => {
      const html = `
        <html>
          <script>var msg_title = "重复图片";</script>
          <body>
            <img src="https://mmbiz.qpic.cn/mmbiz_jpg/same/0?wx_fmt=jpeg">
            <img src="https://mmbiz.qpic.cn/mmbiz_jpg/same/0?wx_fmt=jpeg">
            <img src="https://mmbiz.qpic.cn/mmbiz_jpg/same/0?wx_fmt=jpeg">
          </body>
        </html>
      `

      global.fetch = vi
        .fn()
        .mockResolvedValueOnce(createMockHtmlResponse(html))
        .mockResolvedValueOnce(createMockImageResponse(5000, 'image/jpeg'))

      mockResourceService.getResource.mockResolvedValue(null)

      const result = await downloadService.downloadArticle(
        TEST_USER_ID,
        TEST_FAKEID,
        TEST_ARTICLE_URL,
      )

      // 应该只下载一次
      expect(result.imageCount).toBe(1)
      expect(global.fetch).toHaveBeenCalledTimes(2) // HTML + 1个图片
    })

    it('should handle large image (>1MB)', async () => {
      const html = `
        <html>
          <script>var msg_title = "大图片";</script>
          <body>
            <img src="https://mmbiz.qpic.cn/mmbiz_jpg/large/0?wx_fmt=jpeg">
          </body>
        </html>
      `

      const largeSize = 2 * 1024 * 1024 // 2MB
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce(createMockHtmlResponse(html))
        .mockResolvedValueOnce(createMockImageResponse(largeSize, 'image/jpeg'))

      mockResourceService.getResource.mockResolvedValue(null)
      const saveFileSpy = mockFileService.saveFile.mockResolvedValue(largeSize)

      const result = await downloadService.downloadArticle(
        TEST_USER_ID,
        TEST_FAKEID,
        TEST_ARTICLE_URL,
      )

      expect(result.imageCount).toBe(1)
      // 验证大文件被保存
      expect(saveFileSpy).toHaveBeenCalledWith(expect.any(String), expect.any(Buffer))
    })

    it('should handle multiple image formats (jpg/png/webp/gif)', async () => {
      const html = `
        <html>
          <script>var msg_title = "多格式图片";</script>
          <body>
            <img src="https://mmbiz.qpic.cn/mmbiz_jpg/img1/0?wx_fmt=jpeg">
            <img src="https://mmbiz.qpic.cn/mmbiz_png/img2/0?wx_fmt=png">
            <img src="https://mmbiz.qpic.cn/mmbiz_webp/img3/0?wx_fmt=webp">
            <img src="https://mmbiz.qpic.cn/mmbiz_gif/img4/0?wx_fmt=gif">
          </body>
        </html>
      `

      global.fetch = vi
        .fn()
        .mockResolvedValueOnce(createMockHtmlResponse(html))
        .mockResolvedValueOnce(createMockImageResponse(1000, 'image/jpeg'))
        .mockResolvedValueOnce(createMockImageResponse(2000, 'image/png'))
        .mockResolvedValueOnce(createMockImageResponse(3000, 'image/webp'))
        .mockResolvedValueOnce(createMockImageResponse(4000, 'image/gif'))

      mockResourceService.getResource.mockResolvedValue(null)

      const result = await downloadService.downloadArticle(
        TEST_USER_ID,
        TEST_FAKEID,
        TEST_ARTICLE_URL,
      )

      expect(result.imageCount).toBe(4)
      expect(result.failedImages).toEqual([])
    })
  })

  // ==================== 7. 文件保存 (3个测试) ====================
  describe('文件保存', () => {
    beforeEach(() => {
      mockHtmlService.getHtml.mockResolvedValue(null)
      mockFileService.checkQuota.mockResolvedValue(true)
      mockHtmlService.saveHtml.mockResolvedValue(undefined)
      mockFileService.updateStorageUsed.mockResolvedValue(undefined)
    })

    it('should save HTML file successfully', async () => {
      const html = `<html><script>var msg_title = "保存测试";</script></html>`
      global.fetch = vi.fn().mockResolvedValue(createMockHtmlResponse(html))

      const saveFileSpy = mockFileService.saveFile.mockResolvedValue(1500)

      const result = await downloadService.downloadArticle(
        TEST_USER_ID,
        TEST_FAKEID,
        TEST_ARTICLE_URL,
      )

      expect(saveFileSpy).toHaveBeenCalled()
      expect(result.fileSize).toBe(1500)
      expect(result.filePath).toContain('.html')
    })

    it('should truncate filename to 200 characters', async () => {
      const longTitle = 'A'.repeat(300)
      const html = `<html><script>var msg_title = '${longTitle}';</script></html>`
      global.fetch = vi.fn().mockResolvedValue(createMockHtmlResponse(html))

      const saveFileSpy = mockFileService.saveFile.mockResolvedValue(1000)

      await downloadService.downloadArticle(TEST_USER_ID, TEST_FAKEID, TEST_ARTICLE_URL)

      const savedPath = saveFileSpy.mock.calls[0][0]
      // 使用正确的路径分隔符（Windows使用反斜杠）
      const filename = savedPath.split(/[/\\]/).pop()!.replace('.html', '')

      // 验证文件名长度被限制（编码后截断到200字符）
      expect(filename.length).toBeLessThanOrEqual(200)
    })

    it('should encode special characters in filename', async () => {
      const specialTitle = '特殊字符/\\:*?"<>|标题'
      const html = `<html><script>var msg_title = '${specialTitle}';</script></html>`
      global.fetch = vi.fn().mockResolvedValue(createMockHtmlResponse(html))

      const saveFileSpy = mockFileService.saveFile.mockResolvedValue(1000)

      await downloadService.downloadArticle(TEST_USER_ID, TEST_FAKEID, TEST_ARTICLE_URL)

      const savedPath = saveFileSpy.mock.calls[0][0]
      // 提取文件名部分（不包含路径）
      const filename = savedPath.split(/[/\\]/).pop()!

      // 验证文件名部分是URL编码的（非法字符会被编码为%XX格式）
      expect(filename).toContain('%')  // 包含编码字符
      expect(filename).toContain('.html')
    })
  })

  // ==================== 8. 数据库记录 (3个测试) ====================
  describe('数据库记录', () => {
    beforeEach(() => {
      mockHtmlService.getHtml.mockResolvedValue(null)
      mockFileService.checkQuota.mockResolvedValue(true)
      mockFileService.saveFile.mockResolvedValue(1000)
      mockFileService.updateStorageUsed.mockResolvedValue(undefined)
    })

    it('should save HTML record to database', async () => {
      const html = `<html><script>var msg_title = "数据库测试"; var comment_id = "comment123";</script></html>`
      global.fetch = vi.fn().mockResolvedValue(createMockHtmlResponse(html))

      const saveHtmlSpy = mockHtmlService.saveHtml.mockResolvedValue(undefined)

      await downloadService.downloadArticle(TEST_USER_ID, TEST_FAKEID, TEST_ARTICLE_URL)

      expect(saveHtmlSpy).toHaveBeenCalledWith(
        TEST_USER_ID,
        expect.objectContaining({
          fakeid: TEST_FAKEID,
          articleUrl: TEST_ARTICLE_URL,
          title: '数据库测试',
          commentId: 'comment123',
          filePath: expect.stringContaining('.html'),
          fileSize: 1000,
        }),
      )
    })

    it('should save resource records for downloaded images', async () => {
      const html = `
        <html>
          <script>var msg_title = "资源测试";</script>
          <body>
            <img src="https://mmbiz.qpic.cn/mmbiz_jpg/img1/0?wx_fmt=jpeg">
          </body>
        </html>
      `

      global.fetch = vi
        .fn()
        .mockResolvedValueOnce(createMockHtmlResponse(html))
        .mockResolvedValueOnce(createMockImageResponse(5000, 'image/jpeg'))

      mockResourceService.getResource.mockResolvedValue(null)
      mockResourceService.saveResource.mockResolvedValue(undefined)
      mockHtmlService.saveHtml.mockResolvedValue(undefined)
      mockResourceService.saveResourceMap.mockResolvedValue(undefined)

      // 覆盖默认的saveFile返回值，匹配调用顺序：先保存图片，后保存HTML
      mockFileService.saveFile.mockResolvedValueOnce(5000).mockResolvedValueOnce(html.length)

      await downloadService.downloadArticle(TEST_USER_ID, TEST_FAKEID, TEST_ARTICLE_URL)

      expect(mockResourceService.saveResource).toHaveBeenCalledWith(
        TEST_USER_ID,
        expect.objectContaining({
          fakeid: TEST_FAKEID,
          resourceUrl: expect.stringContaining('mmbiz.qpic.cn'),
          filePath: expect.any(String),
          fileSize: 5000,
          mimeType: 'image/jpeg',
        }),
      )
    })

    it('should save resource map for article', async () => {
      const html = `
        <html>
          <script>var msg_title = "资源映射测试";</script>
          <body>
            <img src="https://mmbiz.qpic.cn/mmbiz_jpg/img1/0?wx_fmt=jpeg">
            <img src="https://mmbiz.qpic.cn/mmbiz_png/img2/0?wx_fmt=png">
          </body>
        </html>
      `

      global.fetch = vi
        .fn()
        .mockResolvedValueOnce(createMockHtmlResponse(html))
        .mockResolvedValueOnce(createMockImageResponse(5000, 'image/jpeg'))
        .mockResolvedValueOnce(createMockImageResponse(3000, 'image/png'))

      mockResourceService.getResource.mockResolvedValue(null)
      mockResourceService.saveResource.mockResolvedValue(undefined)
      mockHtmlService.saveHtml.mockResolvedValue(undefined)
      mockResourceService.saveResourceMap.mockResolvedValue(undefined)

      await downloadService.downloadArticle(TEST_USER_ID, TEST_FAKEID, TEST_ARTICLE_URL)

      expect(mockResourceService.saveResourceMap).toHaveBeenCalledWith(
        TEST_USER_ID,
        expect.objectContaining({
          fakeid: TEST_FAKEID,
          articleUrl: TEST_ARTICLE_URL,
          resources: expect.any(Object),
        }),
      )

      const resourceMap = mockResourceService.saveResourceMap.mock.calls[0][1].resources
      expect(Object.keys(resourceMap)).toHaveLength(2)
    })
  })

  // ==================== 9. 存储使用更新 (2个测试) ====================
  describe('存储使用更新', () => {
    beforeEach(() => {
      mockHtmlService.getHtml.mockResolvedValue(null)
      mockFileService.checkQuota.mockResolvedValue(true)
      mockHtmlService.saveHtml.mockResolvedValue(undefined)
    })

    it('should update user storage usage', async () => {
      const html = `<html><script>var msg_title = "存储更新";</script></html>`
      global.fetch = vi.fn().mockResolvedValue(createMockHtmlResponse(html))

      mockFileService.saveFile.mockResolvedValue(2000)
      mockFileService.updateStorageUsed.mockResolvedValue(undefined)

      await downloadService.downloadArticle(TEST_USER_ID, TEST_FAKEID, TEST_ARTICLE_URL)

      expect(mockFileService.updateStorageUsed).toHaveBeenCalledWith(TEST_USER_ID, 2000)
    })

    it('should calculate total storage correctly (HTML + images)', async () => {
      const html = `
        <html>
          <script>var msg_title = "总存储计算";</script>
          <body>
            <img src="https://mmbiz.qpic.cn/mmbiz_jpg/img1/0?wx_fmt=jpeg">
            <img src="https://mmbiz.qpic.cn/mmbiz_jpg/img2/0?wx_fmt=jpeg">
          </body>
        </html>
      `

      global.fetch = vi
        .fn()
        .mockResolvedValueOnce(createMockHtmlResponse(html))
        .mockResolvedValueOnce(createMockImageResponse(5000, 'image/jpeg'))
        .mockResolvedValueOnce(createMockImageResponse(3000, 'image/jpeg'))

      mockResourceService.getResource.mockResolvedValue(null)
      mockResourceService.saveResource.mockResolvedValue(undefined)
      mockResourceService.saveResourceMap.mockResolvedValue(undefined)

      mockFileService.saveFile
        .mockResolvedValueOnce(2000) // HTML size
        .mockResolvedValueOnce(5000) // Image 1
        .mockResolvedValueOnce(3000) // Image 2

      mockFileService.updateStorageUsed.mockResolvedValue(undefined)

      await downloadService.downloadArticle(TEST_USER_ID, TEST_FAKEID, TEST_ARTICLE_URL)

      // 验证总存储 = HTML(2000) + Image1(5000) + Image2(3000) = 10000
      expect(mockFileService.updateStorageUsed).toHaveBeenCalledWith(TEST_USER_ID, 10000)
    })
  })
})
