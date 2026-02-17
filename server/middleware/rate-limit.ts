/**
 * API 速率限制中间件
 *
 * 功能：
 * 1. 基于 IP 地址的速率限制
 * 2. 基于用户 ID 的速率限制
 * 3. 可配置的时间窗口和请求限制
 * 4. 支持不同路由的不同限制策略
 * 5. 标准的速率限制响应头
 */

import type { H3Event, EventHandlerRequest } from 'h3'
import { setHeader, getHeader, createError } from 'h3'

/**
 * 速率限制配置
 */
export interface RateLimitConfig {
  /** 时间窗口（毫秒） */
  windowMs: number
  /** 最大请求数 */
  max: number
  /** 限制键生成器（默认使用 IP 地址） */
  keyGenerator?: (event: H3Event<EventHandlerRequest>) => string | Promise<string>
  /** 是否跳过成功的请求（仅计算失败的请求） */
  skipSuccessfulRequests?: boolean
  /** 是否跳过失败的请求（仅计算成功的请求） */
  skipFailedRequests?: boolean
  /** 自定义错误消息 */
  message?: string
  /** 自定义响应状态码（默认 429） */
  statusCode?: number
  /** 存储后端 */
  store?: RateLimitStore
}

/**
 * 速率限制存储接口
 */
export interface RateLimitStore {
  /** 增加计数并返回当前值 */
  increment(key: string): Promise<RateLimitInfo>
  /** 重置指定键的计数 */
  reset(key: string): Promise<void>
  /** 清除所有计数 */
  resetAll(): Promise<void>
}

/**
 * 速率限制信息
 */
export interface RateLimitInfo {
  /** 当前请求数 */
  current: number
  /** 剩余请求数 */
  remaining: number
  /** 重置时间（Unix 时间戳，秒） */
  resetTime: number
  /** 是否超过限制 */
  isLimited: boolean
}

/**
 * 内存存储（默认实现）
 */
export class MemoryStore implements RateLimitStore {
  private store = new Map<string, { count: number, resetTime: number }>()
  private windowMs: number

  constructor(windowMs: number) {
    this.windowMs = windowMs
  }

  async increment(key: string): Promise<RateLimitInfo> {
    const now = Date.now()
    const record = this.store.get(key)

    // 如果记录不存在或已过期，创建新记录
    if (!record || now >= record.resetTime) {
      const resetTime = now + this.windowMs
      this.store.set(key, { count: 1, resetTime })
      return {
        current: 1,
        remaining: 0, // Will be calculated by middleware
        resetTime: Math.floor(resetTime / 1000),
        isLimited: false,
      }
    }

    // 增加计数
    record.count++
    this.store.set(key, record)

    return {
      current: record.count,
      remaining: 0, // Will be calculated by middleware
      resetTime: Math.floor(record.resetTime / 1000),
      isLimited: false, // Will be determined by middleware
    }
  }

  async reset(key: string): Promise<void> {
    this.store.delete(key)
  }

  async resetAll(): Promise<void> {
    this.store.clear()
  }

  /**
   * 清理过期记录（可选的维护方法）
   */
  cleanup(): void {
    const now = Date.now()
    for (const [key, record] of this.store.entries()) {
      if (now >= record.resetTime) {
        this.store.delete(key)
      }
    }
  }
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: Required<Omit<RateLimitConfig, 'store'>> & { store?: RateLimitStore } = {
  windowMs: 60 * 1000, // 1 分钟
  max: 100, // 100 请求
  keyGenerator: (event) => getClientIP(event) || 'unknown',
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
  message: 'Too many requests, please try again later.',
  statusCode: 429,
}

/**
 * 获取客户端 IP 地址
 */
function getClientIP(event: H3Event<EventHandlerRequest>): string | null {
  // 检查常见的代理头
  const headers = [
    'x-forwarded-for',
    'x-real-ip',
    'cf-connecting-ip', // Cloudflare
    'fastly-client-ip', // Fastly
    'x-client-ip',
    'x-cluster-client-ip',
  ]

  for (const header of headers) {
    const value = getHeader(event, header)
    if (value) {
      // x-forwarded-for 可能包含多个 IP，取第一个
      const ip = value.split(',')[0].trim()
      if (ip) return ip
    }
  }

  // 如果没有代理头，使用直接连接的 IP
  return event.node.req.socket.remoteAddress || null
}

/**
 * 创建速率限制中间件
 */
export function createRateLimiter(config: RateLimitConfig = {}) {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config }

  // 如果没有提供存储，使用默认的内存存储
  const store = mergedConfig.store || new MemoryStore(mergedConfig.windowMs)

  return async (event: H3Event<EventHandlerRequest>) => {
    try {
      // 生成限制键
      const key = await mergedConfig.keyGenerator!(event)

      // 获取当前计数
      const info = await store.increment(key)

      // 计算剩余请求数和是否限制
      const remaining = Math.max(0, mergedConfig.max - info.current)
      const isLimited = info.current > mergedConfig.max

      // 设置响应头
      setHeader(event, 'X-RateLimit-Limit', String(mergedConfig.max))
      setHeader(event, 'X-RateLimit-Remaining', String(remaining))
      setHeader(event, 'X-RateLimit-Reset', String(info.resetTime))

      // 如果超过限制，返回 429 错误
      if (isLimited) {
        setHeader(event, 'Retry-After', String(Math.ceil((info.resetTime * 1000 - Date.now()) / 1000)))
        throw createError({
          statusCode: mergedConfig.statusCode,
          statusMessage: mergedConfig.message,
        })
      }
    }
    catch (error) {
      // 如果是我们抛出的速率限制错误，继续传播
      if (error && typeof error === 'object' && 'statusCode' in error) {
        throw error
      }
      // 其他错误（如键生成器错误），记录但不阻止请求
      console.error('Rate limiter error:', error)
    }
  }
}

/**
 * 基于用户 ID 的速率限制键生成器
 */
export function userIdKeyGenerator(event: H3Event<EventHandlerRequest>): string {
  const user = event.context.user
  if (user && user.id) {
    return `user:${user.id}`
  }
  // 如果没有用户信息，回退到 IP 地址
  return `ip:${getClientIP(event) || 'unknown'}`
}

/**
 * 组合键生成器（用户 ID + IP）
 */
export function combinedKeyGenerator(event: H3Event<EventHandlerRequest>): string {
  const user = event.context.user
  const ip = getClientIP(event) || 'unknown'

  if (user && user.id) {
    return `user:${user.id}:ip:${ip}`
  }

  return `ip:${ip}`
}

/**
 * 预定义的速率限制配置
 */
export const RateLimitPresets = {
  /** 严格限制：10 请求/分钟 */
  strict: {
    windowMs: 60 * 1000,
    max: 10,
  },
  /** 标准限制：100 请求/分钟 */
  standard: {
    windowMs: 60 * 1000,
    max: 100,
  },
  /** 宽松限制：1000 请求/分钟 */
  lenient: {
    windowMs: 60 * 1000,
    max: 1000,
  },
  /** API 限制：60 请求/分钟 */
  api: {
    windowMs: 60 * 1000,
    max: 60,
  },
  /** 登录限制：5 请求/15分钟 */
  login: {
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: 'Too many login attempts, please try again later.',
  },
  /** 下载限制：10 请求/小时 */
  download: {
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: 'Download limit exceeded, please try again later.',
  },
}
