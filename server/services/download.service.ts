import { join } from 'path'
import { createHash } from 'crypto'
import { load as cheerioLoad } from 'cheerio'
import { getFileService } from './file.service'
import { getHtmlService } from './html.service'
import { getResourceService } from './resource.service'

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

const WECHAT_CDN_DOMAINS = ['mmbiz.qpic.cn', 'mmbiz.qlogo.cn']

export interface DownloadResult {
  title: string
  commentId?: string
  filePath: string
  fileSize: number
  imageCount: number
  failedImages: string[]
}

export interface BatchDownloadResult {
  total: number
  completed: number
  failed: number
  skipped: number
  loginExpired: boolean
  results: Array<{
    url: string
    status: 'completed' | 'failed' | 'skipped'
    title?: string
    error?: string
  }>
}

/**
 * WeChat login expired error
 */
export class WeChatExpiredError extends Error {
  constructor() {
    super('wechat_expired')
    this.name = 'WeChatExpiredError'
  }
}

/**
 * Fetch with retry logic
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3,
  delayMs = 1000,
): Promise<Response> {
  let lastError: Error | null = null
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options)
      return response
    } catch (e: any) {
      lastError = e
      if (attempt < maxRetries - 1) {
        await new Promise(r => setTimeout(r, delayMs))
      }
    }
  }
  throw lastError || new Error(`Failed to fetch ${url} after ${maxRetries} attempts`)
}

/**
 * Check if a URL belongs to WeChat CDN
 */
function isWeChatCdnUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return WECHAT_CDN_DOMAINS.some(d => parsed.hostname === d || parsed.hostname.endsWith(`.${d}`))
  } catch {
    return false
  }
}

/**
 * Hash a URL to produce a short filename
 */
function hashUrl(url: string): string {
  return createHash('md5').update(url).digest('hex').slice(0, 16)
}

/**
 * Guess file extension from Content-Type header or URL
 */
function guessExtension(contentType?: string | null, url?: string): string {
  if (contentType) {
    const map: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'image/svg+xml': 'svg',
      'image/bmp': 'bmp',
    }
    for (const [mime, ext] of Object.entries(map)) {
      if (contentType.includes(mime)) return ext
    }
  }
  // Fallback: try URL path
  if (url) {
    const match = url.match(/wx_fmt=(\w+)/)
    if (match) return match[1]!
    const pathMatch = url.match(/\.(\w{3,4})(?:\?|$)/)
    if (pathMatch && ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(pathMatch[1]!.toLowerCase())) {
      return pathMatch[1]!.toLowerCase()
    }
  }
  return 'jpg'
}

/**
 * Extract all image URLs from HTML content
 */
function extractImageUrls(html: string): string[] {
  const $ = cheerioLoad(html)
  const urls = new Set<string>()

  // <img src="..."> and <img data-src="...">
  $('img').each((_, el) => {
    const src = $(el).attr('src')
    const dataSrc = $(el).attr('data-src')
    if (dataSrc && isWeChatCdnUrl(dataSrc)) urls.add(dataSrc)
    else if (src && isWeChatCdnUrl(src)) urls.add(src)
  })

  // CSS background-image in style attributes
  $('[style]').each((_, el) => {
    const style = $(el).attr('style') || ''
    const bgMatches = style.matchAll(/url\(["']?(https?:\/\/[^"')]+)["']?\)/g)
    for (const m of bgMatches) {
      if (m[1] && isWeChatCdnUrl(m[1])) urls.add(m[1])
    }
  })

  return Array.from(urls)
}

/**
 * Replace image URLs in HTML with local relative paths
 */
function replaceImageUrls(html: string, urlMap: Map<string, string>): string {
  let result = html
  // Sort by URL length descending to avoid partial replacements
  const entries = Array.from(urlMap.entries()).sort((a, b) => b[0].length - a[0].length)
  for (const [originalUrl, localPath] of entries) {
    // Replace in src, data-src, and background-image
    result = result.replaceAll(originalUrl, localPath)
  }
  return result
}

export class DownloadService {
  private fileService = getFileService()
  private htmlService = getHtmlService()
  private resourceService = getResourceService()

