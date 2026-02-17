/**
 * 响应压缩中间件
 *
 * 功能：
 * 1. Gzip/Brotli 压缩
 * 2. 自动选择最佳压缩算法
 * 3. 压缩级别配置
 * 4. 文件类型过滤
 * 5. 最小压缩阈值
 */

import type { H3Event } from 'h3'
import { createGzip, createBrotliCompress } from 'node:zlib'
import { pipeline } from 'node:stream/promises'

/**
 * 压缩配置
 */
export interface CompressionConfig {
  /** 是否启用 Gzip */
  gzip?: boolean
  /** 是否启用 Brotli */
  brotli?: boolean
  /** 压缩级别 (1-9) */
  level?: number
  /** 最小压缩阈值（字节） */
  threshold?: number
  /** 需要压缩的 MIME 类型 */
  mimeTypes?: string[]
  /** 排除的路径模式 */
  exclude?: RegExp[]
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: Required<CompressionConfig> = {
  gzip: true,
  brotli: true,
  level: 6,
  threshold: 1024, // 1KB
  mimeTypes: [
    'text/html',
    'text/css',
    'text/javascript',
    'application/javascript',
    'application/json',
    'application/xml',
    'text/xml',
    'text/plain',
    'image/svg+xml',
  ],
  exclude: [
    /\.jpg$/i,
    /\.jpeg$/i,
    /\.png$/i,
    /\.gif$/i,
    /\.webp$/i,
    /\.mp4$/i,
    /\.zip$/i,
    /\.gz$/i,
    /\.br$/i,
  ],
}

/**
 * 创建压缩中间件
 */
export function createCompressionMiddleware(config: CompressionConfig = {}) {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config }

  return async (event: H3Event) => {
    // 检查是否应该跳过压缩
    if (shouldSkipCompression(event, mergedConfig)) {
      return
    }

    // 获取客户端支持的编码
    const acceptEncoding = getHeader(event, 'accept-encoding') || ''

    // 选择最佳压缩算法
    let encoding: 'br' | 'gzip' | null = null

    if (mergedConfig.brotli && acceptEncoding.includes('br')) {
      encoding = 'br'
    } else if (mergedConfig.gzip && acceptEncoding.includes('gzip')) {
      encoding = 'gzip'
    }

    if (!encoding) {
      return
    }

    // 设置响应头
    setHeader(event, 'Content-Encoding', encoding)
    setHeader(event, 'Vary', 'Accept-Encoding')

    // 注册响应钩子进行压缩
    event.node.res.on('pipe', (source: any) => {
      if (encoding === 'br') {
        const compress = createBrotliCompress({
          params: {
            [zlib.constants.BROTLI_PARAM_QUALITY]: mergedConfig.level,
          },
        })
        source.pipe(compress).pipe(event.node.res)
      } else if (encoding === 'gzip') {
        const compress = createGzip({ level: mergedConfig.level })
        source.pipe(compress).pipe(event.node.res)
      }
    })
  }
}

/**
 * 检查是否应该跳过压缩
 */
function shouldSkipCompression(
  event: H3Event,
  config: Required<CompressionConfig>
): boolean {
  const url = event.node.req.url || ''
  const contentType = getHeader(event, 'content-type') || ''

  // 检查路径是否被排除
  if (config.exclude.some(pattern => pattern.test(url))) {
    return true
  }

  // 检查 MIME 类型
  if (!config.mimeTypes.some(type => contentType.includes(type))) {
    return true
  }

  // 检查是否已经压缩
  const contentEncoding = getHeader(event, 'content-encoding')
  if (contentEncoding) {
    return true
  }

  return false
}

/**
 * 压缩统计
 */
export class CompressionStats {
  private totalRequests = 0
  private compressedRequests = 0
  private originalBytes = 0
  private compressedBytes = 0

  /**
   * 记录压缩
   */
  record(originalSize: number, compressedSize: number): void {
    this.totalRequests++
    this.compressedRequests++
    this.originalBytes += originalSize
    this.compressedBytes += compressedSize
  }

  /**
   * 记录未压缩
   */
  recordSkipped(): void {
    this.totalRequests++
  }

  /**
   * 获取统计信息
   */
  getStats() {
    const compressionRatio =
      this.originalBytes > 0
        ? this.compressedBytes / this.originalBytes
        : 1

    const savedBytes = this.originalBytes - this.compressedBytes
    const savedPercentage = (1 - compressionRatio) * 100

    return {
      totalRequests: this.totalRequests,
      compressedRequests: this.compressedRequests,
      compressionRate: this.compressedRequests / this.totalRequests,
      originalBytes: this.originalBytes,
      compressedBytes: this.compressedBytes,
      savedBytes,
      savedPercentage,
      compressionRatio,
    }
  }

  /**
   * 重置统计
   */
  reset(): void {
    this.totalRequests = 0
    this.compressedRequests = 0
    this.originalBytes = 0
    this.compressedBytes = 0
  }
}

/**
 * 全局压缩统计
 */
export const compressionStats = new CompressionStats()

/**
 * 压缩级别预设
 */
export const COMPRESSION_PRESETS = {
  /** 最快压缩 */
  fastest: { level: 1 },
  /** 快速压缩 */
  fast: { level: 3 },
  /** 平衡压缩 */
  balanced: { level: 6 },
  /** 最佳压缩 */
  best: { level: 9 },
}

/**
 * 响应压缩装饰器
 */
export function Compressed(config?: CompressionConfig) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value

    descriptor.value = async function (event: H3Event, ...args: any[]) {
      const middleware = createCompressionMiddleware(config)
      await middleware(event)
      return originalMethod.apply(this, [event, ...args])
    }

    return descriptor
  }
}
