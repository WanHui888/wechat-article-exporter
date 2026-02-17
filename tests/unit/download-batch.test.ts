import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getDownloadService, WeChatExpiredError } from '~/server/services/download.service'

// 创建共享的Mock实例
const mockFileService = {
  checkQuota: vi.fn().mockResolvedValue(true),
  getUploadPath: vi.fn((userId: number, fakeid: string, type: string) => {
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

// Mock所有依赖服务
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
 * batchDownload() 方法单元测试
 *
 * 测试范围:
 * 1. 基础功能 (3个)
 * 2. 缓存跳过逻辑 (3个)
 * 3. 并发控制 (4个)
 * 4. 错误处理 (4个)
 * 5. 登录过期处理 (3个)
 * 6. 速率限制 (2个)
 * 7. 边界条件 (4个)
 *
 * 总计: 23个单元测试
 */

describe('DownloadService.batchDownload()', () => {
  let downloadService: ReturnType<typeof getDownloadService>

  const TEST_USER_ID = 1
  const TEST_FAKEID = 'fake123'

  beforeEach(() => {
    vi.clearAllMocks()

    // 重置默认Mock返回值
    mockHtmlService.getDownloadedUrls.mockResolvedValue([])
    mockHtmlService.getHtml.mockResolvedValue(null)
    mockFileService.checkQuota.mockResolvedValue(true)
    mockFileService.saveFile.mockResolvedValue(1000)
    mockFileService.updateStorageUsed.mockResolvedValue(undefined)
    mockHtmlService.saveHtml.mockResolvedValue(undefined)
    mockResourceService.getResource.mockResolvedValue(null)
    mockResourceService.saveResource.mockResolvedValue(undefined)
    mockResourceService.saveResourceMap.mockResolvedValue(undefined)

    downloadService = getDownloadService()

    // Mock全局fetch
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ==================== 1. 基础功能 (3个测试) ====================
  describe('基础功能', () => {
    it('should successfully download all articles', async () => {
      const urls = [
        'https://mp.weixin.qq.com/s/article1',
        'https://mp.weixin.qq.com/s/article2',
      ]

      const html = '<html><script>var msg_title = "测试文章";</script></html>'
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => html,
        headers: new Headers({ 'content-type': 'text/html' }),
      })

      const result = await downloadService.batchDownload(TEST_USER_ID, TEST_FAKEID, urls, 2)

      expect(result.total).toBe(2)
      expect(result.completed).toBe(2)
      expect(result.failed).toBe(0)
      expect(result.skipped).toBe(0)
      expect(result.loginExpired).toBe(false)
      expect(result.results).toHaveLength(2)
      expect(result.results[0]?.status).toBe('completed')
      expect(result.results[1]?.status).toBe('completed')
    })

    it('should return correct result structure', async () => {
      const urls = ['https://mp.weixin.qq.com/s/article1']

      const html = '<html><script>var msg_title = "标题";</script></html>'
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => html,
        headers: new Headers({ 'content-type': 'text/html' }),
      })

      const result = await downloadService.batchDownload(TEST_USER_ID, TEST_FAKEID, urls)

      expect(result).toMatchObject({
        total: expect.any(Number),
        completed: expect.any(Number),
        failed: expect.any(Number),
        skipped: expect.any(Number),
        loginExpired: expect.any(Boolean),
        results: expect.any(Array),
      })

      expect(result.results[0]).toMatchObject({
        url: expect.any(String),
        status: expect.stringMatching(/^(completed|failed|skipped)$/),
      })
    })

    it('should handle empty article list', async () => {
      const result = await downloadService.batchDownload(TEST_USER_ID, TEST_FAKEID, [])

      expect(result.total).toBe(0)
      expect(result.completed).toBe(0)
      expect(result.failed).toBe(0)
      expect(result.skipped).toBe(0)
      expect(result.results).toEqual([])
    })
  })

  // ==================== 2. 缓存跳过逻辑 (3个测试) ====================
  describe('缓存跳过逻辑', () => {
    it('should skip already downloaded articles', async () => {
      const urls = [
        'https://mp.weixin.qq.com/s/cached1',
        'https://mp.weixin.qq.com/s/new1',
      ]

      // Mock第一个URL已下载
      mockHtmlService.getDownloadedUrls.mockResolvedValue(['https://mp.weixin.qq.com/s/cached1'])

      const html = '<html><script>var msg_title = "新文章";</script></html>'
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => html,
        headers: new Headers({ 'content-type': 'text/html' }),
      })

      const result = await downloadService.batchDownload(TEST_USER_ID, TEST_FAKEID, urls)

      expect(result.total).toBe(2)
      expect(result.skipped).toBe(1)
      expect(result.completed).toBe(1)
      expect(result.results[0]?.status).toBe('skipped')
      expect(result.results[0]?.url).toBe('https://mp.weixin.qq.com/s/cached1')
      expect(result.results[1]?.status).toBe('completed')
    })

    it('should skip all articles if all are cached', async () => {
      const urls = [
        'https://mp.weixin.qq.com/s/cached1',
        'https://mp.weixin.qq.com/s/cached2',
      ]

      mockHtmlService.getDownloadedUrls.mockResolvedValue(urls)

      const result = await downloadService.batchDownload(TEST_USER_ID, TEST_FAKEID, urls)

      expect(result.total).toBe(2)
      expect(result.skipped).toBe(2)
      expect(result.completed).toBe(0)
      expect(result.failed).toBe(0)
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('should not skip articles when cache is empty', async () => {
      const urls = [
        'https://mp.weixin.qq.com/s/new1',
        'https://mp.weixin.qq.com/s/new2',
      ]

      mockHtmlService.getDownloadedUrls.mockResolvedValue([])

      const html = '<html><script>var msg_title = "文章";</script></html>'
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => html,
        headers: new Headers({ 'content-type': 'text/html' }),
      })

      const result = await downloadService.batchDownload(TEST_USER_ID, TEST_FAKEID, urls)

      expect(result.skipped).toBe(0)
      expect(result.completed).toBe(2)
    })
  })

  // ==================== 3. 并发控制 (4个测试) ====================
  describe('并发控制', () => {
    it('should respect default concurrency of 2', async () => {
      const urls = [
        'https://mp.weixin.qq.com/s/1',
        'https://mp.weixin.qq.com/s/2',
        'https://mp.weixin.qq.com/s/3',
        'https://mp.weixin.qq.com/s/4',
      ]

      let activeDownloads = 0
      let maxConcurrent = 0

      const html = '<html><script>var msg_title = "文章";</script></html>'
      global.fetch = vi.fn().mockImplementation(async () => {
        activeDownloads++
        maxConcurrent = Math.max(maxConcurrent, activeDownloads)
        await new Promise(resolve => setTimeout(resolve, 100))
        activeDownloads--
        return {
          ok: true,
          status: 200,
          text: async () => html,
          headers: new Headers({ 'content-type': 'text/html' }),
        }
      })

      await downloadService.batchDownload(TEST_USER_ID, TEST_FAKEID, urls)

      // 默认并发度为2，实际观察到的最大并发数不应超过2
      expect(maxConcurrent).toBeLessThanOrEqual(2)
    })

    it('should respect custom concurrency of 1', async () => {
      const urls = [
        'https://mp.weixin.qq.com/s/1',
        'https://mp.weixin.qq.com/s/2',
        'https://mp.weixin.qq.com/s/3',
      ]

      let activeDownloads = 0
      let maxConcurrent = 0

      const html = '<html><script>var msg_title = "文章";</script></html>'
      global.fetch = vi.fn().mockImplementation(async () => {
        activeDownloads++
        maxConcurrent = Math.max(maxConcurrent, activeDownloads)
        await new Promise(resolve => setTimeout(resolve, 50))
        activeDownloads--
        return {
          ok: true,
          status: 200,
          text: async () => html,
          headers: new Headers({ 'content-type': 'text/html' }),
        }
      })

      await downloadService.batchDownload(TEST_USER_ID, TEST_FAKEID, urls, 1)

      expect(maxConcurrent).toBe(1)
    })

    it('should clamp concurrency to max of 3', async () => {
      const urls = [
        'https://mp.weixin.qq.com/s/1',
        'https://mp.weixin.qq.com/s/2',
        'https://mp.weixin.qq.com/s/3',
        'https://mp.weixin.qq.com/s/4',
        'https://mp.weixin.qq.com/s/5',
      ]

      let activeDownloads = 0
      let maxConcurrent = 0

      const html = '<html><script>var msg_title = "文章";</script></html>'
      global.fetch = vi.fn().mockImplementation(async () => {
        activeDownloads++
        maxConcurrent = Math.max(maxConcurrent, activeDownloads)
        await new Promise(resolve => setTimeout(resolve, 100))
        activeDownloads--
        return {
          ok: true,
          status: 200,
          text: async () => html,
          headers: new Headers({ 'content-type': 'text/html' }),
        }
      })

      await downloadService.batchDownload(TEST_USER_ID, TEST_FAKEID, urls, 10)

      // 并发度被限制在3
      expect(maxConcurrent).toBeLessThanOrEqual(3)
    })

    it('should clamp negative concurrency to 1', async () => {
      const urls = ['https://mp.weixin.qq.com/s/1']

      const html = '<html><script>var msg_title = "文章";</script></html>'
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => html,
        headers: new Headers({ 'content-type': 'text/html' }),
      })

      const result = await downloadService.batchDownload(TEST_USER_ID, TEST_FAKEID, urls, -5)

      expect(result.completed).toBe(1)
    })
  })

  // ==================== 4. 错误处理 (4个测试) ====================
  describe('错误处理', () => {
    it('should handle partial failures gracefully', async () => {
      const urls = [
        'https://mp.weixin.qq.com/s/success',
        'https://mp.weixin.qq.com/s/fail',
        'https://mp.weixin.qq.com/s/success2',
      ]

      const html = '<html><script>var msg_title = "成功";</script></html>'
      // 使用基于URL的条件Mock，确保特定URL触发特定行为
      global.fetch = vi.fn().mockImplementation((url) => {
        if (url.includes('/s/fail')) {
          return Promise.reject(new Error('Network error'))
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => html,
          headers: new Headers({ 'content-type': 'text/html' }),
        })
      })

      const result = await downloadService.batchDownload(TEST_USER_ID, TEST_FAKEID, urls, 1)

      expect(result.total).toBe(3)
      expect(result.completed).toBe(2)
      expect(result.failed).toBe(1)

      // 找到失败的结果
      const failedResult = result.results.find(r => r.status === 'failed')
      expect(failedResult).toBeDefined()
      expect(failedResult?.url).toBe('https://mp.weixin.qq.com/s/fail')
      expect(failedResult?.error).toBe('Network error')
    })

    it('should continue downloading after non-auth errors', async () => {
      const urls = [
        'https://mp.weixin.qq.com/s/1',
        'https://mp.weixin.qq.com/s/2',
        'https://mp.weixin.qq.com/s/3',
      ]

      const html = '<html><script>var msg_title = "文章";</script></html>'
      global.fetch = vi
        .fn()
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: async () => html,
          headers: new Headers({ 'content-type': 'text/html' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: async () => html,
          headers: new Headers({ 'content-type': 'text/html' }),
        })

      const result = await downloadService.batchDownload(TEST_USER_ID, TEST_FAKEID, urls, 1)

      expect(result.failed).toBe(1)
      expect(result.completed).toBe(2)
      expect(result.loginExpired).toBe(false)
    })

    it('should handle storage quota errors', async () => {
      const urls = ['https://mp.weixin.qq.com/s/1']

      mockFileService.checkQuota.mockResolvedValue(false)

      const result = await downloadService.batchDownload(TEST_USER_ID, TEST_FAKEID, urls)

      expect(result.failed).toBe(1)
      expect(result.results[0]?.status).toBe('failed')
      expect(result.results[0]?.error).toContain('storage_quota_exceeded')
    })

    it('should capture error messages correctly', async () => {
      const urls = ['https://mp.weixin.qq.com/s/1']

      global.fetch = vi.fn().mockRejectedValue(new Error('Specific error message'))

      const result = await downloadService.batchDownload(TEST_USER_ID, TEST_FAKEID, urls)

      expect(result.results[0]?.error).toBe('Specific error message')
    })
  })

  // ==================== 5. 登录过期处理 (3个测试) ====================
  describe('登录过期处理', () => {
    it('should stop all downloads when WeChatExpiredError occurs', async () => {
      const urls = [
        'https://mp.weixin.qq.com/s/1',
        'https://mp.weixin.qq.com/s/2',
        'https://mp.weixin.qq.com/s/3',
      ]

      // Mock fetch to throw wechat_expired error on first call
      global.fetch = vi.fn().mockImplementation(async () => {
        throw new Error('wechat_expired')
      })

      const result = await downloadService.batchDownload(TEST_USER_ID, TEST_FAKEID, urls, 1)

      expect(result.loginExpired).toBe(true)
      expect(result.failed).toBe(3)
      expect(result.completed).toBe(0)
      expect(result.results.every(r => r.error === 'wechat_expired')).toBe(true)
    })

    it('should handle error message "wechat_expired" as login expiration', async () => {
      const urls = ['https://mp.weixin.qq.com/s/1', 'https://mp.weixin.qq.com/s/2']

      const error = new Error('wechat_expired')
      global.fetch = vi.fn().mockRejectedValue(error)

      const result = await downloadService.batchDownload(TEST_USER_ID, TEST_FAKEID, urls, 1)

      expect(result.loginExpired).toBe(true)
      expect(result.failed).toBe(2)
    })

    it('should mark remaining articles as failed after login expiration', async () => {
      const urls = [
        'https://mp.weixin.qq.com/s/1',
        'https://mp.weixin.qq.com/s/2',
        'https://mp.weixin.qq.com/s/3',
        'https://mp.weixin.qq.com/s/4',
      ]

      let callCount = 0
      global.fetch = vi.fn().mockImplementation(async () => {
        callCount++
        // 第2次及之后的所有调用都抛出登录过期错误
        if (callCount >= 2) {
          throw new Error('wechat_expired')
        }
        return {
          ok: true,
          status: 200,
          text: async () => '<html><script>var msg_title = "文章";</script></html>',
          headers: new Headers({ 'content-type': 'text/html' }),
        }
      })

      const result = await downloadService.batchDownload(TEST_USER_ID, TEST_FAKEID, urls, 1)

      expect(result.completed).toBeLessThan(2)
      expect(result.failed).toBeGreaterThanOrEqual(3)
      expect(result.loginExpired).toBe(true)
    })
  })

  // ==================== 6. 速率限制 (2个测试) ====================
  describe('速率限制', () => {
    it('should enforce 500ms delay between download starts', async () => {
      const urls = [
        'https://mp.weixin.qq.com/s/1',
        'https://mp.weixin.qq.com/s/2',
        'https://mp.weixin.qq.com/s/3',
      ]

      const startTimes: number[] = []
      const html = '<html><script>var msg_title = "文章";</script></html>'

      global.fetch = vi.fn().mockImplementation(async () => {
        startTimes.push(Date.now())
        return {
          ok: true,
          status: 200,
          text: async () => html,
          headers: new Headers({ 'content-type': 'text/html' }),
        }
      })

      const startTime = Date.now()
      await downloadService.batchDownload(TEST_USER_ID, TEST_FAKEID, urls, 1)
      const totalTime = Date.now() - startTime

      // 3个文章应该至少花费 500ms * 2 = 1000ms (第一个立即开始，后两个各延迟500ms)
      expect(totalTime).toBeGreaterThanOrEqual(1000)
    })

    it('should apply rate limit even with high concurrency', async () => {
      const urls = [
        'https://mp.weixin.qq.com/s/1',
        'https://mp.weixin.qq.com/s/2',
        'https://mp.weixin.qq.com/s/3',
        'https://mp.weixin.qq.com/s/4',
      ]

      const html = '<html><script>var msg_title = "文章";</script></html>'
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => html,
        headers: new Headers({ 'content-type': 'text/html' }),
      })

      const startTime = Date.now()
      await downloadService.batchDownload(TEST_USER_ID, TEST_FAKEID, urls, 3)
      const totalTime = Date.now() - startTime

      // 4个文章应该至少花费 500ms * 3 = 1500ms
      expect(totalTime).toBeGreaterThanOrEqual(1500)
    })
  })

  // ==================== 7. 边界条件 (4个测试) ====================
  describe('边界条件', () => {
    it('should handle single article correctly', async () => {
      const urls = ['https://mp.weixin.qq.com/s/single']

      const html = '<html><script>var msg_title = "单篇文章";</script></html>'
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => html,
        headers: new Headers({ 'content-type': 'text/html' }),
      })

      const result = await downloadService.batchDownload(TEST_USER_ID, TEST_FAKEID, urls)

      expect(result.total).toBe(1)
      expect(result.completed).toBe(1)
      expect(result.results[0]?.title).toBe('单篇文章')
    })

    it('should handle large batch (10+ articles)', async () => {
      const urls = Array.from({ length: 15 }, (_, i) => `https://mp.weixin.qq.com/s/article${i}`)

      const html = '<html><script>var msg_title = "文章";</script></html>'
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => html,
        headers: new Headers({ 'content-type': 'text/html' }),
      })

      const result = await downloadService.batchDownload(TEST_USER_ID, TEST_FAKEID, urls, 2)

      expect(result.total).toBe(15)
      expect(result.completed).toBe(15)
      expect(result.results).toHaveLength(15)
    })

    it('should handle mix of cached and new articles', async () => {
      const urls = [
        'https://mp.weixin.qq.com/s/cached1',
        'https://mp.weixin.qq.com/s/new1',
        'https://mp.weixin.qq.com/s/cached2',
        'https://mp.weixin.qq.com/s/new2',
      ]

      mockHtmlService.getDownloadedUrls.mockResolvedValue([
        'https://mp.weixin.qq.com/s/cached1',
        'https://mp.weixin.qq.com/s/cached2',
      ])

      const html = '<html><script>var msg_title = "新文章";</script></html>'
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => html,
        headers: new Headers({ 'content-type': 'text/html' }),
      })

      const result = await downloadService.batchDownload(TEST_USER_ID, TEST_FAKEID, urls)

      expect(result.total).toBe(4)
      expect(result.skipped).toBe(2)
      expect(result.completed).toBe(2)
    })

    it('should preserve article titles in results', async () => {
      const urls = [
        'https://mp.weixin.qq.com/s/1',
        'https://mp.weixin.qq.com/s/2',
      ]

      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: async () => '<html><script>var msg_title = "第一篇";</script></html>',
          headers: new Headers({ 'content-type': 'text/html' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: async () => '<html><script>var msg_title = "第二篇";</script></html>',
          headers: new Headers({ 'content-type': 'text/html' }),
        })

      const result = await downloadService.batchDownload(TEST_USER_ID, TEST_FAKEID, urls, 1)

      expect(result.results[0]?.title).toBe('第一篇')
      expect(result.results[1]?.title).toBe('第二篇')
    })
  })
})
