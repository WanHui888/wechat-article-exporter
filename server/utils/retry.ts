/**
 * 重试机制工具
 *
 * 功能：
 * 1. 可配置的重试策略（线性、指数、固定延迟）
 * 2. 最大重试次数限制
 * 3. 重试延迟计算
 * 4. 错误分类（可重试 vs 不可重试）
 * 5. 重试历史跟踪
 */

/**
 * 重试策略类型
 */
export type RetryStrategy = 'linear' | 'exponential' | 'fixed'

/**
 * 重试配置
 */
export interface RetryConfig {
  /** 最大重试次数 */
  maxAttempts?: number
  /** 初始延迟（毫秒） */
  initialDelay?: number
  /** 最大延迟（毫秒） */
  maxDelay?: number
  /** 重试策略 */
  strategy?: RetryStrategy
  /** 指数退避的倍数（仅用于 exponential 策略） */
  backoffMultiplier?: number
  /** 是否添加随机抖动 */
  jitter?: boolean
  /** 判断错误是否可重试的函数 */
  shouldRetry?: (error: any) => boolean
}

/**
 * 重试结果
 */
export interface RetryResult<T> {
  /** 是否成功 */
  success: boolean
  /** 返回值（成功时） */
  value?: T
  /** 错误（失败时） */
  error?: any
  /** 实际尝试次数 */
  attempts: number
  /** 总耗时（毫秒） */
  totalTime: number
}

/**
 * 重试信息
 */
export interface RetryInfo {
  /** 当前尝试次数 */
  currentAttempt: number
  /** 最大尝试次数 */
  maxAttempts: number
  /** 下次重试延迟（毫秒） */
  nextDelay: number
  /** 上次错误 */
  lastError?: any
  /** 是否还可以重试 */
  canRetry: boolean
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: Required<Omit<RetryConfig, 'shouldRetry'>> & { shouldRetry?: (error: any) => boolean } = {
  maxAttempts: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 60000, // 60 seconds
  strategy: 'exponential',
  backoffMultiplier: 2,
  jitter: true,
  shouldRetry: (error: any) => {
    // Default: retry most errors except known non-retryable ones
    if (!error) return false

    // Don't retry on client errors (4xx except 429)
    const status = error.status || error.statusCode || 0
    if (status >= 400 && status < 500 && status !== 429) {
      return false
    }

    // Don't retry on validation/authentication errors
    const message = (error.message || '').toLowerCase()
    if (message.includes('invalid') ||
        message.includes('unauthorized') ||
        message.includes('forbidden') ||
        message.includes('not found') ||
        message.includes('bad request')) {
      return false
    }

    // Retry everything else
    return true
  },
}

/**
 * 计算重试延迟
 *
 * @param attempt - 当前尝试次数（从 0 开始）
 * @param config - 重试配置
 * @returns 延迟时间（毫秒）
 */
export function calculateDelay(attempt: number, config: Required<RetryConfig>): number {
  let delay: number

  switch (config.strategy) {
    case 'fixed':
      delay = config.initialDelay
      break

    case 'linear':
      delay = config.initialDelay * (attempt + 1)
      break

    case 'exponential':
      delay = config.initialDelay * (config.backoffMultiplier ** attempt)
      break

    default:
      delay = config.initialDelay
  }

  // Apply max delay cap
  delay = Math.min(delay, config.maxDelay)

  // Add jitter if enabled (±25% random variation)
  if (config.jitter) {
    const jitterRange = delay * 0.25
    const jitterAmount = Math.random() * jitterRange * 2 - jitterRange
    delay = Math.max(0, delay + jitterAmount)
  }

  return Math.floor(delay)
}

/**
 * 等待指定时间
 *
 * @param ms - 等待时间（毫秒）
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 执行带重试的操作
 *
 * @param fn - 要执行的异步函数
 * @param config - 重试配置
 * @returns 重试结果
 */
export async function retry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = {}
): Promise<RetryResult<T>> {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config } as Required<RetryConfig>

  const startTime = Date.now()
  let lastError: any
  let attemptsMade = 0

  for (let attempt = 0; attempt < mergedConfig.maxAttempts; attempt++) {
    attemptsMade = attempt + 1

    try {
      const value = await fn()

      return {
        success: true,
        value,
        attempts: attemptsMade,
        totalTime: Date.now() - startTime,
      }
    }
    catch (error) {
      lastError = error

      // Check if we should retry this error
      const shouldRetry = mergedConfig.shouldRetry?.(error) ?? true

      // Check if we have more attempts left
      const hasMoreAttempts = attempt < mergedConfig.maxAttempts - 1

      if (!shouldRetry || !hasMoreAttempts) {
        // Don't retry, return failure
        break
      }

      // Calculate delay and wait before retrying
      const delay = calculateDelay(attempt, mergedConfig)
      await wait(delay)
    }
  }

  // All attempts failed
  return {
    success: false,
    error: lastError,
    attempts: attemptsMade,
    totalTime: Date.now() - startTime,
  }
}

