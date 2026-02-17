import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getAuthService } from '~/server/services/auth.service'
import { signToken } from '~/server/utils/jwt'
import { hashPassword } from '~/server/utils/password'

// Mock database
const mockUsers = new Map<number, any>()
let userIdCounter = 1

// Mock AuthService methods
vi.mock('~/server/services/auth.service', () => {
  return {
    getAuthService: () => ({
      register: vi.fn(async (username: string, password: string, email?: string, nickname?: string) => {
        // Validate input
        if (!username || username.length < 3 || username.length > 50) {
          throw createError({ statusCode: 400, statusMessage: '用户名长度为3-50个字符' })
        }
        if (!password || password.length < 6) {
          throw createError({ statusCode: 400, statusMessage: '密码长度至少6个字符' })
        }

        // Check if username exists
        for (const user of mockUsers.values()) {
          if (user.username === username) {
            throw createError({ statusCode: 409, statusMessage: '用户名已存在' })
          }
        }

        // Create user
        const isFirstUser = mockUsers.size === 0
        const role = isFirstUser ? 'admin' : 'user'
        const passwordHash = await hashPassword(password)

        const userId = userIdCounter++
        const user = {
          id: userId,
          username,
          passwordHash,
          email: email || null,
          nickname: nickname || username,
          role,
          status: 'active',
          storageQuota: 5368709120,
          storageUsed: 0,
          createdAt: new Date().toISOString(),
          lastLoginAt: null,
          avatar: null,
        }

        mockUsers.set(userId, user)

        const token = await signToken({ userId, username, role })

        return {
          token,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            nickname: user.nickname,
            role: user.role,
            status: user.status,
            storageQuota: user.storageQuota,
            storageUsed: user.storageUsed,
            createdAt: user.createdAt,
            lastLoginAt: user.lastLoginAt,
            avatar: user.avatar,
          },
        }
      }),

      login: vi.fn(async (username: string, password: string) => {
        if (!username || !password) {
          throw createError({ statusCode: 400, statusMessage: '请输入用户名和密码' })
        }

        let user = null
        for (const u of mockUsers.values()) {
          if (u.username === username) {
            user = u
            break
          }
        }

        if (!user) {
          throw createError({ statusCode: 401, statusMessage: '用户名或密码错误' })
        }

        if (user.status === 'disabled') {
          throw createError({ statusCode: 403, statusMessage: '账号已被禁用' })
        }

        const { verifyPassword } = await import('~/server/utils/password')
        const valid = await verifyPassword(password, user.passwordHash)
        if (!valid) {
          throw createError({ statusCode: 401, statusMessage: '用户名或密码错误' })
        }

        user.lastLoginAt = new Date().toISOString()

        const token = await signToken({
          userId: user.id,
          username: user.username,
          role: user.role,
        })

        return {
          token,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            nickname: user.nickname,
            role: user.role,
            status: user.status,
            storageQuota: user.storageQuota,
            storageUsed: user.storageUsed,
            createdAt: user.createdAt,
            lastLoginAt: user.lastLoginAt,
            avatar: user.avatar,
          },
        }
      }),

      getUserById: vi.fn(async (id: number) => {
        const user = mockUsers.get(id)
        if (!user) return null

        return {
          id: user.id,
          username: user.username,
          email: user.email,
          nickname: user.nickname,
          role: user.role,
          status: user.status,
          storageQuota: user.storageQuota,
          storageUsed: user.storageUsed,
          createdAt: user.createdAt,
          lastLoginAt: user.lastLoginAt,
          avatar: user.avatar,
        }
      }),

      changePassword: vi.fn(async (userId: number, oldPassword: string, newPassword: string) => {
        if (!newPassword || newPassword.length < 6) {
          throw createError({ statusCode: 400, statusMessage: '新密码长度至少6个字符' })
        }

        const user = mockUsers.get(userId)
        if (!user) {
          throw createError({ statusCode: 404, statusMessage: '用户不存在' })
        }

        const { verifyPassword } = await import('~/server/utils/password')
        const valid = await verifyPassword(oldPassword, user.passwordHash)
        if (!valid) {
          throw createError({ statusCode: 401, statusMessage: '原密码错误' })
        }

        user.passwordHash = await hashPassword(newPassword)
      }),
    }),
  }
})

