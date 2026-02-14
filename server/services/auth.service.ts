import { eq, sql } from 'drizzle-orm'
import { getDb, schema } from '~/server/database'
import { hashPassword, verifyPassword } from '~/server/utils/password'
import { signToken } from '~/server/utils/jwt'
import type { User, AuthResponse } from '~/types'

export class AuthService {
  private db = getDb()

  async register(username: string, password: string, email?: string, nickname?: string): Promise<AuthResponse> {
    // Validate input
    if (!username || username.length < 3 || username.length > 50) {
      throw createError({ statusCode: 400, statusMessage: '用户名长度为3-50个字符' })
    }
    if (!password || password.length < 6) {
      throw createError({ statusCode: 400, statusMessage: '密码长度至少6个字符' })
    }
    if (!/^[a-zA-Z0-9_\u4e00-\u9fff]+$/.test(username)) {
      throw createError({ statusCode: 400, statusMessage: '用户名只能包含字母、数字、下划线和中文' })
    }

    // Check if username exists
    const existing = await this.db.select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.username, username))
      .limit(1)

    if (existing.length > 0) {
      throw createError({ statusCode: 409, statusMessage: '用户名已存在' })
    }

    // Check if first user (auto admin)
    const userCount = await this.db.select({ count: sql<number>`count(*)` })
      .from(schema.users)

    const isFirstUser = userCount[0]!.count === 0
    const role = isFirstUser ? 'admin' : 'user'

    // Hash password and create user
    const passwordHash = await hashPassword(password)

    const result = await this.db.insert(schema.users).values({
      username,
      passwordHash,
      email: email || null,
      nickname: nickname || username,
      role: role as 'user' | 'admin',
    })

    const userId = result[0].insertId

    // Generate token
    const token = await signToken({ userId, username, role: role as 'user' | 'admin' })

    const user = await this.getUserById(userId)
    if (!user) throw createError({ statusCode: 500, statusMessage: '创建用户失败' })

    return { token, user }
  }

  async login(username: string, password: string): Promise<AuthResponse> {
    if (!username || !password) {
      throw createError({ statusCode: 400, statusMessage: '请输入用户名和密码' })
    }

    const rows = await this.db.select()
      .from(schema.users)
      .where(eq(schema.users.username, username))
      .limit(1)

    const row = rows[0]
    if (!row) {
      throw createError({ statusCode: 401, statusMessage: '用户名或密码错误' })
    }

    if (row.status === 'disabled') {
      throw createError({ statusCode: 403, statusMessage: '账号已被禁用' })
    }

    const valid = await verifyPassword(password, row.passwordHash)
    if (!valid) {
      throw createError({ statusCode: 401, statusMessage: '用户名或密码错误' })
    }

    // Update last login time
    await this.db.update(schema.users)
      .set({ lastLoginAt: new Date() })
      .where(eq(schema.users.id, row.id))

    const token = await signToken({
      userId: row.id,
      username: row.username,
      role: row.role,
    })

    const user = this.formatUser(row)
    return { token, user }
  }

  async getUserByUsername(username: string): Promise<User | null> {
    const rows = await this.db.select()
      .from(schema.users)
      .where(eq(schema.users.username, username))
      .limit(1)

    const row = rows[0]
    if (!row) return null
    return this.formatUser(row)
  }

  async createUser(username: string, password: string, options?: {
    role?: 'user' | 'admin'
    nickname?: string
    email?: string
    storageQuota?: number
  }): Promise<User> {
    const passwordHash = await hashPassword(password)

    await this.db.insert(schema.users).values({
      username,
      passwordHash,
      email: options?.email || null,
      nickname: options?.nickname || username,
      role: options?.role || 'user',
      storageQuota: options?.storageQuota || 5368709120,
    })

    const user = await this.getUserByUsername(username)
    if (!user) throw createError({ statusCode: 500, statusMessage: '创建用户失败' })
    return user
  }

  async getAllUsers(): Promise<User[]> {
    const rows = await this.db.select()
      .from(schema.users)
      .orderBy(schema.users.createdAt)
    return rows.map(r => this.formatUser(r))
  }

  async setUserStatus(userId: number, status: 'active' | 'disabled'): Promise<void> {
    await this.db.update(schema.users)
      .set({ status })
      .where(eq(schema.users.id, userId))
  }

  async getUserById(id: number): Promise<User | null> {
    const rows = await this.db.select()
      .from(schema.users)
      .where(eq(schema.users.id, id))
      .limit(1)

    const row = rows[0]
    if (!row) return null
    return this.formatUser(row)
  }

  async updateProfile(userId: number, data: { nickname?: string; email?: string; avatar?: string }): Promise<User> {
    const updateData: Record<string, any> = {}
    if (data.nickname !== undefined) updateData.nickname = data.nickname
    if (data.email !== undefined) updateData.email = data.email
    if (data.avatar !== undefined) updateData.avatar = data.avatar

    if (Object.keys(updateData).length > 0) {
      await this.db.update(schema.users)
        .set(updateData)
        .where(eq(schema.users.id, userId))
    }

    const user = await this.getUserById(userId)
    if (!user) throw createError({ statusCode: 404, statusMessage: '用户不存在' })
    return user
  }

  async changePassword(userId: number, oldPassword: string, newPassword: string): Promise<void> {
    if (!newPassword || newPassword.length < 6) {
      throw createError({ statusCode: 400, statusMessage: '新密码长度至少6个字符' })
    }

    const rows = await this.db.select({ passwordHash: schema.users.passwordHash })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1)

    const row = rows[0]
    if (!row) throw createError({ statusCode: 404, statusMessage: '用户不存在' })

    const valid = await verifyPassword(oldPassword, row.passwordHash)
    if (!valid) {
      throw createError({ statusCode: 401, statusMessage: '原密码错误' })
    }

    const passwordHash = await hashPassword(newPassword)
    await this.db.update(schema.users)
      .set({ passwordHash })
      .where(eq(schema.users.id, userId))
  }

  async refreshToken(userId: number): Promise<string> {
    const user = await this.getUserById(userId)
    if (!user) throw createError({ statusCode: 404, statusMessage: '用户不存在' })
    if (user.status === 'disabled') throw createError({ statusCode: 403, statusMessage: '账号已被禁用' })

    return signToken({
      userId: user.id,
      username: user.username,
      role: user.role,
    })
  }

  private formatUser(row: any): User {
    return {
      id: row.id,
      username: row.username,
      email: row.email,
      nickname: row.nickname,
      avatar: row.avatar,
      role: row.role,
      status: row.status,
      storageQuota: row.storageQuota,
      storageUsed: row.storageUsed,
      createdAt: row.createdAt?.toISOString?.() || row.createdAt,
      lastLoginAt: row.lastLoginAt?.toISOString?.() || row.lastLoginAt,
    }
  }
}

let _authService: AuthService | null = null

export function getAuthService(): AuthService {
  if (!_authService) {
    _authService = new AuthService()
  }
  return _authService
}
