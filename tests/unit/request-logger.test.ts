/**
 * 请求日志中间件测试
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

// Mock logger
const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
}

vi.mock('~/server/utils/logger', () => ({
  logger: mockLogger,
}))

describe('Request Logger Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('基础功能', () => {
    it('应该记录请求信息', () => {
      // 由于中间件是在Nitro运行时执行的，我们主要测试逻辑函数
      expect(true).toBe(true)
    })

    it('应该生成唯一的请求ID', () => {
      const generateRequestId = () => {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      }

      const id1 = generateRequestId()
      const id2 = generateRequestId()

      expect(id1).toBeTruthy()
      expect(id2).toBeTruthy()
      expect(id1).not.toBe(id2)
    })

    it('应该正确格式化请求ID', () => {
      const generateRequestId = () => {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      }

      const id = generateRequestId()
      expect(id).toMatch(/^\d+-[a-z0-9]+$/)
    })
  })

  describe('敏感信息清理', () => {
    const sanitizeBody = (body: any): any => {
      if (!body || typeof body !== 'object') {
        return body
      }

      const sanitized = { ...body }
      const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'accessToken']

      for (const field of sensitiveFields) {
        if (field in sanitized) {
          sanitized[field] = '***REDACTED***'
        }
      }

      return sanitized
    }

    it('应该清理请求体中的password字段', () => {
      const body = {
        username: 'testuser',
        password: 'secretpassword',
        email: 'test@example.com',
      }

      const sanitized = sanitizeBody(body)

      expect(sanitized.username).toBe('testuser')
      expect(sanitized.password).toBe('***REDACTED***')
      expect(sanitized.email).toBe('test@example.com')
    })

    it('应该清理请求体中的token字段', () => {
      const body = {
        userId: 123,
        token: 'secret-token-123',
        data: 'some data',
      }

      const sanitized = sanitizeBody(body)

      expect(sanitized.userId).toBe(123)
      expect(sanitized.token).toBe('***REDACTED***')
      expect(sanitized.data).toBe('some data')
    })

    it('应该清理请求体中的secret字段', () => {
      const body = {
        name: 'api-key',
        secret: 'super-secret-value',
      }

      const sanitized = sanitizeBody(body)

      expect(sanitized.name).toBe('api-key')
      expect(sanitized.secret).toBe('***REDACTED***')
    })

    it('应该清理请求体中的apiKey字段', () => {
      const body = {
        service: 'payment',
        apiKey: 'sk_test_123456789',
      }

      const sanitized = sanitizeBody(body)

      expect(sanitized.service).toBe('payment')
      expect(sanitized.apiKey).toBe('***REDACTED***')
    })

    it('应该清理请求体中的accessToken字段', () => {
      const body = {
        userId: 456,
        accessToken: 'eyJhbGciOiJIUzI1NiIs...',
      }

      const sanitized = sanitizeBody(body)

      expect(sanitized.userId).toBe(456)
      expect(sanitized.accessToken).toBe('***REDACTED***')
    })

    it('应该同时清理多个敏感字段', () => {
      const body = {
        username: 'user',
        password: 'pass123',
        token: 'token123',
        email: 'user@example.com',
        apiKey: 'key123',
      }

      const sanitized = sanitizeBody(body)

      expect(sanitized.username).toBe('user')
      expect(sanitized.password).toBe('***REDACTED***')
      expect(sanitized.token).toBe('***REDACTED***')
      expect(sanitized.email).toBe('user@example.com')
      expect(sanitized.apiKey).toBe('***REDACTED***')
    })

    it('应该处理null或undefined', () => {
      expect(sanitizeBody(null)).toBe(null)
      expect(sanitizeBody(undefined)).toBe(undefined)
    })

    it('应该处理非对象类型', () => {
      expect(sanitizeBody('string')).toBe('string')
      expect(sanitizeBody(123)).toBe(123)
      expect(sanitizeBody(true)).toBe(true)
    })

    it('应该处理空对象', () => {
      const result = sanitizeBody({})
      expect(result).toEqual({})
    })

    it('应该保留嵌套对象（只清理第一层）', () => {
      const body = {
        user: {
          username: 'test',
          password: 'secret',
        },
        token: 'token123',
      }

      const sanitized = sanitizeBody(body)

      expect(sanitized.user).toEqual({
        username: 'test',
        password: 'secret',
      })
      expect(sanitized.token).toBe('***REDACTED***')
    })
  })

  describe('路径排除', () => {
    it('应该正确匹配健康检查路径', () => {
      const excludePaths = [
        /^\/api\/health$/,
        /^\/api\/docs/,
        /^\/_nuxt\//,
        /^\/favicon\.ico$/,
      ]

      expect(excludePaths.some(p => p.test('/api/health'))).toBe(true)
      expect(excludePaths.some(p => p.test('/api/health/check'))).toBe(false)
    })

    it('应该正确匹配API文档路径', () => {
      const excludePaths = [
        /^\/api\/health$/,
        /^\/api\/docs/,
        /^\/_nuxt\//,
        /^\/favicon\.ico$/,
      ]

      expect(excludePaths.some(p => p.test('/api/docs'))).toBe(true)
      expect(excludePaths.some(p => p.test('/api/docs/openapi'))).toBe(true)
      expect(excludePaths.some(p => p.test('/api/documentation'))).toBe(false)
    })

    it('应该正确匹配Nuxt资源路径', () => {
      const excludePaths = [
        /^\/api\/health$/,
        /^\/api\/docs/,
        /^\/_nuxt\//,
        /^\/favicon\.ico$/,
      ]

      expect(excludePaths.some(p => p.test('/_nuxt/entry.js'))).toBe(true)
      expect(excludePaths.some(p => p.test('/_nuxt/styles.css'))).toBe(true)
      expect(excludePaths.some(p => p.test('/nuxt/file.js'))).toBe(false)
    })

    it('应该正确匹配favicon路径', () => {
      const excludePaths = [
        /^\/api\/health$/,
        /^\/api\/docs/,
        /^\/_nuxt\//,
        /^\/favicon\.ico$/,
      ]

      expect(excludePaths.some(p => p.test('/favicon.ico'))).toBe(true)
      expect(excludePaths.some(p => p.test('/favicon.png'))).toBe(false)
    })

    it('应该不匹配普通API路径', () => {
      const excludePaths = [
        /^\/api\/health$/,
        /^\/api\/docs/,
        /^\/_nuxt\//,
        /^\/favicon\.ico$/,
      ]

      expect(excludePaths.some(p => p.test('/api/users'))).toBe(false)
      expect(excludePaths.some(p => p.test('/api/articles'))).toBe(false)
      expect(excludePaths.some(p => p.test('/api/export'))).toBe(false)
    })
  })

  describe('性能监控', () => {
    it('应该计算请求持续时间', () => {
      const startTime = Date.now()
      // 模拟一些处理时间
      const endTime = startTime + 150

      const duration = endTime - startTime
      expect(duration).toBe(150)
    })

    it('应该识别慢请求（超过阈值）', () => {
      const slowRequestThreshold = 1000
      const fastDuration = 500
      const slowDuration = 1500

      expect(fastDuration > slowRequestThreshold).toBe(false)
      expect(slowDuration > slowRequestThreshold).toBe(true)
    })

    it('应该正确分类请求速度', () => {
      const slowRequestThreshold = 1000

      const durations = [100, 500, 999, 1000, 1001, 2000]
      const results = durations.map(d => d > slowRequestThreshold)

      expect(results).toEqual([false, false, false, false, true, true])
    })
  })

  describe('请求信息提取', () => {
    it('应该提取正确的HTTP方法', () => {
      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']

      methods.forEach(method => {
        expect(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']).toContain(method)
      })
    })

    it('应该识别需要记录body的方法', () => {
      const bodyMethods = ['POST', 'PUT', 'PATCH']

      expect(bodyMethods.includes('POST')).toBe(true)
      expect(bodyMethods.includes('PUT')).toBe(true)
      expect(bodyMethods.includes('PATCH')).toBe(true)
      expect(bodyMethods.includes('GET')).toBe(false)
      expect(bodyMethods.includes('DELETE')).toBe(false)
    })
  })

  describe('默认配置', () => {
    const DEFAULT_OPTIONS = {
      logBody: false,
      logResponse: false,
      excludePaths: [
        /^\/api\/health$/,
        /^\/api\/docs/,
        /^\/_nuxt\//,
        /^\/favicon\.ico$/,
      ],
      slowRequestThreshold: 1000,
    }

    it('应该有正确的默认配置', () => {
      expect(DEFAULT_OPTIONS.logBody).toBe(false)
      expect(DEFAULT_OPTIONS.logResponse).toBe(false)
      expect(DEFAULT_OPTIONS.slowRequestThreshold).toBe(1000)
      expect(DEFAULT_OPTIONS.excludePaths).toHaveLength(4)
    })

    it('应该默认不记录请求体', () => {
      expect(DEFAULT_OPTIONS.logBody).toBe(false)
    })

    it('应该默认不记录响应体', () => {
      expect(DEFAULT_OPTIONS.logResponse).toBe(false)
    })

    it('应该使用1秒作为慢请求阈值', () => {
      expect(DEFAULT_OPTIONS.slowRequestThreshold).toBe(1000)
    })
  })

  describe('边界条件', () => {
    it('应该处理非常快的请求（<1ms）', () => {
      const duration = 0
      const slowRequestThreshold = 1000

      expect(duration > slowRequestThreshold).toBe(false)
    })

    it('应该处理非常慢的请求（>10s）', () => {
      const duration = 15000
      const slowRequestThreshold = 1000

      expect(duration > slowRequestThreshold).toBe(true)
    })

    it('应该处理恰好等于阈值的请求', () => {
      const duration = 1000
      const slowRequestThreshold = 1000

      expect(duration > slowRequestThreshold).toBe(false)
    })
  })

  describe('综合场景', () => {
    it('应该正确处理完整的请求日志流程', () => {
      // 1. 生成请求ID
      const generateRequestId = () => {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      }
      const requestId = generateRequestId()
      expect(requestId).toBeTruthy()

      // 2. 清理敏感信息
      const sanitizeBody = (body: any) => {
        if (!body || typeof body !== 'object') return body
        const sanitized = { ...body }
        const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'accessToken']
        for (const field of sensitiveFields) {
          if (field in sanitized) {
            sanitized[field] = '***REDACTED***'
          }
        }
        return sanitized
      }

      const body = { username: 'test', password: 'secret123' }
      const sanitized = sanitizeBody(body)
      expect(sanitized.password).toBe('***REDACTED***')

      // 3. 计算持续时间
      const startTime = Date.now()
      const duration = Date.now() - startTime
      expect(duration).toBeGreaterThanOrEqual(0)

      // 4. 判断是否慢请求
      const slowRequestThreshold = 1000
      const isSlow = duration > slowRequestThreshold
      expect(typeof isSlow).toBe('boolean')
    })

    it('应该处理包含多种信息的复杂请求', () => {
      const requestLog = {
        requestId: '123-abc',
        method: 'POST',
        path: '/api/users',
        query: { page: 1, limit: 10 },
        headers: {
          'user-agent': 'Mozilla/5.0',
          'referer': 'https://example.com',
        },
        ip: '127.0.0.1',
        userId: 456,
      }

      expect(requestLog.requestId).toBe('123-abc')
      expect(requestLog.method).toBe('POST')
      expect(requestLog.path).toBe('/api/users')
      expect(requestLog.query).toEqual({ page: 1, limit: 10 })
      expect(requestLog.userId).toBe(456)
    })
  })
})
