import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { H3Event } from 'h3'
import {
  createRateLimiter,
  MemoryStore,
  userIdKeyGenerator,
  combinedKeyGenerator,
  RateLimitPresets,
  type RateLimitConfig,
  type RateLimitStore,
} from '~/server/middleware/rate-limit'

/**
 * Rate Limit Middleware 单元测试
 *
 * 测试覆盖：
 * 1. MemoryStore - 内存存储实现
 * 2. createRateLimiter - 速率限制中间件
 * 3. Key Generators - 键生成器（IP、用户ID、组合）
 * 4. Presets - 预定义配置
 * 5. Headers - 速率限制响应头
 * 6. Error Handling - 错误处理
 */

// ==================== Helper Functions ====================

/**
 * 创建模拟的 H3 事件
 */
function createMockEvent(options: {
  ip?: string
  userId?: number
  headers?: Record<string, string>
} = {}): H3Event {
  const event = {
    node: {
      req: {
        socket: {
          remoteAddress: options.ip || '127.0.0.1',
        },
        headers: options.headers || {},
      },
      res: {
        setHeader: vi.fn(),
      },
    },
    context: {
      user: options.userId ? { id: options.userId } : undefined,
    },
  } as any

  return event
}

/**
 * 模拟等待时间
 */
function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ==================== MemoryStore 测试 ====================

describe('MemoryStore', () => {
  let store: MemoryStore

  beforeEach(() => {
    store = new MemoryStore(1000) // 1 second window
  })

  describe('increment', () => {
    it('should initialize counter for new key', async () => {
      const info = await store.increment('test-key')

      expect(info.current).toBe(1)
      expect(info.resetTime).toBeGreaterThan(Math.floor(Date.now() / 1000))
    })

    it('should increment counter for existing key', async () => {
      await store.increment('test-key')
      const info = await store.increment('test-key')

      expect(info.current).toBe(2)
    })

    it('should maintain counter within window', async () => {
      await store.increment('test-key')
      await store.increment('test-key')
      const info = await store.increment('test-key')

      expect(info.current).toBe(3)
    })

    it('should reset counter after window expires', async () => {
      const shortStore = new MemoryStore(50) // 50ms window

      await shortStore.increment('test-key')
      expect((await shortStore.increment('test-key')).current).toBe(2)

      await wait(60) // Wait for window to expire

      const info = await shortStore.increment('test-key')
      expect(info.current).toBe(1)
    })

    it('should handle multiple keys independently', async () => {
      await store.increment('key1')
      await store.increment('key1')
      await store.increment('key2')

      const info1 = await store.increment('key1')
      const info2 = await store.increment('key2')

      expect(info1.current).toBe(3)
      expect(info2.current).toBe(2)
    })

    it('should return correct reset time', async () => {
      const beforeTime = Math.floor((Date.now() + 1000) / 1000)
      const info = await store.increment('test-key')
      const afterTime = Math.floor((Date.now() + 1000) / 1000) + 1

      expect(info.resetTime).toBeGreaterThanOrEqual(beforeTime)
      expect(info.resetTime).toBeLessThanOrEqual(afterTime)
    })
  })

  describe('reset', () => {
    it('should reset counter for specific key', async () => {
      await store.increment('test-key')
      await store.increment('test-key')

      await store.reset('test-key')

      const info = await store.increment('test-key')
      expect(info.current).toBe(1)
    })

    it('should not affect other keys', async () => {
      await store.increment('key1')
      await store.increment('key2')

      await store.reset('key1')

      const info1 = await store.increment('key1')
      const info2 = await store.increment('key2')

      expect(info1.current).toBe(1)
      expect(info2.current).toBe(2)
    })

    it('should handle resetting non-existent key', async () => {
      await expect(store.reset('non-existent')).resolves.toBeUndefined()
    })
  })

  describe('resetAll', () => {
    it('should reset all counters', async () => {
      await store.increment('key1')
      await store.increment('key2')
      await store.increment('key3')

      await store.resetAll()

      const info1 = await store.increment('key1')
      const info2 = await store.increment('key2')
      const info3 = await store.increment('key3')

      expect(info1.current).toBe(1)
      expect(info2.current).toBe(1)
      expect(info3.current).toBe(1)
    })

    it('should handle empty store', async () => {
      await expect(store.resetAll()).resolves.toBeUndefined()
    })
  })

  describe('cleanup', () => {
    it('should remove expired records', async () => {
      const shortStore = new MemoryStore(50)

      await shortStore.increment('key1')
      await shortStore.increment('key2')

      await wait(60) // Wait for expiration

      shortStore.cleanup()

      const info1 = await shortStore.increment('key1')
      expect(info1.current).toBe(1) // Should be reset
    })

    it('should keep active records', async () => {
      await store.increment('key1')
      store.cleanup()

      const info = await store.increment('key1')
      expect(info.current).toBe(2) // Should continue counting
    })
  })
})

