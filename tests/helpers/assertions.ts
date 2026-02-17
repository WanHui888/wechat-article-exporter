/**
 * 自定义测试断言助手
 * 提供常用的 API 响应断言
 */

import { expect } from 'vitest'
import type { ApiResponse } from './api-client'

/**
 * API 响应断言助手
 */
export class ApiAssertions {
  /**
   * 断言响应成功 (2xx)
   */
  static isSuccess(response: ApiResponse) {
    expect(response.status).toBeGreaterThanOrEqual(200)
    expect(response.status).toBeLessThan(300)
    expect(response.error).toBeUndefined()
    return this
  }

  /**
   * 断言响应失败 (4xx/5xx)
   */
  static isError(response: ApiResponse) {
    expect(response.status).toBeGreaterThanOrEqual(400)
    expect(response.error).toBeDefined()
    return this
  }

  /**
   * 断言响应状态码
   */
  static hasStatus(response: ApiResponse, status: number) {
    expect(response.status).toBe(status)
    return this
  }

  /**
   * 断言 200 OK
   */
  static isOk(response: ApiResponse) {
    return this.hasStatus(response, 200)
  }

  /**
   * 断言 201 Created
   */
  static isCreated(response: ApiResponse) {
    return this.hasStatus(response, 201)
  }

  /**
   * 断言 400 Bad Request
   */
  static isBadRequest(response: ApiResponse) {
    return this.hasStatus(response, 400)
  }

  /**
   * 断言 401 Unauthorized
   */
  static isUnauthorized(response: ApiResponse) {
    return this.hasStatus(response, 401)
  }

  /**
   * 断言 403 Forbidden
   */
  static isForbidden(response: ApiResponse) {
    return this.hasStatus(response, 403)
  }

  /**
   * 断言 404 Not Found
   */
  static isNotFound(response: ApiResponse) {
    return this.hasStatus(response, 404)
  }

  /**
   * 断言 409 Conflict
   */
  static isConflict(response: ApiResponse) {
    return this.hasStatus(response, 409)
  }

  /**
   * 断言 500 Internal Server Error
   */
  static isServerError(response: ApiResponse) {
    expect(response.status).toBeGreaterThanOrEqual(500)
    expect(response.status).toBeLessThan(600)
    return this
  }

  /**
   * 断言响应包含数据
   */
  static hasData(response: ApiResponse) {
    expect(response.data).toBeDefined()
    expect(response.data).not.toBeNull()
    return this
  }

  /**
   * 断言响应数据包含指定字段
   */
  static hasFields(response: ApiResponse, fields: string[]) {
    expect(response.data).toBeDefined()
    for (const field of fields) {
      expect(response.data).toHaveProperty(field)
    }
    return this
  }

  /**
   * 断言响应数据是数组
   */
  static isArray(response: ApiResponse) {
    expect(response.data).toBeDefined()
    expect(Array.isArray(response.data)).toBe(true)
    return this
  }

  /**
   * 断言响应数据数组长度
   */
  static hasLength(response: ApiResponse, length: number) {
    this.isArray(response)
    expect(response.data.length).toBe(length)
    return this
  }

  /**
   * 断言响应数据数组最小长度
   */
  static hasMinLength(response: ApiResponse, minLength: number) {
    this.isArray(response)
    expect(response.data.length).toBeGreaterThanOrEqual(minLength)
    return this
  }

  /**
   * 断言响应包含错误消息
   */
  static hasErrorMessage(response: ApiResponse, message?: string) {
    expect(response.error).toBeDefined()
    if (message) {
      const errorMessage = response.error?.statusMessage || response.error?.message || ''
      expect(errorMessage.toLowerCase()).toContain(message.toLowerCase())
    }
    return this
  }

  /**
   * 断言响应包含 token
   */
  static hasToken(response: ApiResponse) {
    expect(response.data).toBeDefined()
    expect(response.data.token).toBeDefined()
    expect(typeof response.data.token).toBe('string')
    expect(response.data.token.length).toBeGreaterThan(0)
    return this
  }

  /**
   * 断言响应包含用户信息
   */
  static hasUser(response: ApiResponse, fields?: string[]) {
    expect(response.data).toBeDefined()
    expect(response.data.user).toBeDefined()

    const defaultFields = ['id', 'username', 'email', 'nickname', 'role', 'status']
    const fieldsToCheck = fields || defaultFields

    for (const field of fieldsToCheck) {
      expect(response.data.user).toHaveProperty(field)
    }
    return this
  }

