/**
 * 图片处理优化器
 *
 * 使用 sharp 实现高性能图片处理
 * 功能：压缩、转换、缩放、裁剪
 */

import sharp from 'sharp'

/**
 * 图片优化选项
 */
export interface ImageOptimizeOptions {
  /** 目标宽度 */
  width?: number
  /** 目标高度 */
  height?: number
  /** 压缩质量 (0-100) */
  quality?: number
  /** 目标格式 */
  format?: 'jpeg' | 'png' | 'webp' | 'avif'
  /** 是否保持宽高比 */
  maintainAspectRatio?: boolean
  /** 是否渐进式 */
  progressive?: boolean
}

/**
 * 图片元数据
 */
export interface ImageMetadata {
  width: number
  height: number
  format: string
  size: number
  hasAlpha: boolean
}

/**
 * 图片优化结果
 */
export interface OptimizeResult {
  buffer: Buffer
  metadata: ImageMetadata
  originalSize: number
  optimizedSize: number
  compressionRatio: number
}

/**
 * 图片优化器类
 */
export class ImageOptimizer {
  /**
   * 优化图片
   */
  async optimize(
    input: Buffer | string,
    options: ImageOptimizeOptions = {},
  ): Promise<OptimizeResult> {
    const {
      width,
      height,
      quality = 80,
      format,
      maintainAspectRatio = true,
      progressive = true,
    } = options

    const originalSize = typeof input === 'string'
      ? (await sharp(input).metadata()).size || 0
      : input.length

    // 创建 sharp 实例
    let pipeline = sharp(input)

    // 调整尺寸
    if (width || height) {
      pipeline = pipeline.resize(width, height, {
        fit: maintainAspectRatio ? 'inside' : 'fill',
        withoutEnlargement: true,
      })
    }

    // 格式转换和压缩
    if (format === 'webp') {
      pipeline = pipeline.webp({ quality, progressive })
    } else if (format === 'avif') {
      pipeline = pipeline.avif({ quality })
    } else if (format === 'jpeg') {
      pipeline = pipeline.jpeg({ quality, progressive })
    } else if (format === 'png') {
      pipeline = pipeline.png({ quality, progressive })
    }

    // 执行优化
    const optimizedBuffer = await pipeline.toBuffer()
    const metadata = await sharp(optimizedBuffer).metadata()

    return {
      buffer: optimizedBuffer,
      metadata: {
        width: metadata.width || 0,
        height: metadata.height || 0,
        format: metadata.format || 'unknown',
        size: metadata.size || 0,
        hasAlpha: metadata.hasAlpha || false,
      },
      originalSize,
      optimizedSize: optimizedBuffer.length,
      compressionRatio: originalSize > 0 ? optimizedBuffer.length / originalSize : 1,
    }
  }

  /**
   * 生成响应式图片集
   */
  async generateResponsiveSizes(
    input: Buffer,
    sizes: number[] = [320, 640, 1024, 1920],
  ): Promise<Map<number, Buffer>> {
    const results = new Map<number, Buffer>()

    for (const size of sizes) {
      const resized = await sharp(input)
        .resize(size, undefined, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .toBuffer()

      results.set(size, resized)
    }

    return results
  }

  /**
   * 转换为 WebP 格式
   */
  async toWebP(input: Buffer, quality = 80): Promise<Buffer> {
    return sharp(input)
      .webp({ quality })
      .toBuffer()
  }

  /**
   * 生成缩略图
   */
  async generateThumbnail(
    input: Buffer,
    width = 200,
    height = 200,
  ): Promise<Buffer> {
    return sharp(input)
      .resize(width, height, { fit: 'cover' })
      .toBuffer()
  }

  /**
   * 提取图片元数据
   */
  async getMetadata(input: Buffer | string): Promise<ImageMetadata> {
    const metadata = await sharp(input).metadata()

    return {
      width: metadata.width || 0,
      height: metadata.height || 0,
      format: metadata.format || 'unknown',
      size: metadata.size || 0,
      hasAlpha: metadata.hasAlpha || false,
    }
  }
}

// 导出单例
export const imageOptimizer = new ImageOptimizer()
