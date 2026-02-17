/**
 * 测试数据库助手
 * 用于在集成测试中管理测试数据
 */

import { vi } from 'vitest'

/**
 * 测试用户数据
 */
export interface TestUser {
  id: number
  username: string
  passwordHash: string
  email: string | null
  nickname: string
  role: 'admin' | 'user'
  status: 'active' | 'disabled'
  storageQuota: number
  storageUsed: number
  createdAt: Date | string
  lastLoginAt: Date | string | null
  avatar: string | null
}

/**
 * 测试账号数据
 */
export interface TestAccount {
  id: number
  userId: number
  nickname: string
  alias: string | null
  fakeid: string
  servicetype: number
  signature: string | null
  roundHeadImg: string | null
  createdAt: Date | string
  updatedAt: Date | string
}

/**
 * 测试文章数据
 */
export interface TestArticle {
  id: number
  userId: number
  accountId: number
  mid: string
  idx: string
  sn: string
  title: string
  author: string | null
  cover: string | null
  digest: string | null
  contentUrl: string
  sourceUrl: string | null
  publishTime: number
  createTime: number
  updateTime: number
  isFavorite: number
  copyright: number
  hasVideo: number
  createdAt: Date | string
}

/**
 * 内存数据库
 */
export class TestDatabase {
  private users: Map<number, TestUser> = new Map()
  private accounts: Map<number, TestAccount> = new Map()
  private articles: Map<number, TestArticle> = new Map()
  private credentials: Map<number, any> = new Map()
  private htmls: Map<number, any> = new Map()
  private metadata: Map<number, any> = new Map()
  private resources: Map<number, any> = new Map()
  private comments: Map<number, any> = new Map()
  private preferences: Map<number, any> = new Map()
  private logs: Map<number, any> = new Map()

  private userIdCounter = 1
  private accountIdCounter = 1
  private articleIdCounter = 1
  private credentialIdCounter = 1
  private htmlIdCounter = 1
  private metadataIdCounter = 1
  private resourceIdCounter = 1
  private commentIdCounter = 1
  private preferenceIdCounter = 1
  private logIdCounter = 1

  // ==================== User 操作 ====================

  createUser(user: Partial<TestUser>): TestUser {
    const id = this.userIdCounter++
    const newUser: TestUser = {
      id,
      username: user.username || `user${id}`,
      passwordHash: user.passwordHash || 'hashed-password',
      email: user.email || null,
      nickname: user.nickname || user.username || `user${id}`,
      role: user.role || 'user',
      status: user.status || 'active',
      storageQuota: user.storageQuota || 5368709120, // 5GB
      storageUsed: user.storageUsed || 0,
      createdAt: user.createdAt || new Date().toISOString(),
      lastLoginAt: user.lastLoginAt || null,
      avatar: user.avatar || null,
    }
    this.users.set(id, newUser)
    return newUser
  }

  getUser(id: number): TestUser | undefined {
    return this.users.get(id)
  }

  getUserByUsername(username: string): TestUser | undefined {
    return Array.from(this.users.values()).find(u => u.username === username)
  }

  updateUser(id: number, updates: Partial<TestUser>): boolean {
    const user = this.users.get(id)
    if (!user) return false
    Object.assign(user, updates)
    return true
  }

  deleteUser(id: number): boolean {
    return this.users.delete(id)
  }

  getAllUsers(): TestUser[] {
    return Array.from(this.users.values())
  }

  // ==================== Account 操作 ====================

  createAccount(account: Partial<TestAccount>): TestAccount {
    const id = this.accountIdCounter++
    const newAccount: TestAccount = {
      id,
      userId: account.userId || 1,
      nickname: account.nickname || `公众号${id}`,
      alias: account.alias || null,
      fakeid: account.fakeid || `fakeid${id}`,
      servicetype: account.servicetype || 0,
      signature: account.signature || null,
      roundHeadImg: account.roundHeadImg || null,
      createdAt: account.createdAt || new Date().toISOString(),
      updatedAt: account.updatedAt || new Date().toISOString(),
    }
    this.accounts.set(id, newAccount)
    return newAccount
  }

  getAccount(id: number): TestAccount | undefined {
    return this.accounts.get(id)
  }

