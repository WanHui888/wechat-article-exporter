import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * 下载引擎辅助函数单元测试
 *
 * 测试范围:
 * - isWeChatCdnUrl: 微信CDN URL检测
 * - hashUrl: URL哈希生成
 * - guessExtension: 文件扩展名猜测
 * - extractImageUrls: HTML中图片URL提取
 * - replaceImageUrls: 图片URL替换
 */

// 导入需要测试的辅助函数
// 注意: 这些函数目前在 DownloadService 内部，需要导出才能测试
import {
  isWeChatCdnUrl,
  hashUrl,
  guessExtension,
  extractImageUrls,
  replaceImageUrls,
} from '~/server/services/download.service'

describe('Download Engine Helper Functions', () => {
  describe('isWeChatCdnUrl', () => {
    it('should identify mmbiz.qpic.cn as WeChat CDN', () => {
      const url = 'https://mmbiz.qpic.cn/mmbiz_jpg/abc123/0?wx_fmt=jpeg'
      expect(isWeChatCdnUrl(url)).toBe(true)
    })

    it('should identify mmbiz.qlogo.cn as WeChat CDN', () => {
      const url = 'https://mmbiz.qlogo.cn/mmbiz_png/xyz789/0?wx_fmt=png'
      expect(isWeChatCdnUrl(url)).toBe(true)
    })

    it('should identify subdomain variants (wx1.mmbiz.qpic.cn)', () => {
      const url = 'https://wx1.mmbiz.qpic.cn/mmbiz_webp/web123/0?wx_fmt=webp'
      expect(isWeChatCdnUrl(url)).toBe(true)
    })

    it('should reject non-WeChat CDN URLs', () => {
      const url = 'https://example.com/image.jpg'
      expect(isWeChatCdnUrl(url)).toBe(false)
    })

    it('should reject URLs with similar but different domains', () => {
      const url = 'https://fake-mmbiz.qpic.cn.evil.com/image.jpg'
      expect(isWeChatCdnUrl(url)).toBe(false)
    })

    it('should handle invalid URLs gracefully', () => {
      const invalidUrl = 'not-a-url'
      expect(isWeChatCdnUrl(invalidUrl)).toBe(false)
    })

    it('should handle empty string', () => {
      expect(isWeChatCdnUrl('')).toBe(false)
    })

    it('should handle protocol-relative URLs', () => {
      const url = '//mmbiz.qpic.cn/mmbiz_jpg/abc123/0'
      expect(isWeChatCdnUrl(url)).toBe(false) // Invalid for URL constructor
    })
  })

  describe('hashUrl', () => {
    it('should generate a 16-character hash', () => {
      const url = 'https://mmbiz.qpic.cn/mmbiz_jpg/abc123/0?wx_fmt=jpeg'
      const hash = hashUrl(url)
      expect(hash).toHaveLength(16)
    })

    it('should generate consistent hashes for same URL', () => {
      const url = 'https://mmbiz.qpic.cn/mmbiz_jpg/abc123/0?wx_fmt=jpeg'
      const hash1 = hashUrl(url)
      const hash2 = hashUrl(url)
      expect(hash1).toBe(hash2)
    })

    it('should generate different hashes for different URLs', () => {
      const url1 = 'https://mmbiz.qpic.cn/mmbiz_jpg/abc123/0?wx_fmt=jpeg'
      const url2 = 'https://mmbiz.qpic.cn/mmbiz_jpg/xyz789/0?wx_fmt=jpeg'
      const hash1 = hashUrl(url1)
      const hash2 = hashUrl(url2)
      expect(hash1).not.toBe(hash2)
    })

    it('should only use hex characters [0-9a-f]', () => {
      const url = 'https://mmbiz.qpic.cn/mmbiz_jpg/abc123/0?wx_fmt=jpeg'
      const hash = hashUrl(url)
      expect(hash).toMatch(/^[0-9a-f]{16}$/)
    })

    it('should handle empty string', () => {
      const hash = hashUrl('')
      expect(hash).toHaveLength(16)
      expect(hash).toMatch(/^[0-9a-f]{16}$/)
    })

    it('should handle unicode URLs', () => {
      const url = 'https://mmbiz.qpic.cn/测试/图片'
      const hash = hashUrl(url)
      expect(hash).toHaveLength(16)
      expect(hash).toMatch(/^[0-9a-f]{16}$/)
    })
  })

  describe('guessExtension', () => {
    describe('from Content-Type header', () => {
      it('should extract jpg from image/jpeg', () => {
        expect(guessExtension('image/jpeg')).toBe('jpg')
      })

      it('should extract jpg from image/jpg', () => {
        expect(guessExtension('image/jpg')).toBe('jpg')
      })

      it('should extract png from image/png', () => {
        expect(guessExtension('image/png')).toBe('png')
      })

      it('should extract gif from image/gif', () => {
        expect(guessExtension('image/gif')).toBe('gif')
      })

      it('should extract webp from image/webp', () => {
        expect(guessExtension('image/webp')).toBe('webp')
      })

      it('should extract svg from image/svg+xml', () => {
        expect(guessExtension('image/svg+xml')).toBe('svg')
      })

      it('should extract bmp from image/bmp', () => {
        expect(guessExtension('image/bmp')).toBe('bmp')
      })

      it('should handle Content-Type with charset', () => {
        expect(guessExtension('image/png; charset=utf-8')).toBe('png')
      })
    })

    describe('from URL wx_fmt parameter', () => {
      it('should extract jpeg from wx_fmt=jpeg', () => {
        const url = 'https://mmbiz.qpic.cn/mmbiz_jpg/abc/0?wx_fmt=jpeg'
        expect(guessExtension(null, url)).toBe('jpeg')
      })

      it('should extract png from wx_fmt=png', () => {
        const url = 'https://mmbiz.qpic.cn/mmbiz_png/abc/0?wx_fmt=png'
        expect(guessExtension(null, url)).toBe('png')
      })

      it('should extract webp from wx_fmt=webp', () => {
        const url = 'https://mmbiz.qpic.cn/mmbiz_webp/abc/0?wx_fmt=webp'
        expect(guessExtension(null, url)).toBe('webp')
      })
    })

    describe('from URL file extension', () => {
      it('should extract jpg from .jpg in URL path', () => {
        const url = 'https://example.com/image.jpg'
        expect(guessExtension(null, url)).toBe('jpg')
      })

      it('should extract png from .png in URL path', () => {
        const url = 'https://example.com/image.png?size=large'
        expect(guessExtension(null, url)).toBe('png')
      })

      it('should be case-insensitive for file extensions', () => {
        const url = 'https://example.com/image.PNG'
        expect(guessExtension(null, url)).toBe('png')
      })

      it('should ignore invalid file extensions', () => {
        const url = 'https://example.com/file.txt'
        expect(guessExtension(null, url)).toBe('jpg') // Default fallback
      })
    })

    describe('priority and fallback', () => {
      it('should prefer Content-Type over URL', () => {
        const url = 'https://example.com/image.png'
        expect(guessExtension('image/jpeg', url)).toBe('jpg')
      })

      it('should fallback to URL if Content-Type is unknown', () => {
        const url = 'https://example.com/image?wx_fmt=png'
        expect(guessExtension('application/octet-stream', url)).toBe('png')
      })

      it('should return jpg as default fallback', () => {
        expect(guessExtension(null, null)).toBe('jpg')
      })

      it('should return jpg when both are missing/invalid', () => {
        expect(guessExtension('text/html', 'https://example.com/page')).toBe('jpg')
      })
    })
  })

  describe('extractImageUrls', () => {
    const sampleHtmlPath = join(process.cwd(), 'tests/fixtures/sample-article-with-images.html')
    const sampleHtml = readFileSync(sampleHtmlPath, 'utf-8')

    it('should extract images from <img src>', () => {
      const html = '<img src="https://mmbiz.qpic.cn/mmbiz_jpg/abc123/0?wx_fmt=jpeg">'
      const urls = extractImageUrls(html)
      expect(urls).toContain('https://mmbiz.qpic.cn/mmbiz_jpg/abc123/0?wx_fmt=jpeg')
    })

    it('should extract images from <img data-src> (lazy loading)', () => {
      const html = '<img data-src="https://mmbiz.qlogo.cn/mmbiz_png/xyz789/0?wx_fmt=png">'
      const urls = extractImageUrls(html)
      expect(urls).toContain('https://mmbiz.qlogo.cn/mmbiz_png/xyz789/0?wx_fmt=png')
    })

    it('should prioritize data-src over src when both exist', () => {
      const html = `
        <img src="https://example.com/placeholder.jpg"
             data-src="https://mmbiz.qpic.cn/mmbiz_jpg/real123/0?wx_fmt=jpeg">
      `
      const urls = extractImageUrls(html)
      expect(urls).toContain('https://mmbiz.qpic.cn/mmbiz_jpg/real123/0?wx_fmt=jpeg')
      expect(urls).not.toContain('https://example.com/placeholder.jpg')
    })

    it('should extract CSS background-image URLs', () => {
      const html = '<div style="background-image: url(\'https://mmbiz.qpic.cn/mmbiz_jpg/bg123/0\');"></div>'
      const urls = extractImageUrls(html)
      expect(urls).toContain('https://mmbiz.qpic.cn/mmbiz_jpg/bg123/0')
    })

    it('should handle background-image with double quotes', () => {
      const html = '<div style="background-image: url(&quot;https://mmbiz.qpic.cn/mmbiz_jpg/bg456/0&quot;);"></div>'
      const urls = extractImageUrls(html)
      expect(urls).toContain('https://mmbiz.qpic.cn/mmbiz_jpg/bg456/0')
    })

    it('should handle background-image without quotes', () => {
      const html = '<div style="background-image: url(https://mmbiz.qpic.cn/mmbiz_jpg/bg789/0);"></div>'
      const urls = extractImageUrls(html)
      expect(urls).toContain('https://mmbiz.qpic.cn/mmbiz_jpg/bg789/0')
    })

    it('should deduplicate identical URLs', () => {
      const html = `
        <img src="https://mmbiz.qpic.cn/mmbiz_jpg/abc123/0?wx_fmt=jpeg">
        <img src="https://mmbiz.qpic.cn/mmbiz_jpg/abc123/0?wx_fmt=jpeg">
      `
      const urls = extractImageUrls(html)
      const count = urls.filter(u => u === 'https://mmbiz.qpic.cn/mmbiz_jpg/abc123/0?wx_fmt=jpeg').length
      expect(count).toBe(1)
    })

    it('should only extract WeChat CDN URLs', () => {
      const html = `
        <img src="https://mmbiz.qpic.cn/mmbiz_jpg/wechat123/0">
        <img src="https://example.com/external.jpg">
      `
      const urls = extractImageUrls(html)
      expect(urls).toContain('https://mmbiz.qpic.cn/mmbiz_jpg/wechat123/0')
      expect(urls).not.toContain('https://example.com/external.jpg')
    })

    it('should extract all unique WeChat CDN URLs from fixture', () => {
      const urls = extractImageUrls(sampleHtml)

      // 根据 sample-article-with-images.html 的实际内容
      expect(urls).toContain('https://mmbiz.qpic.cn/mmbiz_jpg/abc123/0?wx_fmt=jpeg')
      expect(urls).toContain('https://mmbiz.qlogo.cn/mmbiz_png/xyz789/0?wx_fmt=png')
      expect(urls).toContain('https://mmbiz.qpic.cn/mmbiz_jpg/bg123/0')
      expect(urls).toContain('https://wx1.mmbiz.qpic.cn/mmbiz_webp/web123/0?wx_fmt=webp')

      // 不应包含外部URL
      expect(urls).not.toContain('https://example.com/image.jpg')

      // 应该去重
      expect(urls.length).toBe(4)
    })

    it('should return empty array for HTML with no WeChat images', () => {
      const html = '<div><p>No images here</p><img src="https://example.com/img.jpg"></div>'
      const urls = extractImageUrls(html)
      expect(urls).toEqual([])
    })

    it('should handle malformed HTML gracefully', () => {
      const html = '<img src="https://mmbiz.qpic.cn/test.jpg"><div><img data-src="invalid'
      const urls = extractImageUrls(html)
      expect(urls).toContain('https://mmbiz.qpic.cn/test.jpg')
    })
  })

  describe('replaceImageUrls', () => {
    it('should replace image URLs with local paths', () => {
      const html = '<img src="https://mmbiz.qpic.cn/mmbiz_jpg/abc123/0?wx_fmt=jpeg">'
      const urlMap = new Map([
        ['https://mmbiz.qpic.cn/mmbiz_jpg/abc123/0?wx_fmt=jpeg', 'images/abc123.jpg'],
      ])
      const result = replaceImageUrls(html, urlMap)
      expect(result).toBe('<img src="images/abc123.jpg">')
    })

    it('should replace multiple different URLs', () => {
      const html = `
        <img src="https://mmbiz.qpic.cn/mmbiz_jpg/abc123/0">
        <img src="https://mmbiz.qlogo.cn/mmbiz_png/xyz789/0">
      `
      const urlMap = new Map([
        ['https://mmbiz.qpic.cn/mmbiz_jpg/abc123/0', 'images/abc.jpg'],
        ['https://mmbiz.qlogo.cn/mmbiz_png/xyz789/0', 'images/xyz.png'],
      ])
      const result = replaceImageUrls(html, urlMap)
      expect(result).toContain('images/abc.jpg')
      expect(result).toContain('images/xyz.png')
      expect(result).not.toContain('mmbiz.qpic.cn')
      expect(result).not.toContain('mmbiz.qlogo.cn')
    })

    it('should replace URLs in CSS background-image', () => {
      const html = '<div style="background-image: url(\'https://mmbiz.qpic.cn/bg.jpg\');"></div>'
      const urlMap = new Map([
        ['https://mmbiz.qpic.cn/bg.jpg', 'images/bg.jpg'],
      ])
      const result = replaceImageUrls(html, urlMap)
      expect(result).toContain('images/bg.jpg')
      expect(result).not.toContain('mmbiz.qpic.cn')
    })

    it('should handle duplicate URLs correctly', () => {
      const html = `
        <img src="https://mmbiz.qpic.cn/dup.jpg">
        <img src="https://mmbiz.qpic.cn/dup.jpg">
      `
      const urlMap = new Map([
        ['https://mmbiz.qpic.cn/dup.jpg', 'images/dup.jpg'],
      ])
      const result = replaceImageUrls(html, urlMap)
      const count = (result.match(/images\/dup\.jpg/g) || []).length
      expect(count).toBe(2)
    })

    it('should not replace URLs not in the map', () => {
      const html = `
        <img src="https://mmbiz.qpic.cn/mapped.jpg">
        <img src="https://mmbiz.qpic.cn/unmapped.jpg">
      `
      const urlMap = new Map([
        ['https://mmbiz.qpic.cn/mapped.jpg', 'images/mapped.jpg'],
      ])
      const result = replaceImageUrls(html, urlMap)
      expect(result).toContain('images/mapped.jpg')
      expect(result).toContain('https://mmbiz.qpic.cn/unmapped.jpg')
    })

    it('should handle empty URL map', () => {
      const html = '<img src="https://mmbiz.qpic.cn/test.jpg">'
      const urlMap = new Map()
      const result = replaceImageUrls(html, urlMap)
      expect(result).toBe(html)
    })

    it('should avoid partial URL replacements by sorting by length', () => {
      // 测试长URL不会被短URL部分替换
      const html = '<img src="https://mmbiz.qpic.cn/long/path/image.jpg">'
      const urlMap = new Map([
        ['https://mmbiz.qpic.cn/long', 'images/short.jpg'], // 不应匹配
        ['https://mmbiz.qpic.cn/long/path/image.jpg', 'images/full.jpg'], // 应匹配
      ])
      const result = replaceImageUrls(html, urlMap)
      expect(result).toContain('images/full.jpg')
      expect(result).not.toContain('images/short.jpg')
    })

    it('should replace all occurrences of the same URL', () => {
      const html = `
        <img src="https://mmbiz.qpic.cn/img.jpg">
        <div style="background: url('https://mmbiz.qpic.cn/img.jpg')"></div>
        <img data-src="https://mmbiz.qpic.cn/img.jpg">
      `
      const urlMap = new Map([
        ['https://mmbiz.qpic.cn/img.jpg', 'images/local.jpg'],
      ])
      const result = replaceImageUrls(html, urlMap)
      const count = (result.match(/images\/local\.jpg/g) || []).length
      expect(count).toBe(3)
    })
  })
})
