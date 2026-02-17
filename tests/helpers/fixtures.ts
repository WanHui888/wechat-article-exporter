/**
 * 测试夹具加载器
 * 用于加载和管理测试数据
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * 加载 JSON 夹具文件
 */
export function loadFixture<T = any>(filename: string): T {
  const fixturesDir = resolve(process.cwd(), 'tests/fixtures')
  const filePath = resolve(fixturesDir, filename)

  try {
    const content = readFileSync(filePath, 'utf-8')
    return JSON.parse(content) as T
  }
  catch (error) {
    console.error(`Failed to load fixture: ${filename}`, error)
    throw new Error(`Fixture file not found or invalid: ${filename}`)
  }
}

/**
 * 加载文本夹具文件
 */
export function loadTextFixture(filename: string): string {
  const fixturesDir = resolve(process.cwd(), 'tests/fixtures')
  const filePath = resolve(fixturesDir, filename)

  try {
    return readFileSync(filePath, 'utf-8')
  }
  catch (error) {
    console.error(`Failed to load text fixture: ${filename}`, error)
    throw new Error(`Fixture file not found: ${filename}`)
  }
}

/**
 * 预定义的测试夹具
 */
export const Fixtures = {
  /**
   * 加载测试用户数据
   */
  users() {
    return loadFixture('users.json')
  },

  /**
   * 加载测试账号数据
   */
  accounts() {
    return loadFixture('accounts.json')
  },

  /**
   * 加载测试文章数据
   */
  articles() {
    return loadFixture('articles.json')
  },

  /**
   * 加载示例文章 HTML
   */
  sampleArticleHtml() {
    return loadTextFixture('sample-article.html')
  },

  /**
   * 加载包含图片的示例文章 HTML
   */
  sampleArticleWithImagesHtml() {
    return loadTextFixture('sample-article-with-images.html')
  },
}

/**
 * 测试数据构建器
 */
export class TestDataBuilder {
  /**
   * 创建测试用户数据
   */
  static user(overrides: any = {}) {
    return {
      username: 'testuser',
      password: 'TestPassword123!',
      email: 'test@example.com',
      nickname: 'Test User',
      ...overrides,
    }
  }

  /**
   * 创建测试账号数据
   */
  static account(overrides: any = {}) {
    return {
      nickname: '测试公众号',
      alias: 'test-account',
      fakeid: 'fakeid-test-123',
      servicetype: 0,
      signature: '这是一个测试公众号',
      roundHeadImg: 'https://example.com/avatar.jpg',
      ...overrides,
    }
  }

  /**
   * 创建测试文章数据
   */
  static article(overrides: any = {}) {
    const timestamp = Date.now()
    return {
      mid: `mid-${timestamp}`,
      idx: '1',
      sn: `sn-${timestamp}`,
      title: '测试文章标题',
      author: '作者名称',
      cover: 'https://example.com/cover.jpg',
      digest: '这是文章摘要',
      contentUrl: `https://mp.weixin.qq.com/s/${timestamp}`,
      publishTime: timestamp,
      createTime: timestamp,
      updateTime: timestamp,
      ...overrides,
    }
  }

  /**
   * 创建测试凭证数据
   */
  static credential(overrides: any = {}) {
    return {
      cookie: 'fake_cookie_value',
      token: 'fake_token_value',
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
      ...overrides,
    }
  }

  /**
   * 创建测试导出任务数据
   */
  static exportJob(overrides: any = {}) {
    return {
      type: 'markdown',
      status: 'pending',
      total: 0,
      completed: 0,
      failed: 0,
      ...overrides,
    }
  }

  /**
   * 创建测试评论数据
   */
  static comment(overrides: any = {}) {
    return {
      content: '这是一条测试评论',
      createTime: Date.now(),
      nickName: '评论用户',
      ...overrides,
    }
  }

  /**
   * 创建批量测试数据
   */
  static batch<T>(builder: () => T, count: number): T[] {
    return Array.from({ length: count }, builder)
  }
}

/**
 * 随机数据生成器
 */
export class RandomDataGenerator {
  /**
   * 生成随机字符串
   */
  static string(length = 10): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let result = ''
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  /**
   * 生成随机数字
   */
  static number(min = 0, max = 100): number {
    return Math.floor(Math.random() * (max - min + 1)) + min
  }

  /**
   * 生成随机邮箱
   */
  static email(): string {
    return `${this.string(8)}@example.com`
  }

  /**
   * 生成随机用户名
   */
  static username(): string {
    return `user_${this.string(8)}`
  }

  /**
   * 生成随机 URL
   */
  static url(path = ''): string {
    return `https://example.com/${path || this.string(10)}`
  }

  /**
   * 生成随机时间戳
   */
  static timestamp(daysAgo = 0): number {
    const now = Date.now()
    return now - daysAgo * 24 * 60 * 60 * 1000
  }

  /**
   * 从数组中随机选择
   */
  static pick<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)]
  }

  /**
   * 生成随机布尔值
   */
  static boolean(): boolean {
    return Math.random() < 0.5
  }
}