  /**
   * 断言响应包含分页信息
   */
  static hasPagination(response: ApiResponse) {
    expect(response.data).toBeDefined()
    expect(response.data).toHaveProperty('items')
    expect(response.data).toHaveProperty('total')
    expect(response.data).toHaveProperty('page')
    expect(response.data).toHaveProperty('pageSize')
    expect(Array.isArray(response.data.items)).toBe(true)
    expect(typeof response.data.total).toBe('number')
    expect(typeof response.data.page).toBe('number')
    expect(typeof response.data.pageSize).toBe('number')
    return this
  }

  /**
   * 断言响应数据匹配对象
   */
  static matchesObject(response: ApiResponse, expected: any) {
    expect(response.data).toBeDefined()
    expect(response.data).toMatchObject(expected)
    return this
  }

  /**
   * 断言响应 header 包含指定键
   */
  static hasHeader(response: ApiResponse, key: string, value?: string) {
    expect(response.headers).toBeDefined()
    expect(response.headers[key.toLowerCase()]).toBeDefined()
    if (value) {
      expect(response.headers[key.toLowerCase()]).toBe(value)
    }
    return this
  }

  /**
   * 断言响应包含 JSON content-type
   */
  static isJson(response: ApiResponse) {
    return this.hasHeader(response, 'content-type', 'application/json')
  }
}

/**
 * 数据断言助手
 */
export class DataAssertions {
  /**
   * 断言对象包含所有必需字段
   */
  static hasRequiredFields(obj: any, fields: string[]) {
    for (const field of fields) {
      expect(obj).toHaveProperty(field)
      expect(obj[field]).not.toBeUndefined()
      expect(obj[field]).not.toBeNull()
    }
  }

  /**
   * 断言是有效的用户对象
   */
  static isValidUser(user: any) {
    this.hasRequiredFields(user, ['id', 'username', 'nickname', 'role', 'status'])
    expect(typeof user.id).toBe('number')
    expect(typeof user.username).toBe('string')
    expect(['admin', 'user']).toContain(user.role)
    expect(['active', 'disabled']).toContain(user.status)
  }

  /**
   * 断言是有效的账号对象
   */
  static isValidAccount(account: any) {
    this.hasRequiredFields(account, ['id', 'userId', 'nickname', 'fakeid'])
    expect(typeof account.id).toBe('number')
    expect(typeof account.userId).toBe('number')
    expect(typeof account.nickname).toBe('string')
    expect(typeof account.fakeid).toBe('string')
  }

  /**
   * 断言是有效的文章对象
   */
  static isValidArticle(article: any) {
    this.hasRequiredFields(article, [
      'id',
      'userId',
      'accountId',
      'mid',
      'idx',
      'title',
      'contentUrl',
      'publishTime',
    ])
    expect(typeof article.id).toBe('number')
    expect(typeof article.title).toBe('string')
    expect(typeof article.contentUrl).toBe('string')
    expect(typeof article.publishTime).toBe('number')
  }

  /**
   * 断言是有效的时间戳
   */
  static isValidTimestamp(timestamp: any) {
    expect(typeof timestamp).toBe('number')
    expect(timestamp).toBeGreaterThan(0)
    expect(timestamp).toBeLessThan(Date.now() + 86400000) // Not more than 1 day in future
  }

  /**
   * 断言是有效的日期字符串
   */
  static isValidDateString(dateStr: any) {
    expect(typeof dateStr).toBe('string')
    const date = new Date(dateStr)
    expect(date.toString()).not.toBe('Invalid Date')
  }

  /**
   * 断言是有效的 URL
   */
  static isValidUrl(url: any) {
    expect(typeof url).toBe('string')
    expect(() => new URL(url)).not.toThrow()
  }

  /**
   * 断言是有效的邮箱
   */
  static isValidEmail(email: any) {
    expect(typeof email).toBe('string')
    expect(email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
  }
}

/**
 * 性能断言助手
 */
export class PerformanceAssertions {
  /**
   * 断言响应时间小于指定毫秒数
   */
  static async respondsWithin(fn: () => Promise<any>, maxMs: number) {
    const start = Date.now()
    await fn()
    const elapsed = Date.now() - start
    expect(elapsed).toBeLessThan(maxMs)
  }

  /**
   * 断言批量操作的平均响应时间
   */
  static async averageResponseTime(
    fn: () => Promise<any>,
    iterations: number,
    maxAvgMs: number
  ) {
    const times: number[] = []

    for (let i = 0; i < iterations; i++) {
      const start = Date.now()
      await fn()
      times.push(Date.now() - start)
    }

    const avgTime = times.reduce((a, b) => a + b, 0) / times.length
    expect(avgTime).toBeLessThan(maxAvgMs)
  }
}

/**
 * 便捷导出
 */
export const assert = {
  api: ApiAssertions,
  data: DataAssertions,
  perf: PerformanceAssertions,
}