// ==================== createRateLimiter 测试 ====================

describe('createRateLimiter', () => {
  describe('Basic functionality', () => {
    it('should allow requests within limit', async () => {
      const limiter = createRateLimiter({
        windowMs: 1000,
        max: 5,
      })

      const event = createMockEvent()

      await expect(limiter(event)).resolves.toBeUndefined()
      await expect(limiter(event)).resolves.toBeUndefined()
      await expect(limiter(event)).resolves.toBeUndefined()
    })

    it('should block requests exceeding limit', async () => {
      const limiter = createRateLimiter({
        windowMs: 1000,
        max: 2,
      })

      const event = createMockEvent({ ip: '192.168.1.1' })

      await limiter(event)
      await limiter(event)

      await expect(limiter(event)).rejects.toThrow()
    })

    it('should reset after window expires', async () => {
      const limiter = createRateLimiter({
        windowMs: 50,
        max: 2,
      })

      const event = createMockEvent({ ip: '192.168.1.2' })

      await limiter(event)
      await limiter(event)

      await wait(60) // Wait for window to expire

      await expect(limiter(event)).resolves.toBeUndefined()
    })

    it('should track different IPs separately', async () => {
      const limiter = createRateLimiter({
        windowMs: 1000,
        max: 2,
      })

      const event1 = createMockEvent({ ip: '192.168.1.1' })
      const event2 = createMockEvent({ ip: '192.168.1.2' })

      await limiter(event1)
      await limiter(event1)
      await expect(limiter(event1)).rejects.toThrow()

      await expect(limiter(event2)).resolves.toBeUndefined()
    })
  })

  describe('Response headers', () => {
    it('should set X-RateLimit-Limit header', async () => {
      const limiter = createRateLimiter({
        windowMs: 1000,
        max: 10,
      })

      const event = createMockEvent()
      const setHeaderSpy = vi.spyOn(event.node.res, 'setHeader')

      await limiter(event)

      expect(setHeaderSpy).toHaveBeenCalledWith('X-RateLimit-Limit', '10')
    })

    it('should set X-RateLimit-Remaining header', async () => {
      const limiter = createRateLimiter({
        windowMs: 1000,
        max: 5,
      })

      const event = createMockEvent({ ip: '192.168.1.10' })
      const setHeaderSpy = vi.spyOn(event.node.res, 'setHeader')

      await limiter(event)
      expect(setHeaderSpy).toHaveBeenCalledWith('X-RateLimit-Remaining', '4')

      await limiter(event)
      expect(setHeaderSpy).toHaveBeenCalledWith('X-RateLimit-Remaining', '3')
    })

    it('should set X-RateLimit-Reset header', async () => {
      const limiter = createRateLimiter({
        windowMs: 1000,
        max: 5,
      })

      const event = createMockEvent()
      const setHeaderSpy = vi.spyOn(event.node.res, 'setHeader')

      await limiter(event)

      const calls = setHeaderSpy.mock.calls
      const resetCall = calls.find(call => call[0] === 'X-RateLimit-Reset')

      expect(resetCall).toBeDefined()
      expect(Number(resetCall![1])).toBeGreaterThan(Math.floor(Date.now() / 1000))
    })

    it('should set Retry-After header when limited', async () => {
      const limiter = createRateLimiter({
        windowMs: 1000,
        max: 1,
      })

      const event = createMockEvent({ ip: '192.168.1.11' })
      const setHeaderSpy = vi.spyOn(event.node.res, 'setHeader')

      await limiter(event)

      try {
        await limiter(event)
      }
      catch {
        const calls = setHeaderSpy.mock.calls
        const retryCall = calls.find(call => call[0] === 'Retry-After')

        expect(retryCall).toBeDefined()
        expect(Number(retryCall![1])).toBeGreaterThan(0)
      }
    })
  })

  describe('Custom configuration', () => {
    it('should use custom window duration', async () => {
      const limiter = createRateLimiter({
        windowMs: 50,
        max: 1,
      })

      const event = createMockEvent({ ip: '192.168.1.20' })

      await limiter(event)
      await expect(limiter(event)).rejects.toThrow()

      await wait(60)

      await expect(limiter(event)).resolves.toBeUndefined()
    })

    it('should use custom max requests', async () => {
      const limiter = createRateLimiter({
        windowMs: 1000,
        max: 3,
      })

      const event = createMockEvent({ ip: '192.168.1.21' })

      await limiter(event)
      await limiter(event)
      await limiter(event)
      await expect(limiter(event)).rejects.toThrow()
    })

    it('should use custom error message', async () => {
      const customMessage = 'Custom rate limit message'
      const limiter = createRateLimiter({
        windowMs: 1000,
        max: 1,
        message: customMessage,
      })

      const event = createMockEvent({ ip: '192.168.1.22' })

      await limiter(event)

      try {
        await limiter(event)
        expect.fail('Should have thrown error')
      }
      catch (error: any) {
        expect(error.statusMessage).toBe(customMessage)
      }
    })

    it('should use custom status code', async () => {
      const limiter = createRateLimiter({
        windowMs: 1000,
        max: 1,
        statusCode: 503,
      })

      const event = createMockEvent({ ip: '192.168.1.23' })

      await limiter(event)

      try {
        await limiter(event)
        expect.fail('Should have thrown error')
      }
      catch (error: any) {
        expect(error.statusCode).toBe(503)
      }
    })
  })

  describe('Custom key generator', () => {
    it('should use custom key generator', async () => {
      const limiter = createRateLimiter({
        windowMs: 1000,
        max: 2,
        keyGenerator: () => 'static-key',
      })

      const event1 = createMockEvent({ ip: '192.168.1.1' })
      const event2 = createMockEvent({ ip: '192.168.1.2' })

      await limiter(event1)
      await limiter(event2)

      // Both events share the same key, so should be limited
      await expect(limiter(event1)).rejects.toThrow()
    })

    it('should support async key generator', async () => {
      const limiter = createRateLimiter({
        windowMs: 1000,
        max: 2,
        keyGenerator: async (event) => {
          await wait(10)
          return `async-${event.node.req.socket.remoteAddress}`
        },
      })

      const event = createMockEvent({ ip: '192.168.1.30' })

      await expect(limiter(event)).resolves.toBeUndefined()
    })
  })

  describe('Custom store', () => {
    it('should use custom store', async () => {
      const customStore: RateLimitStore = {
        increment: vi.fn().mockResolvedValue({
          current: 1,
          remaining: 9,
          resetTime: Math.floor(Date.now() / 1000) + 60,
          isLimited: false,
        }),
        reset: vi.fn(),
        resetAll: vi.fn(),
      }

      const limiter = createRateLimiter({
        windowMs: 1000,
        max: 10,
        store: customStore,
      })

      const event = createMockEvent()
      await limiter(event)

      expect(customStore.increment).toHaveBeenCalled()
    })
  })

  describe('Error handling', () => {
    it('should handle key generator errors gracefully', async () => {
      const limiter = createRateLimiter({
        windowMs: 1000,
        max: 10,
        keyGenerator: () => {
          throw new Error('Key generator error')
        },
      })

      const event = createMockEvent()

      // Should not throw error, just log it
      await expect(limiter(event)).resolves.toBeUndefined()
    })

    it('should handle store errors gracefully', async () => {
      const errorStore: RateLimitStore = {
        increment: vi.fn().mockRejectedValue(new Error('Store error')),
        reset: vi.fn(),
        resetAll: vi.fn(),
      }

      const limiter = createRateLimiter({
        windowMs: 1000,
        max: 10,
        store: errorStore,
      })

      const event = createMockEvent()

      // Should not throw error, just log it
      await expect(limiter(event)).resolves.toBeUndefined()
    })
  })
})

