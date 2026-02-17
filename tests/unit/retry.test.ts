import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  retry,
  calculateDelay,
  wait,
  createRetryInfo,
  RetryPresets,
  type RetryConfig,
  type RetryStrategy,
} from '~/server/utils/retry'

/**
 * Retry Utility 单元测试
 *
 * 测试覆盖：
 * 1. calculateDelay - 延迟计算（固定、线性、指数）
 * 2. retry - 重试执行
 * 3. createRetryInfo - 重试信息创建
 * 4. RetryPresets - 预定义策略
 * 5. Error Classification - 错误分类
 * 6. Jitter - 随机抖动
 */

// ==================== calculateDelay() 测试 ====================

describe('calculateDelay', () => {
  describe('Fixed strategy', () => {
    it('should return same delay for all attempts', () => {
      const config: Required<RetryConfig> = {
        maxAttempts: 5,
        initialDelay: 1000,
        maxDelay: 60000,
        strategy: 'fixed',
        backoffMultiplier: 2,
        jitter: false,
      }

      expect(calculateDelay(0, config)).toBe(1000)
      expect(calculateDelay(1, config)).toBe(1000)
      expect(calculateDelay(2, config)).toBe(1000)
      expect(calculateDelay(5, config)).toBe(1000)
    })
  })

  describe('Linear strategy', () => {
    it('should increase delay linearly', () => {
      const config: Required<RetryConfig> = {
        maxAttempts: 5,
        initialDelay: 1000,
        maxDelay: 60000,
        strategy: 'linear',
        backoffMultiplier: 2,
        jitter: false,
      }

      expect(calculateDelay(0, config)).toBe(1000) // 1000 * 1
      expect(calculateDelay(1, config)).toBe(2000) // 1000 * 2
      expect(calculateDelay(2, config)).toBe(3000) // 1000 * 3
      expect(calculateDelay(3, config)).toBe(4000) // 1000 * 4
    })

    it('should respect max delay', () => {
      const config: Required<RetryConfig> = {
        maxAttempts: 10,
        initialDelay: 1000,
        maxDelay: 5000,
        strategy: 'linear',
        backoffMultiplier: 2,
        jitter: false,
      }

      expect(calculateDelay(0, config)).toBe(1000)
      expect(calculateDelay(4, config)).toBe(5000)
      expect(calculateDelay(10, config)).toBe(5000)
    })
  })

  describe('Exponential strategy', () => {
    it('should increase delay exponentially', () => {
      const config: Required<RetryConfig> = {
        maxAttempts: 5,
        initialDelay: 1000,
        maxDelay: 60000,
        strategy: 'exponential',
        backoffMultiplier: 2,
        jitter: false,
      }

      expect(calculateDelay(0, config)).toBe(1000)  // 1000 * 2^0
      expect(calculateDelay(1, config)).toBe(2000)  // 1000 * 2^1
      expect(calculateDelay(2, config)).toBe(4000)  // 1000 * 2^2
      expect(calculateDelay(3, config)).toBe(8000)  // 1000 * 2^3
      expect(calculateDelay(4, config)).toBe(16000) // 1000 * 2^4
    })

    it('should support custom backoff multiplier', () => {
      const config: Required<RetryConfig> = {
        maxAttempts: 5,
        initialDelay: 1000,
        maxDelay: 60000,
        strategy: 'exponential',
        backoffMultiplier: 3,
        jitter: false,
      }

      expect(calculateDelay(0, config)).toBe(1000)  // 1000 * 3^0
      expect(calculateDelay(1, config)).toBe(3000)  // 1000 * 3^1
      expect(calculateDelay(2, config)).toBe(9000)  // 1000 * 3^2
      expect(calculateDelay(3, config)).toBe(27000) // 1000 * 3^3
    })

    it('should cap at max delay', () => {
      const config: Required<RetryConfig> = {
        maxAttempts: 10,
        initialDelay: 1000,
        maxDelay: 10000,
        strategy: 'exponential',
        backoffMultiplier: 2,
        jitter: false,
      }

      expect(calculateDelay(0, config)).toBe(1000)
      expect(calculateDelay(3, config)).toBe(8000)
      expect(calculateDelay(4, config)).toBe(10000)
      expect(calculateDelay(10, config)).toBe(10000)
    })
  })

  describe('Jitter', () => {
    it('should add random variation when jitter enabled', () => {
      const config: Required<RetryConfig> = {
        maxAttempts: 5,
        initialDelay: 1000,
        maxDelay: 60000,
        strategy: 'fixed',
        backoffMultiplier: 2,
        jitter: true,
      }

      const delays = Array.from({ length: 10 }, () => calculateDelay(0, config))

      // All delays should be different due to jitter
      const uniqueDelays = new Set(delays)
      expect(uniqueDelays.size).toBeGreaterThan(1)

      // All delays should be within ±25% of 1000ms (750-1250)
      delays.forEach((delay) => {
        expect(delay).toBeGreaterThanOrEqual(750)
        expect(delay).toBeLessThanOrEqual(1250)
      })
    })

    it('should not add jitter when disabled', () => {
      const config: Required<RetryConfig> = {
        maxAttempts: 5,
        initialDelay: 1000,
        maxDelay: 60000,
        strategy: 'fixed',
        backoffMultiplier: 2,
        jitter: false,
      }

      const delays = Array.from({ length: 10 }, () => calculateDelay(0, config))

      // All delays should be exactly 1000ms
      delays.forEach((delay) => {
        expect(delay).toBe(1000)
      })
    })
  })
})