  getAccountsByUserId(userId: number): TestAccount[] {
    return Array.from(this.accounts.values()).filter(a => a.userId === userId)
  }

  deleteAccount(id: number): boolean {
    return this.accounts.delete(id)
  }

  // ==================== Article 操作 ====================

  createArticle(article: Partial<TestArticle>): TestArticle {
    const id = this.articleIdCounter++
    const newArticle: TestArticle = {
      id,
      userId: article.userId || 1,
      accountId: article.accountId || 1,
      mid: article.mid || `mid${id}`,
      idx: article.idx || '1',
      sn: article.sn || `sn${id}`,
      title: article.title || `文章标题${id}`,
      author: article.author || null,
      cover: article.cover || null,
      digest: article.digest || null,
      contentUrl: article.contentUrl || `https://mp.weixin.qq.com/s/${id}`,
      sourceUrl: article.sourceUrl || null,
      publishTime: article.publishTime || Date.now(),
      createTime: article.createTime || Date.now(),
      updateTime: article.updateTime || Date.now(),
      isFavorite: article.isFavorite || 0,
      copyright: article.copyright || 0,
      hasVideo: article.hasVideo || 0,
      createdAt: article.createdAt || new Date().toISOString(),
    }
    this.articles.set(id, newArticle)
    return newArticle
  }

  getArticle(id: number): TestArticle | undefined {
    return this.articles.get(id)
  }

  getArticlesByUserId(userId: number, limit = 20, offset = 0): TestArticle[] {
    const articles = Array.from(this.articles.values())
      .filter(a => a.userId === userId)
      .slice(offset, offset + limit)
    return articles
  }

  getArticlesByAccountId(accountId: number): TestArticle[] {
    return Array.from(this.articles.values()).filter(a => a.accountId === accountId)
  }

  // ==================== 通用操作 ====================

  /**
   * 重置数据库
   */
  reset() {
    this.users.clear()
    this.accounts.clear()
    this.articles.clear()
    this.credentials.clear()
    this.htmls.clear()
    this.metadata.clear()
    this.resources.clear()
    this.comments.clear()
    this.preferences.clear()
    this.logs.clear()

    this.userIdCounter = 1
    this.accountIdCounter = 1
    this.articleIdCounter = 1
    this.credentialIdCounter = 1
    this.htmlIdCounter = 1
    this.metadataIdCounter = 1
    this.resourceIdCounter = 1
    this.commentIdCounter = 1
    this.preferenceIdCounter = 1
    this.logIdCounter = 1
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      users: this.users.size,
      accounts: this.accounts.size,
      articles: this.articles.size,
      credentials: this.credentials.size,
      htmls: this.htmls.size,
      metadata: this.metadata.size,
      resources: this.resources.size,
      comments: this.comments.size,
      preferences: this.preferences.size,
      logs: this.logs.size,
    }
  }
}

/**
 * 全局测试数据库实例
 */
export const testDb = new TestDatabase()

/**
 * 创建测试数据库种子数据
 */
export async function seedTestDatabase() {
  // 创建测试用户
  const adminUser = testDb.createUser({
    username: 'admin',
    passwordHash: '$2a$10$example-hash',
    email: 'admin@example.com',
    nickname: 'Admin User',
    role: 'admin',
  })

  const normalUser = testDb.createUser({
    username: 'testuser',
    passwordHash: '$2a$10$example-hash',
    email: 'test@example.com',
    nickname: 'Test User',
    role: 'user',
  })

  // 创建测试账号
  const account1 = testDb.createAccount({
    userId: normalUser.id,
    nickname: '测试公众号1',
    alias: 'test-account-1',
    fakeid: 'fakeid-001',
  })

  const account2 = testDb.createAccount({
    userId: normalUser.id,
    nickname: '测试公众号2',
    alias: 'test-account-2',
    fakeid: 'fakeid-002',
  })

  // 创建测试文章
  for (let i = 1; i <= 5; i++) {
    testDb.createArticle({
      userId: normalUser.id,
      accountId: account1.id,
      title: `测试文章${i}`,
      author: '作者',
      digest: `这是第${i}篇测试文章的摘要`,
    })
  }

  return {
    adminUser,
    normalUser,
    account1,
    account2,
  }
}

/**
 * 清理测试数据库
 */
export function cleanTestDatabase() {
  testDb.reset()
}