// ==================== Key Generators 测试 ====================

describe('Key Generators', () => {
  describe('userIdKeyGenerator', () => {
    it('should use user ID when available', () => {
      const event = createMockEvent({ userId: 123 })
      const key = userIdKeyGenerator(event)

      expect(key).toBe('user:123')
    })

    it('should fallback to IP when user not available', () => {
      const event = createMockEvent({ ip: '192.168.1.1' })
      const key = userIdKeyGenerator(event)

      expect(key).toBe('ip:192.168.1.1')
    })

    it('should handle missing user and IP', () => {
      const event = createMockEvent()
      event.node.req.socket.remoteAddress = undefined
      const key = userIdKeyGenerator(event)

      expect(key).toBe('ip:unknown')
    })
  })

  describe('combinedKeyGenerator', () => {
    it('should combine user ID and IP', () => {
      const event = createMockEvent({ userId: 456, ip: '192.168.1.2' })
      const key = combinedKeyGenerator(event)

      expect(key).toBe('user:456:ip:192.168.1.2')
    })

    it('should use IP only when user not available', () => {
      const event = createMockEvent({ ip: '192.168.1.3' })
      const key = combinedKeyGenerator(event)

      expect(key).toBe('ip:192.168.1.3')
    })

    it('should handle missing IP', () => {
      const event = createMockEvent({ userId: 789 })
      event.node.req.socket.remoteAddress = undefined
      const key = combinedKeyGenerator(event)

      expect(key).toBe('user:789:ip:unknown')
    })
  })
})