// ==================== wait() 测试 ====================

describe('wait', () => {
  it('should wait for specified time', async () => {
    const start = Date.now()
    await wait(100)
    const elapsed = Date.now() - start

    expect(elapsed).toBeGreaterThanOrEqual(95)
    expect(elapsed).toBeLessThan(150)
  })

  it('should resolve promise', async () => {
    await expect(wait(10)).resolves.toBeUndefined()
  })
})

// ==================== retry() 测试 ====================

describe('retry', () => {
  describe('Successful execution', () => {
    it('should return success on first attempt', async () => {
      const fn = vi.fn().mockResolvedValue('success')

      const result = await retry(fn, { maxAttempts: 3 })

      expect(result.success).toBe(true)
      expect(result.value).toBe('success')
      expect(result.attempts).toBe(1)
      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('should return success after retries', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockRejectedValueOnce(new Error('fail 2'))
        .mockResolvedValue('success')

      const result = await retry(fn, {
        maxAttempts: 5,
        initialDelay: 10,
        strategy: 'fixed',
        jitter: false,
      })

      expect(result.success).toBe(true)
      expect(result.value).toBe('success')
      expect(result.attempts).toBe(3)
      expect(fn).toHaveBeenCalledTimes(3)
    })

    it('should track total time', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue('success')

      const result = await retry(fn, {
        maxAttempts: 3,
        initialDelay: 50,
        strategy: 'fixed',
        jitter: false,
      })

      expect(result.success).toBe(true)
      expect(result.totalTime).toBeGreaterThanOrEqual(50)
    })
  })

  describe('Failed execution', () => {
    it('should return failure when all attempts exhausted', async () => {
      const error = new Error('persistent failure')
      const fn = vi.fn().mockRejectedValue(error)

      const result = await retry(fn, {
        maxAttempts: 3,
        initialDelay: 10,
        strategy: 'fixed',
        jitter: false,
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe(error)
      expect(result.attempts).toBe(3)
      expect(fn).toHaveBeenCalledTimes(3)
    })

    it('should not retry non-retryable errors', async () => {
      const error = new Error('non-retryable')
      const fn = vi.fn().mockRejectedValue(error)

      const result = await retry(fn, {
        maxAttempts: 5,
        initialDelay: 10,
        shouldRetry: () => false,
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe(error)
      expect(result.attempts).toBe(1)
      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('should use custom shouldRetry function', async () => {
      const retryableError = new Error('ECONNREFUSED')
      const nonRetryableError = new Error('INVALID_INPUT')

      const fn1 = vi.fn().mockRejectedValue(retryableError)
      const fn2 = vi.fn().mockRejectedValue(nonRetryableError)

      const shouldRetry = (error: any) => error.message === 'ECONNREFUSED'

      const result1 = await retry(fn1, {
        maxAttempts: 3,
        initialDelay: 10,
        shouldRetry,
        strategy: 'fixed',
        jitter: false,
      })

      const result2 = await retry(fn2, {
        maxAttempts: 3,
        initialDelay: 10,
        shouldRetry,
      })

      expect(fn1).toHaveBeenCalledTimes(3)
      expect(fn2).toHaveBeenCalledTimes(1)
      expect(result1.attempts).toBe(3)
      expect(result2.attempts).toBe(1)
    })
  })

  describe('Default shouldRetry behavior', () => {
    it('should retry network errors', async () => {
      const errors = [
        { code: 'ECONNREFUSED' },
        { code: 'ETIMEDOUT' },
        { code: 'ENOTFOUND' },
        { code: 'ECONNRESET' },
      ]

      for (const error of errors) {
        const fn = vi.fn().mockRejectedValue(error)
        const result = await retry(fn, {
          maxAttempts: 3,
          initialDelay: 10,
          strategy: 'fixed',
          jitter: false,
        })

        expect(fn).toHaveBeenCalledTimes(3)
        expect(result.attempts).toBe(3)
        vi.clearAllMocks()
      }
    })

    it('should retry on 429, 503, 504 status codes', async () => {
      const statusCodes = [429, 503, 504]

      for (const status of statusCodes) {
        const fn = vi.fn().mockRejectedValue({ status })
        const result = await retry(fn, {
          maxAttempts: 3,
          initialDelay: 10,
          strategy: 'fixed',
          jitter: false,
        })

        expect(fn).toHaveBeenCalledTimes(3)
        expect(result.attempts).toBe(3)
        vi.clearAllMocks()
      }
    })

    it('should retry on timeout message', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('Request timeout'))
      const result = await retry(fn, {
        maxAttempts: 3,
        initialDelay: 10,
        strategy: 'fixed',
        jitter: false,
      })

      expect(fn).toHaveBeenCalledTimes(3)
      expect(result.attempts).toBe(3)
    })

    it('should not retry on 4xx errors (except 429)', async () => {
      const statusCodes = [400, 401, 403, 404]

      for (const status of statusCodes) {
        const fn = vi.fn().mockRejectedValue({ status })
        const result = await retry(fn, {
          maxAttempts: 3,
          initialDelay: 10,
        })

        expect(fn).toHaveBeenCalledTimes(1)
        expect(result.attempts).toBe(1)
        vi.clearAllMocks()
      }
    })
  })

  describe('Delay strategies', () => {
    it('should use fixed delay', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockRejectedValueOnce(new Error('fail 2'))
        .mockResolvedValue('success')

      const start = Date.now()
      await retry(fn, {
        maxAttempts: 5,
        initialDelay: 50,
        strategy: 'fixed',
        jitter: false,
      })
      const elapsed = Date.now() - start

      // Should wait 50ms twice (between 3 attempts)
      expect(elapsed).toBeGreaterThanOrEqual(95)
      expect(elapsed).toBeLessThan(150)
    })

    it('should use exponential backoff', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockRejectedValueOnce(new Error('fail 2'))
        .mockResolvedValue('success')

      const start = Date.now()
      await retry(fn, {
        maxAttempts: 5,
        initialDelay: 50,
        strategy: 'exponential',
        backoffMultiplier: 2,
        jitter: false,
      })
      const elapsed = Date.now() - start

      // Should wait 50ms + 100ms = 150ms
      expect(elapsed).toBeGreaterThanOrEqual(145)
      expect(elapsed).toBeLessThan(200)
    })
  })

  describe('Edge cases', () => {
    it('should handle maxAttempts = 1', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('fail'))

      const result = await retry(fn, {
        maxAttempts: 1,
        initialDelay: 10,
      })

      expect(result.success).toBe(false)
      expect(result.attempts).toBe(1)
      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('should handle zero delay', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue('success')

      const result = await retry(fn, {
        maxAttempts: 3,
        initialDelay: 0,
        strategy: 'fixed',
        jitter: false,
      })

      expect(result.success).toBe(true)
      expect(result.attempts).toBe(2)
    })

    it('should handle function returning undefined', async () => {
      const fn = vi.fn().mockResolvedValue(undefined)

      const result = await retry(fn)

      expect(result.success).toBe(true)
      expect(result.value).toBeUndefined()
    })

    it('should handle function returning null', async () => {
      const fn = vi.fn().mockResolvedValue(null)

      const result = await retry(fn)

      expect(result.success).toBe(true)
      expect(result.value).toBeNull()
    })
  })
})

// ==================== createRetryInfo() 测试 ====================

describe('createRetryInfo', () => {
  it('should create retry info for first attempt', () => {
    const info = createRetryInfo(0, { maxAttempts: 3, initialDelay: 1000 })

    expect(info.currentAttempt).toBe(0)
    expect(info.maxAttempts).toBe(3)
    expect(info.canRetry).toBe(true)
    expect(info.nextDelay).toBeGreaterThan(0)
  })

  it('should create retry info for last attempt', () => {
    const info = createRetryInfo(2, { maxAttempts: 3, initialDelay: 1000 })

    expect(info.currentAttempt).toBe(2)
    expect(info.maxAttempts).toBe(3)
    expect(info.canRetry).toBe(false)
    expect(info.nextDelay).toBe(0)
  })

  it('should include last error', () => {
    const error = new Error('test error')
    const info = createRetryInfo(1, { maxAttempts: 3 }, error)

    expect(info.lastError).toBe(error)
  })

  it('should indicate cannot retry for non-retryable errors', () => {
    const error = new Error('non-retryable')
    const info = createRetryInfo(0, {
      maxAttempts: 3,
      shouldRetry: () => false,
    }, error)

    expect(info.canRetry).toBe(false)
    expect(info.nextDelay).toBe(0)
  })

  it('should calculate next delay based on strategy', () => {
    const info1 = createRetryInfo(1, {
      maxAttempts: 5,
      initialDelay: 1000,
      strategy: 'fixed',
      jitter: false,
    })

    const info2 = createRetryInfo(1, {
      maxAttempts: 5,
      initialDelay: 1000,
      strategy: 'exponential',
      backoffMultiplier: 2,
      jitter: false,
    })

    expect(info1.nextDelay).toBe(1000)
    expect(info2.nextDelay).toBe(2000)
  })
})

// ==================== RetryPresets 测试 ====================

describe('RetryPresets', () => {
  it('should have quick preset', () => {
    expect(RetryPresets.quick).toEqual({
      maxAttempts: 3,
      initialDelay: 1000,
      strategy: 'fixed',
      jitter: false,
    })
  })

  it('should have standard preset', () => {
    expect(RetryPresets.standard).toEqual({
      maxAttempts: 5,
      initialDelay: 1000,
      maxDelay: 30000,
      strategy: 'exponential',
      backoffMultiplier: 2,
      jitter: true,
    })
  })

  it('should have aggressive preset', () => {
    expect(RetryPresets.aggressive).toEqual({
      maxAttempts: 10,
      initialDelay: 500,
      maxDelay: 10000,
      strategy: 'exponential',
      backoffMultiplier: 1.5,
      jitter: true,
    })
  })

  it('should have conservative preset', () => {
    expect(RetryPresets.conservative).toEqual({
      maxAttempts: 3,
      initialDelay: 5000,
      maxDelay: 60000,
      strategy: 'exponential',
      backoffMultiplier: 3,
      jitter: true,
    })
  })

  it('should have network preset with custom shouldRetry', () => {
    expect(RetryPresets.network).toMatchObject({
      maxAttempts: 5,
      initialDelay: 2000,
      maxDelay: 30000,
      strategy: 'exponential',
      backoffMultiplier: 2,
      jitter: true,
    })

    expect(RetryPresets.network.shouldRetry).toBeDefined()
  })

  it('should have database preset with custom shouldRetry', () => {
    expect(RetryPresets.database).toMatchObject({
      maxAttempts: 3,
      initialDelay: 1000,
      maxDelay: 10000,
      strategy: 'exponential',
      backoffMultiplier: 2,
      jitter: true,
    })

    expect(RetryPresets.database.shouldRetry).toBeDefined()
  })

  describe('Network preset shouldRetry', () => {
    it('should retry network errors', () => {
      const errors = [
        { code: 'ECONNREFUSED' },
        { code: 'ETIMEDOUT' },
        { code: 'ENOTFOUND' },
        { code: 'ECONNRESET' },
      ]

      errors.forEach((error) => {
        expect(RetryPresets.network.shouldRetry!(error)).toBe(true)
      })
    })

    it('should retry 5xx status codes', () => {
      const statusCodes = [500, 502, 503, 504]

      statusCodes.forEach((status) => {
        expect(RetryPresets.network.shouldRetry!({ status })).toBe(true)
      })
    })

    it('should not retry 4xx status codes', () => {
      const statusCodes = [400, 401, 403, 404]

      statusCodes.forEach((status) => {
        expect(RetryPresets.network.shouldRetry!({ status })).toBe(false)
      })
    })
  })

  describe('Database preset shouldRetry', () => {
    it('should retry deadlock errors', () => {
      const error = { message: 'Deadlock found when trying to get lock' }
      expect(RetryPresets.database.shouldRetry!(error)).toBe(true)
    })

    it('should retry connection errors', () => {
      const error = { message: 'Lost connection to MySQL server' }
      expect(RetryPresets.database.shouldRetry!(error)).toBe(true)
    })

    it('should retry lock timeout errors', () => {
      const error = { message: 'Lock wait timeout exceeded' }
      expect(RetryPresets.database.shouldRetry!(error)).toBe(true)
    })

    it('should not retry syntax errors', () => {
      const error = { message: 'You have an error in your SQL syntax' }
      expect(RetryPresets.database.shouldRetry!(error)).toBe(false)
    })
  })
})

// ==================== Integration Scenarios 测试 ====================

describe('Integration Scenarios', () => {
  it('should handle flaky network requests', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce({ code: 'ETIMEDOUT' })
      .mockRejectedValueOnce({ status: 503 })
      .mockResolvedValue({ data: 'success' })

    const result = await retry(fn, RetryPresets.network)

    expect(result.success).toBe(true)
    expect(result.value).toEqual({ data: 'success' })
    expect(result.attempts).toBe(3)
  })

  it('should handle database deadlocks', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('Deadlock found'))
      .mockResolvedValue({ rows: [] })

    const result = await retry(fn, RetryPresets.database)

    expect(result.success).toBe(true)
    expect(result.attempts).toBe(2)
  })

  it('should fail fast on validation errors', async () => {
    const fn = vi.fn().mockRejectedValue({ status: 400, message: 'Bad Request' })

    const result = await retry(fn, RetryPresets.network)

    expect(result.success).toBe(false)
    expect(result.attempts).toBe(1)
  })

  it('should respect rate limiting with exponential backoff', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce({ status: 429 })
      .mockRejectedValueOnce({ status: 429 })
      .mockResolvedValue('success')

    const start = Date.now()
    const result = await retry(fn, {
      ...RetryPresets.standard,
      jitter: false,
    })
    const elapsed = Date.now() - start

    expect(result.success).toBe(true)
    // Should wait 1000ms + 2000ms = 3000ms
    expect(elapsed).toBeGreaterThanOrEqual(2900)
  })

  it('should track retry attempts for monitoring', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockRejectedValueOnce(new Error('fail 3'))
      .mockResolvedValue('success')

    const result = await retry(fn, RetryPresets.standard)

    expect(result.success).toBe(true)
    expect(result.attempts).toBe(4)
    expect(result.totalTime).toBeGreaterThan(0)
  })
})