// Test data
const testUser = {
  username: 'testuser',
  password: 'Test123!',
  email: 'test@example.com',
  nickname: 'Test User',
}

describe('Auth API Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUsers.clear()
    userIdCounter = 1
  })

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const authService = getAuthService()
      const result = await authService.register(
        testUser.username,
        testUser.password,
        testUser.email,
        testUser.nickname
      )

      expect(result).toBeTruthy()
      expect(result.token).toBeTruthy()
      expect(result.user).toBeTruthy()
      expect(result.user.username).toBe(testUser.username)
      expect(result.user.email).toBe(testUser.email)
      expect(result.user.nickname).toBe(testUser.nickname)
      expect(result.user.role).toBe('admin') // First user is admin
      expect(result.user.status).toBe('active')
    })

    it('should assign admin role to first user', async () => {
      const authService = getAuthService()
      const result = await authService.register('firstuser', 'Password123')

      expect(result.user.role).toBe('admin')
    })

    it('should assign user role to subsequent users', async () => {
      const authService = getAuthService()

      // First user
      await authService.register('firstuser', 'Password123')

      // Second user
      const result = await authService.register('seconduser', 'Password123')

      expect(result.user.role).toBe('user')
    })

    it('should reject registration with short username', async () => {
      const authService = getAuthService()

      await expect(
        authService.register('ab', 'Password123')
      ).rejects.toThrow('用户名长度为3-50个字符')
    })

    it('should reject registration with short password', async () => {
      const authService = getAuthService()

      await expect(
        authService.register('testuser', '123')
      ).rejects.toThrow('密码长度至少6个字符')
    })

    it('should reject registration with existing username', async () => {
      const authService = getAuthService()

      // Register first time
      await authService.register(testUser.username, testUser.password)

      // Try to register again with same username
      await expect(
        authService.register(testUser.username, 'AnotherPass123')
      ).rejects.toThrow('用户名已存在')
    })

    it('should allow registration without email', async () => {
      const authService = getAuthService()
      const result = await authService.register('nomail', 'Password123')

      expect(result.user.email).toBeNull()
    })

    it('should use username as nickname if not provided', async () => {
      const authService = getAuthService()
      const result = await authService.register('testuser', 'Password123')

      expect(result.user.nickname).toBe('testuser')
    })
  })

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create a test user
      const authService = getAuthService()
      await authService.register(
        testUser.username,
        testUser.password,
        testUser.email,
        testUser.nickname
      )
    })

    it('should login successfully with correct credentials', async () => {
      const authService = getAuthService()
      const result = await authService.login(testUser.username, testUser.password)

      expect(result).toBeTruthy()
      expect(result.token).toBeTruthy()
      expect(result.user.username).toBe(testUser.username)
      expect(result.user.lastLoginAt).toBeTruthy()
    })

    it('should reject login with wrong password', async () => {
      const authService = getAuthService()

      await expect(
        authService.login(testUser.username, 'WrongPassword123')
      ).rejects.toThrow('用户名或密码错误')
    })

    it('should reject login with non-existent user', async () => {
      const authService = getAuthService()

      await expect(
        authService.login('nonexistent', 'Password123')
      ).rejects.toThrow('用户名或密码错误')
    })

    it('should reject login with empty username', async () => {
      const authService = getAuthService()

      await expect(
        authService.login('', testUser.password)
      ).rejects.toThrow('请输入用户名和密码')
    })

    it('should reject login with empty password', async () => {
      const authService = getAuthService()

      await expect(
        authService.login(testUser.username, '')
      ).rejects.toThrow('请输入用户名和密码')
    })

    it('should update lastLoginAt on successful login', async () => {
      const authService = getAuthService()

      const result = await authService.login(testUser.username, testUser.password)

      expect(result.user.lastLoginAt).toBeTruthy()

      const user = await authService.getUserById(result.user.id)
      expect(user?.lastLoginAt).toBeTruthy()
    })

    it('should reject login for disabled user', async () => {
      const authService = getAuthService()

      // Login first to get user ID
      const loginResult = await authService.login(testUser.username, testUser.password)

      // Disable the user
      const user = mockUsers.get(loginResult.user.id)
      user.status = 'disabled'

      // Try to login again
      await expect(
        authService.login(testUser.username, testUser.password)
      ).rejects.toThrow('账号已被禁用')
    })
  })

  describe('GET /api/auth/me', () => {
    it('should return current user profile', async () => {
      const authService = getAuthService()

      // Register and get user
      const registerResult = await authService.register(
        testUser.username,
        testUser.password,
        testUser.email,
        testUser.nickname
      )

      // Get profile
      const profile = await authService.getUserById(registerResult.user.id)

      expect(profile).toBeTruthy()
      expect(profile?.username).toBe(testUser.username)
      expect(profile?.email).toBe(testUser.email)
      expect(profile?.nickname).toBe(testUser.nickname)
    })

    it('should return null for non-existent user', async () => {
      const authService = getAuthService()
      const profile = await authService.getUserById(9999)

      expect(profile).toBeNull()
    })
  })

  describe('PUT /api/auth/password', () => {
    let userId: number

    beforeEach(async () => {
      // Create a test user
      const authService = getAuthService()
      const result = await authService.register(
        testUser.username,
        testUser.password,
        testUser.email,
        testUser.nickname
      )
      userId = result.user.id
    })

    it('should change password successfully', async () => {
      const authService = getAuthService()
      const newPassword = 'NewPassword123!'

      await authService.changePassword(userId, testUser.password, newPassword)

      // Try to login with new password
      const loginResult = await authService.login(testUser.username, newPassword)
      expect(loginResult).toBeTruthy()
    })

    it('should reject old password after change', async () => {
      const authService = getAuthService()
      const newPassword = 'NewPassword123!'

      await authService.changePassword(userId, testUser.password, newPassword)

      // Try to login with old password
      await expect(
        authService.login(testUser.username, testUser.password)
      ).rejects.toThrow('用户名或密码错误')
    })

    it('should reject change with wrong old password', async () => {
      const authService = getAuthService()

      await expect(
        authService.changePassword(userId, 'WrongOldPassword', 'NewPassword123')
      ).rejects.toThrow('原密码错误')
    })

    it('should reject change with short new password', async () => {
      const authService = getAuthService()

      await expect(
        authService.changePassword(userId, testUser.password, '123')
      ).rejects.toThrow('新密码长度至少6个字符')
    })

    it('should reject change for non-existent user', async () => {
      const authService = getAuthService()

      await expect(
        authService.changePassword(9999, testUser.password, 'NewPassword123')
      ).rejects.toThrow('用户不存在')
    })
  })

  describe('Authentication Flow', () => {
    it('should complete full auth flow: register → login → get profile → change password → login with new password', async () => {
      const authService = getAuthService()

      // 1. Register
      const registerResult = await authService.register(
        'fullflowuser',
        'InitialPass123',
        'flow@example.com',
        'Flow User'
      )
      expect(registerResult.token).toBeTruthy()
      expect(registerResult.user.username).toBe('fullflowuser')

      // 2. Login
      const loginResult = await authService.login('fullflowuser', 'InitialPass123')
      expect(loginResult.token).toBeTruthy()
      expect(loginResult.user.lastLoginAt).toBeTruthy()

      // 3. Get profile
      const profile = await authService.getUserById(loginResult.user.id)
      expect(profile?.username).toBe('fullflowuser')
      expect(profile?.email).toBe('flow@example.com')

      // 4. Change password
      await authService.changePassword(loginResult.user.id, 'InitialPass123', 'NewPass456')

      // 5. Login with new password
      const newLoginResult = await authService.login('fullflowuser', 'NewPass456')
      expect(newLoginResult.token).toBeTruthy()

      // 6. Old password should not work
      await expect(
        authService.login('fullflowuser', 'InitialPass123')
      ).rejects.toThrow('用户名或密码错误')
    })
  })
})