// ==================== Presets 测试 ====================

describe('RateLimitPresets', () => {
  it('should have strict preset', () => {
    expect(RateLimitPresets.strict).toEqual({
      windowMs: 60 * 1000,
      max: 10,
    })
  })

  it('should have standard preset', () => {
    expect(RateLimitPresets.standard).toEqual({
      windowMs: 60 * 1000,
      max: 100,
    })
  })

  it('should have lenient preset', () => {
    expect(RateLimitPresets.lenient).toEqual({
      windowMs: 60 * 1000,
      max: 1000,
    })
  })

  it('should have api preset', () => {
    expect(RateLimitPresets.api).toEqual({
      windowMs: 60 * 1000,
      max: 60,
    })
  })

  it('should have login preset', () => {
    expect(RateLimitPresets.login).toEqual({
      windowMs: 15 * 60 * 1000,
      max: 5,
      message: 'Too many login attempts, please try again later.',
    })
  })

  it('should have download preset', () => {
    expect(RateLimitPresets.download).toEqual({
      windowMs: 60 * 60 * 1000,
      max: 10,
      message: 'Download limit exceeded, please try again later.',
    })
  })
})

// ==================== IP Detection 测试 ====================

describe('IP Detection', () => {
  it('should extract IP from x-forwarded-for', async () => {
    const limiter = createRateLimiter({
      windowMs: 1000,
      max: 1,
    })

    const event = createMockEvent({
      headers: { 'x-forwarded-for': '203.0.113.1, 198.51.100.1' },
    })

    await limiter(event)

    const event2 = createMockEvent({
      headers: { 'x-forwarded-for': '203.0.113.1, 198.51.100.2' },
    })

    // Should be limited because same first IP
    await expect(limiter(event2)).rejects.toThrow()
  })

  it('should extract IP from x-real-ip', async () => {
    const limiter = createRateLimiter({
      windowMs: 1000,
      max: 1,
    })

    const event = createMockEvent({
      headers: { 'x-real-ip': '203.0.113.2' },
    })

    await limiter(event)

    const event2 = createMockEvent({
      headers: { 'x-real-ip': '203.0.113.2' },
    })

    await expect(limiter(event2)).rejects.toThrow()
  })

  it('should prioritize x-forwarded-for over x-real-ip', async () => {
    const limiter = createRateLimiter({
      windowMs: 1000,
      max: 1,
    })

    const event = createMockEvent({
      headers: {
        'x-forwarded-for': '203.0.113.3',
        'x-real-ip': '203.0.113.4',
      },
    })

    await limiter(event)

    const event2 = createMockEvent({
      headers: { 'x-forwarded-for': '203.0.113.3' },
    })

    await expect(limiter(event2)).rejects.toThrow()
  })

  it('should handle Cloudflare header', async () => {
    const limiter = createRateLimiter({
      windowMs: 1000,
      max: 1,
    })

    const event = createMockEvent({
      headers: { 'cf-connecting-ip': '203.0.113.5' },
    })

    await limiter(event)

    const event2 = createMockEvent({
      headers: { 'cf-connecting-ip': '203.0.113.5' },
    })

    await expect(limiter(event2)).rejects.toThrow()
  })
})