/**
 * 创建重试信息对象
 *
 * @param currentAttempt - 当前尝试次数
 * @param config - 重试配置
 * @param lastError - 上次错误
 * @returns 重试信息
 */
export function createRetryInfo(
  currentAttempt: number,
  config: RetryConfig = {},
  lastError?: any
): RetryInfo {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config } as Required<RetryConfig>

  // If there's an error, check if it's retryable
  // If there's no error yet (first attempt), assume we can retry
  const shouldRetryError = lastError
    ? (mergedConfig.shouldRetry?.(lastError) ?? true)
    : true

  const canRetry = currentAttempt < mergedConfig.maxAttempts - 1 && shouldRetryError

  const nextDelay = canRetry
    ? calculateDelay(currentAttempt, mergedConfig)
    : 0

  return {
    currentAttempt,
    maxAttempts: mergedConfig.maxAttempts,
    nextDelay,
    lastError,
    canRetry,
  }
}

/**
 * 重试装饰器（用于类方法）
 *
 * @param config - 重试配置
 */
export function Retry(config: RetryConfig = {}) {
  return function (
    _target: any,
    _propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args: any[]) {
      const result = await retry(
        () => originalMethod.apply(this, args),
        config
      )

      if (!result.success) {
        throw result.error
      }

      return result.value
    }

    return descriptor
  }
}

/**
 * 预定义的重试策略
 */
export const RetryPresets = {
  /** 快速重试：3次，固定1秒延迟 */
  quick: {
    maxAttempts: 3,
    initialDelay: 1000,
    strategy: 'fixed' as RetryStrategy,
    jitter: false,
  },

  /** 标准重试：5次，指数退避 */
  standard: {
    maxAttempts: 5,
    initialDelay: 1000,
    maxDelay: 30000,
    strategy: 'exponential' as RetryStrategy,
    backoffMultiplier: 2,
    jitter: true,
  },

  /** 激进重试：10次，短延迟 */
  aggressive: {
    maxAttempts: 10,
    initialDelay: 500,
    maxDelay: 10000,
    strategy: 'exponential' as RetryStrategy,
    backoffMultiplier: 1.5,
    jitter: true,
  },

  /** 保守重试：3次，长延迟 */
  conservative: {
    maxAttempts: 3,
    initialDelay: 5000,
    maxDelay: 60000,
    strategy: 'exponential' as RetryStrategy,
    backoffMultiplier: 3,
    jitter: true,
  },

  /** 网络重试：专门用于网络请求 */
  network: {
    maxAttempts: 5,
    initialDelay: 2000,
    maxDelay: 30000,
    strategy: 'exponential' as RetryStrategy,
    backoffMultiplier: 2,
    jitter: true,
    shouldRetry: (error: any) => {
      // Retry on network errors and 5xx status codes
      const networkErrors = ['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNRESET']
      const status = error.status || error.statusCode || 0
      return networkErrors.includes(error.code) || (status >= 500 && status < 600)
    },
  },

  /** 数据库重试：专门用于数据库操作 */
  database: {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    strategy: 'exponential' as RetryStrategy,
    backoffMultiplier: 2,
    jitter: true,
    shouldRetry: (error: any) => {
      // Retry on connection and deadlock errors
      const message = (error.message || '').toLowerCase()
      return message.includes('deadlock') ||
             message.includes('connection') ||
             (message.includes('lock') && message.includes('timeout'))
    },
  },
}