  /**
   * Download a single article: fetch HTML, extract and download images, save everything
   */
  async downloadArticle(userId: number, fakeid: string, articleUrl: string): Promise<DownloadResult> {
    // Check if already downloaded
    const existing = await this.htmlService.getHtml(userId, articleUrl)
    if (existing) {
      return {
        title: existing.title,
        commentId: existing.commentId || undefined,
        filePath: existing.filePath,
        fileSize: existing.fileSize,
        imageCount: 0,
        failedImages: [],
      }
    }

    // Check storage quota (estimate 2MB for a typical article + images)
    const hasQuota = await this.fileService.checkQuota(userId, 2 * 1024 * 1024)
    if (!hasQuota) {
      throw new Error('storage_quota_exceeded')
    }

    // Fetch article HTML from WeChat
    const response = await fetchWithRetry(articleUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      },
      redirect: 'follow',
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    let htmlContent = await response.text()

    // Check for WeChat login expired indicator
    if (htmlContent.includes('200003') || htmlContent.includes('var is_need_ticket = true')) {
      // This is for articles requiring login - not the same as MP backend login expiry
      // Article pages are public, so this is fine to ignore
    }

    // Extract title (WeChat pages have empty <title>, real title is in msg_title or og:title)
    let title = 'Untitled'
    // Support both single and double quotes
    const msgTitleMatch = htmlContent.match(/var\s+msg_title\s*=\s*['"]([^'"]*?)['"]/)
    if (msgTitleMatch?.[1]) {
      title = msgTitleMatch[1].trim()
    } else {
      const ogTitleMatch = htmlContent.match(/og:title"?\s+content="([^"]*)"/)
      if (ogTitleMatch?.[1]) {
        title = ogTitleMatch[1].trim()
      } else {
        const htmlTitleMatch = htmlContent.match(/<title>([^<]+)<\/title>/i)
        if (htmlTitleMatch?.[1]?.trim()) {
          title = htmlTitleMatch[1].trim()
        }
      }
    }

    // Extract comment_id (support both single and double quotes)
    const commentIdMatch = htmlContent.match(/var\s+comment_id\s*=\s*['"]([^'"]+?)['"]/)
    const commentId = commentIdMatch?.[1]

    // Extract image URLs
    const imageUrls = extractImageUrls(htmlContent)
    const urlMap = new Map<string, string>()
    const failedImages: string[] = []

    // Download images
    const resourceDir = this.fileService.getUploadPath(userId, fakeid, 'resources')
    let totalImageBytes = 0

    for (const imgUrl of imageUrls) {
      try {
        // Check if this resource already exists
        const existingResource = await this.resourceService.getResource(userId, imgUrl)
        if (existingResource) {
          const hash = hashUrl(imgUrl)
          const ext = imgUrl.match(/wx_fmt=(\w+)/)?.[1] || 'jpg'
          urlMap.set(imgUrl, `images/${hash}.${ext}`)
          continue
        }

        const imgResponse = await fetchWithRetry(imgUrl, {
          headers: { 'User-Agent': USER_AGENT },
        }, 3, 1000)

        if (!imgResponse.ok) {
          failedImages.push(imgUrl)
          continue
        }

        const contentType = imgResponse.headers.get('content-type')
        const ext = guessExtension(contentType, imgUrl)
        const hash = hashUrl(imgUrl)
        const fileName = `${hash}.${ext}`
        const filePath = join(resourceDir, fileName)

        const buffer = Buffer.from(await imgResponse.arrayBuffer())
        const size = await this.fileService.saveFile(filePath, buffer)
        totalImageBytes += size

        // Save resource record
        await this.resourceService.saveResource(userId, {
          fakeid,
          resourceUrl: imgUrl,
          filePath,
          fileSize: size,
          mimeType: contentType || undefined,
        })

        // Map original URL to relative path
        urlMap.set(imgUrl, `images/${fileName}`)
      } catch {
        failedImages.push(imgUrl)
      }
    }

    // Replace image URLs in HTML
    if (urlMap.size > 0) {
      htmlContent = replaceImageUrls(htmlContent, urlMap)
    }

    // Save HTML file
    const encodedFilename = encodeURIComponent(title).replace(/%20/g, '_').slice(0, 200)
    const htmlDir = this.fileService.getUploadPath(userId, fakeid, 'html')
    const htmlFilePath = join(htmlDir, `${encodedFilename}.html`)
    const htmlSize = await this.fileService.saveFile(htmlFilePath, htmlContent)

    // Save HTML record to DB
    await this.htmlService.saveHtml(userId, {
      fakeid,
      articleUrl,
      title,
      commentId,
      filePath: htmlFilePath,
      fileSize: htmlSize,
    })

    // Save resource map for this article
    if (urlMap.size > 0) {
      const resourceMapObj: Record<string, string> = {}
      for (const [original, local] of urlMap) {
        resourceMapObj[original] = local
      }
      await this.resourceService.saveResourceMap(userId, {
        fakeid,
        articleUrl,
        resources: resourceMapObj,
      })
    }

    // Update user storage usage
    const totalBytes = htmlSize + totalImageBytes
    await this.fileService.updateStorageUsed(userId, totalBytes)

    return {
      title,
      commentId,
      filePath: htmlFilePath,
      fileSize: htmlSize,
      imageCount: urlMap.size,
      failedImages,
    }
  }

  /**
   * Batch download articles with concurrency control
   */
  async batchDownload(
    userId: number,
    fakeid: string,
    articleUrls: string[],
    concurrency = 2,
  ): Promise<BatchDownloadResult> {
    const results: BatchDownloadResult['results'] = []
    let completed = 0
    let failed = 0
    let skipped = 0
    let loginExpired = false

    // Get already-downloaded URLs to skip
    const downloadedUrls = new Set(await this.htmlService.getDownloadedUrls(userId, fakeid))

    // Filter and prepare work items
    const workItems: Array<{ url: string; index: number }> = []
    for (let i = 0; i < articleUrls.length; i++) {
      const url = articleUrls[i]!
      if (downloadedUrls.has(url)) {
        skipped++
        results.push({ url, status: 'skipped', title: undefined })
      } else {
        workItems.push({ url, index: i })
      }
    }

    // Process with concurrency control using a simple semaphore
    let activeCount = 0
    let workIndex = 0
    const effectiveConcurrency = Math.min(Math.max(1, concurrency), 3)

    const processOne = async (url: string): Promise<void> => {
      // Check if login expired before starting download
      if (loginExpired) {
        results.push({ url, status: 'failed', error: 'wechat_expired' })
        failed++
        return
      }

      try {
        const result = await this.downloadArticle(userId, fakeid, url)

        // Check again after async operation in case expired during download
        if (loginExpired) {
          results.push({ url, status: 'failed', error: 'wechat_expired' })
          failed++
          return
        }

        completed++
        results.push({
          url,
          status: 'completed',
          title: result.title,
        })
      } catch (e: any) {
        if (e instanceof WeChatExpiredError || e.message === 'wechat_expired') {
          loginExpired = true
          results.push({ url, status: 'failed', error: 'wechat_expired' })
          failed++
          return
        }
        failed++
        results.push({
          url,
          status: 'failed',
          error: e.message || 'Unknown error',
        })
      }
    }

    // Sequential processing with controlled concurrency
    const promises: Promise<void>[] = []

    for (const item of workItems) {
      if (loginExpired) {
        // If login expired, mark remaining as failed
        results.push({ url: item.url, status: 'failed', error: 'wechat_expired' })
        failed++
        continue
      }

      // Wait for a slot to open if at max concurrency
      while (activeCount >= effectiveConcurrency) {
        await Promise.race(promises)
      }

      activeCount++
      const p = processOne(item.url).finally(() => {
        activeCount--
        const idx = promises.indexOf(p)
        if (idx >= 0) promises.splice(idx, 1)
      })
      promises.push(p)

      // Rate limit: 500ms delay between starting each download
      await new Promise(r => setTimeout(r, 500))
    }

    // Wait for remaining
    await Promise.all(promises)

    return {
      total: articleUrls.length,
      completed,
      failed,
      skipped,
      loginExpired,
      results,
    }
  }
}

let _downloadService: DownloadService | null = null
export function getDownloadService(): DownloadService {
  if (!_downloadService) _downloadService = new DownloadService()
  return _downloadService
}

// Export helper functions for testing
export { isWeChatCdnUrl, hashUrl, guessExtension, extractImageUrls, replaceImageUrls }