// ==================== Integration Scenarios 测试 ====================

describe('Integration Scenarios', () => {
  it('should handle burst traffic', async () => {
    const limiter = createRateLimiter({
      windowMs: 1000,
      max: 5,
    })

    const event = createMockEvent({ ip: '192.168.1.100' })

    // Simulate burst
    const promises = Array.from({ length: 10 }, () => limiter(event))
    const results = await Promise.allSettled(promises)

    const fulfilled = results.filter(r => r.status === 'fulfilled').length
    const rejected = results.filter(r => r.status === 'rejected').length

    expect(fulfilled).toBe(5)
    expect(rejected).toBe(5)
  })

  it('should handle concurrent requests from different IPs', async () => {
    const limiter = createRateLimiter({
      windowMs: 1000,
      max: 2,
    })

    const event1 = createMockEvent({ ip: '192.168.1.101' })
    const event2 = createMockEvent({ ip: '192.168.1.102' })
    const event3 = createMockEvent({ ip: '192.168.1.103' })

    const promises = [
      limiter(event1),
      limiter(event1),
      limiter(event2),
      limiter(event2),
      limiter(event3),
      limiter(event3),
    ]

    const results = await Promise.allSettled(promises)
    const fulfilled = results.filter(r => r.status === 'fulfilled').length

    expect(fulfilled).toBe(6) // All should succeed (2 per IP)
  })

  it('should apply different limits to different routes', async () => {
    const strictLimiter = createRateLimiter({
      windowMs: 1000,
      max: 1,
    })

    const lenientLimiter = createRateLimiter({
      windowMs: 1000,
      max: 10,
    })

    const event = createMockEvent({ ip: '192.168.1.200' })

    // Strict endpoint
    await strictLimiter(event)
    await expect(strictLimiter(event)).rejects.toThrow()

    // Lenient endpoint (different limiter instance)
    await expect(lenientLimiter(event)).resolves.toBeUndefined()
  })

  it('should handle user switching (logout/login)', async () => {
    const limiter = createRateLimiter({
      windowMs: 1000,
      max: 2,
      keyGenerator: userIdKeyGenerator,
    })

    // User 1
    const event1 = createMockEvent({ userId: 1, ip: '192.168.1.201' })
    await limiter(event1)
    await limiter(event1)
    await expect(limiter(event1)).rejects.toThrow()

    // User 2 (same IP)
    const event2 = createMockEvent({ userId: 2, ip: '192.168.1.201' })
    await expect(limiter(event2)).resolves.toBeUndefined()
  })
})
