/**
 * 图片优化器测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ImageOptimizer } from '../../server/utils/performance/image-optimizer'

// Mock sharp
const mockMetadata = vi.fn()
const mockResize = vi.fn()
const mockWebp = vi.fn()
const mockAvif = vi.fn()
const mockJpeg = vi.fn()
const mockPng = vi.fn()
const mockToBuffer = vi.fn()

const createMockSharp = () => {
  const mock = {
    metadata: mockMetadata,
    resize: mockResize,
    webp: mockWebp,
    avif: mockAvif,
    jpeg: mockJpeg,
    png: mockPng,
    toBuffer: mockToBuffer,
  }

  // Chain methods
  mockResize.mockReturnValue(mock)
  mockWebp.mockReturnValue(mock)
  mockAvif.mockReturnValue(mock)
  mockJpeg.mockReturnValue(mock)
  mockPng.mockReturnValue(mock)

  return mock
}

vi.mock('sharp', () => ({
  default: vi.fn(() => createMockSharp()),
}))

import sharp from 'sharp'

describe('Image Optimizer', () => {
  let optimizer: ImageOptimizer

  beforeEach(() => {
    vi.clearAllMocks()
    optimizer = new ImageOptimizer()

    // 默认 mock 返回值
    mockMetadata.mockResolvedValue({
      width: 1000,
      height: 800,
      format: 'jpeg',
      size: 50000,
      hasAlpha: false,
    })

    mockToBuffer.mockResolvedValue(Buffer.from('optimized-image-data'))
  })

  describe('optimize()', () => {
    it('应该优化图片并返回结果', async () => {
      const inputBuffer = Buffer.from('test-image')

      const result = await optimizer.optimize(inputBuffer)

      expect(result).toHaveProperty('buffer')
      expect(result).toHaveProperty('metadata')
      expect(result).toHaveProperty('originalSize')
      expect(result).toHaveProperty('optimizedSize')
      expect(result).toHaveProperty('compressionRatio')
    })

    it('应该使用默认质量（80）', async () => {
      const inputBuffer = Buffer.from('test-image')

      await optimizer.optimize(inputBuffer, { format: 'jpeg' })

      expect(mockJpeg).toHaveBeenCalledWith({
        quality: 80,
        progressive: true,
      })
    })

    it('应该支持自定义质量', async () => {
      const inputBuffer = Buffer.from('test-image')

      await optimizer.optimize(inputBuffer, {
        format: 'jpeg',
        quality: 90,
      })

      expect(mockJpeg).toHaveBeenCalledWith({
        quality: 90,
        progressive: true,
      })
    })

    it('应该支持 WebP 格式转换', async () => {
      const inputBuffer = Buffer.from('test-image')

      await optimizer.optimize(inputBuffer, {
        format: 'webp',
        quality: 85,
      })

      expect(mockWebp).toHaveBeenCalledWith({
        quality: 85,
        progressive: true,
      })
    })

    it('应该支持 AVIF 格式转换', async () => {
      const inputBuffer = Buffer.from('test-image')

      await optimizer.optimize(inputBuffer, {
        format: 'avif',
        quality: 75,
      })

      expect(mockAvif).toHaveBeenCalledWith({
        quality: 75,
      })
    })

    it('应该支持 PNG 格式转换', async () => {
      const inputBuffer = Buffer.from('test-image')

      await optimizer.optimize(inputBuffer, {
        format: 'png',
        quality: 90,
      })

      expect(mockPng).toHaveBeenCalledWith({
        quality: 90,
        progressive: true,
      })
    })

    it('应该支持调整宽度', async () => {
      const inputBuffer = Buffer.from('test-image')

      await optimizer.optimize(inputBuffer, {
        width: 800,
      })

      expect(mockResize).toHaveBeenCalledWith(800, undefined, {
        fit: 'inside',
        withoutEnlargement: true,
      })
    })

    it('应该支持调整高度', async () => {
      const inputBuffer = Buffer.from('test-image')

      await optimizer.optimize(inputBuffer, {
        height: 600,
      })

      expect(mockResize).toHaveBeenCalledWith(undefined, 600, {
        fit: 'inside',
        withoutEnlargement: true,
      })
    })

    it('应该支持同��调整宽度和高度', async () => {
      const inputBuffer = Buffer.from('test-image')

      await optimizer.optimize(inputBuffer, {
        width: 800,
        height: 600,
      })

      expect(mockResize).toHaveBeenCalledWith(800, 600, {
        fit: 'inside',
        withoutEnlargement: true,
      })
    })

    it('应该支持保持宽高比（默认）', async () => {
      const inputBuffer = Buffer.from('test-image')

      await optimizer.optimize(inputBuffer, {
        width: 800,
        height: 600,
      })

      expect(mockResize).toHaveBeenCalledWith(800, 600, {
        fit: 'inside',
        withoutEnlargement: true,
      })
    })

    it('应该支持不保持宽高比', async () => {
      const inputBuffer = Buffer.from('test-image')

      await optimizer.optimize(inputBuffer, {
        width: 800,
        height: 600,
        maintainAspectRatio: false,
      })

      expect(mockResize).toHaveBeenCalledWith(800, 600, {
        fit: 'fill',
        withoutEnlargement: true,
      })
    })

    it('应该计算压缩比', async () => {
      const inputBuffer = Buffer.from('test-image-data-1000-bytes')
      const compressedBuffer = Buffer.from('compressed-500-bytes')
      mockToBuffer.mockResolvedValue(compressedBuffer)

      const result = await optimizer.optimize(inputBuffer)

      expect(result.originalSize).toBe(inputBuffer.length)
      expect(result.optimizedSize).toBe(compressedBuffer.length)
      expect(result.compressionRatio).toBeCloseTo(compressedBuffer.length / inputBuffer.length, 2)
    })

    it('应该返回正确的元数据', async () => {
      const inputBuffer = Buffer.from('test-image')
      mockMetadata.mockResolvedValue({
        width: 800,
        height: 600,
        format: 'webp',
        size: 30000,
        hasAlpha: true,
      })

      const result = await optimizer.optimize(inputBuffer)

      expect(result.metadata.width).toBe(800)
      expect(result.metadata.height).toBe(600)
      expect(result.metadata.format).toBe('webp')
      expect(result.metadata.size).toBe(30000)
      expect(result.metadata.hasAlpha).toBe(true)
    })

    it('应该处理缺失的元数据字段', async () => {
      const inputBuffer = Buffer.from('test-image')
      mockMetadata.mockResolvedValue({})

      const result = await optimizer.optimize(inputBuffer)

      expect(result.metadata.width).toBe(0)
      expect(result.metadata.height).toBe(0)
      expect(result.metadata.format).toBe('unknown')
      expect(result.metadata.size).toBe(0)
      expect(result.metadata.hasAlpha).toBe(false)
    })

    it('应该处理零原始大小（避免除以零）', async () => {
      const inputBuffer = Buffer.alloc(0)

      const result = await optimizer.optimize(inputBuffer)

      expect(result.compressionRatio).toBe(1)
    })
  })

  describe('generateResponsiveSizes()', () => {
    it('应该生成默认尺寸的响应式图片', async () => {
      const inputBuffer = Buffer.from('test-image')

      const result = await optimizer.generateResponsiveSizes(inputBuffer)

      expect(result.size).toBe(4) // [320, 640, 1024, 1920]
      expect(result.has(320)).toBe(true)
      expect(result.has(640)).toBe(true)
      expect(result.has(1024)).toBe(true)
      expect(result.has(1920)).toBe(true)
    })

    it('应该支持自定义尺寸', async () => {
      const inputBuffer = Buffer.from('test-image')

      const result = await optimizer.generateResponsiveSizes(inputBuffer, [
        100,
        200,
        400,
      ])

      expect(result.size).toBe(3)
      expect(result.has(100)).toBe(true)
      expect(result.has(200)).toBe(true)
      expect(result.has(400)).toBe(true)
    })

    it('应该为每个尺寸调用 resize', async () => {
      const inputBuffer = Buffer.from('test-image')

      await optimizer.generateResponsiveSizes(inputBuffer, [100, 200])

      expect(mockResize).toHaveBeenCalledTimes(2)
      expect(mockResize).toHaveBeenCalledWith(100, undefined, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      expect(mockResize).toHaveBeenCalledWith(200, undefined, {
        fit: 'inside',
        withoutEnlargement: true,
      })
    })
  })

  describe('toWebP()', () => {
    it('应该转换为 WebP 格式（默认质量80）', async () => {
      const inputBuffer = Buffer.from('test-image')

      await optimizer.toWebP(inputBuffer)

      expect(mockWebp).toHaveBeenCalledWith({ quality: 80 })
      expect(mockToBuffer).toHaveBeenCalled()
    })

    it('应该支持自定义质量', async () => {
      const inputBuffer = Buffer.from('test-image')

      await optimizer.toWebP(inputBuffer, 90)

      expect(mockWebp).toHaveBeenCalledWith({ quality: 90 })
    })

    it('应该返回 Buffer', async () => {
      const inputBuffer = Buffer.from('test-image')
      const expectedBuffer = Buffer.from('webp-data')
      mockToBuffer.mockResolvedValue(expectedBuffer)

      const result = await optimizer.toWebP(inputBuffer)

      expect(result).toBe(expectedBuffer)
    })
  })

  describe('generateThumbnail()', () => {
    it('应该生成默认尺寸的缩略图（200x200）', async () => {
      const inputBuffer = Buffer.from('test-image')

      await optimizer.generateThumbnail(inputBuffer)

      expect(mockResize).toHaveBeenCalledWith(200, 200, { fit: 'cover' })
      expect(mockToBuffer).toHaveBeenCalled()
    })

    it('应该支持自定义宽度', async () => {
      const inputBuffer = Buffer.from('test-image')

      await optimizer.generateThumbnail(inputBuffer, 150)

      expect(mockResize).toHaveBeenCalledWith(150, 200, { fit: 'cover' })
    })

    it('应该支持自定义高度', async () => {
      const inputBuffer = Buffer.from('test-image')

      await optimizer.generateThumbnail(inputBuffer, 200, 150)

      expect(mockResize).toHaveBeenCalledWith(200, 150, { fit: 'cover' })
    })

    it('应该支持自定义宽度和高度', async () => {
      const inputBuffer = Buffer.from('test-image')

      await optimizer.generateThumbnail(inputBuffer, 300, 250)

      expect(mockResize).toHaveBeenCalledWith(300, 250, { fit: 'cover' })
    })

    it('应该返回 Buffer', async () => {
      const inputBuffer = Buffer.from('test-image')
      const expectedBuffer = Buffer.from('thumbnail-data')
      mockToBuffer.mockResolvedValue(expectedBuffer)

      const result = await optimizer.generateThumbnail(inputBuffer)

      expect(result).toBe(expectedBuffer)
    })
  })

  describe('getMetadata()', () => {
    it('应该提取图片元数据', async () => {
      const inputBuffer = Buffer.from('test-image')
      mockMetadata.mockResolvedValue({
        width: 1920,
        height: 1080,
        format: 'png',
        size: 100000,
        hasAlpha: true,
      })

      const result = await optimizer.getMetadata(inputBuffer)

      expect(result.width).toBe(1920)
      expect(result.height).toBe(1080)
      expect(result.format).toBe('png')
      expect(result.size).toBe(100000)
      expect(result.hasAlpha).toBe(true)
    })

    it('应该处理缺失的元数据字段', async () => {
      const inputBuffer = Buffer.from('test-image')
      mockMetadata.mockResolvedValue({})

      const result = await optimizer.getMetadata(inputBuffer)

      expect(result.width).toBe(0)
      expect(result.height).toBe(0)
      expect(result.format).toBe('unknown')
      expect(result.size).toBe(0)
      expect(result.hasAlpha).toBe(false)
    })

    it('应该支持文件路径输入', async () => {
      const filePath = '/path/to/image.jpg'
      mockMetadata.mockResolvedValue({
        width: 1000,
        height: 800,
        format: 'jpeg',
        size: 50000,
        hasAlpha: false,
      })

      const result = await optimizer.getMetadata(filePath)

      expect(sharp).toHaveBeenCalledWith(filePath)
      expect(result.width).toBe(1000)
      expect(result.height).toBe(800)
    })
  })

  describe('综合场景测试', () => {
    it('应该支持完整的优化流程（缩放 + 格式转换 + 质量调整）', async () => {
      const inputBuffer = Buffer.from('large-image-data')

      await optimizer.optimize(inputBuffer, {
        width: 800,
        height: 600,
        format: 'webp',
        quality: 85,
        maintainAspectRatio: true,
        progressive: true,
      })

      expect(mockResize).toHaveBeenCalledWith(800, 600, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      expect(mockWebp).toHaveBeenCalledWith({
        quality: 85,
        progressive: true,
      })
      expect(mockToBuffer).toHaveBeenCalled()
    })

    it('应该处理只调整质量而不改变尺寸', async () => {
      const inputBuffer = Buffer.from('test-image')

      await optimizer.optimize(inputBuffer, {
        format: 'jpeg',
        quality: 70,
      })

      expect(mockResize).not.toHaveBeenCalled()
      expect(mockJpeg).toHaveBeenCalledWith({
        quality: 70,
        progressive: true,
      })
    })

    it('应该处理只调整尺寸而不改变格式', async () => {
      const inputBuffer = Buffer.from('test-image')

      await optimizer.optimize(inputBuffer, {
        width: 500,
      })

      expect(mockResize).toHaveBeenCalledWith(500, undefined, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      expect(mockWebp).not.toHaveBeenCalled()
      expect(mockJpeg).not.toHaveBeenCalled()
      expect(mockPng).not.toHaveBeenCalled()
      expect(mockAvif).not.toHaveBeenCalled()
    })
  })
})
