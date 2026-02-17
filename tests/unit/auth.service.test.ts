import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AuthService } from '~/server/services/auth.service'
import type { User } from '~/types'

/**
 * AuthService 单元测试
 *
 * 测试覆盖：
 * 1. register - 用户注册（首个用户为管理员、输入验证、重复检查）
 * 2. login - 用户登录（成功、失败、禁用用户、密码错误）
 * 3. getUserByUsername - 根据用户名查询
 * 4. getUserById - 根据ID查询
 * 5. createUser - 创建用户（内部方法）
 * 6. getAllUsers - 获取所有用户
 * 7. setUserStatus - 设置用户状态
 * 8. updateProfile - 更新用户资料
 * 9. changePassword - 修改密码
 * 10. refreshToken - 刷新token
 * 11. 边界情况和错误处理
 */

// ==================== Mock 设置 ====================

// Use vi.hoisted to declare mocks before vi.mock calls
const { mockDb, mockHashPassword, mockVerifyPassword, mockSignToken, mockCreateError } = vi.hoisted(() => {
  return {
    mockDb: {
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    mockHashPassword: vi.fn(),
    mockVerifyPassword: vi.fn(),
    mockSignToken: vi.fn(),
    mockCreateError: vi.fn((options) => {
      const error = new Error(options.statusMessage)
      ;(error as any).statusCode = options.statusCode
      return error
    }),
  }
})

// Mock modules
vi.mock('~/server/database', () => ({
  getDb: () => mockDb,
  schema: {
    users: {
      id: 'id',
      username: 'username',
      passwordHash: 'passwordHash',
      email: 'email',
      nickname: 'nickname',
      role: 'role',
      status: 'status',
      createdAt: 'createdAt',
      lastLoginAt: 'lastLoginAt',
      storageQuota: 'storageQuota',
      storageUsed: 'storageUsed',
      avatar: 'avatar',
    },
  },
}))

vi.mock('~/server/utils/password', () => ({
  hashPassword: mockHashPassword,
  verifyPassword: mockVerifyPassword,
}))

vi.mock('~/server/utils/jwt', () => ({
  signToken: mockSignToken,
}))

// Mock global createError (Nuxt function)
global.createError = mockCreateError as any

// ==================== 测试套件 ====================

describe('AuthService', () => {
  let service: AuthService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new AuthService()

    // Default mock return values
    mockHashPassword.mockResolvedValue('hashed_password_123')
    mockSignToken.mockResolvedValue('jwt_token_abc123')
  })

  // ==================== register() 测试 ====================

  describe('register', () => {
    it('should register first user as admin', async () => {
      const username = 'admin'
      const password = 'password123'

      // Mock: 检查用户名不存在
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      })

      // Mock: 用户数量为0（首个用户）
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockResolvedValue([{ count: 0 }]),
      })

      // Mock: 插入用户
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockResolvedValue([{ insertId: 1 }]),
      })

      // Mock: 获取用户信息
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{
          id: 1,
          username,
          email: null,
          nickname: username,
          avatar: null,
          role: 'admin',
          status: 'active',
          storageQuota: 5368709120,
          storageUsed: 0,
          createdAt: new Date(),
          lastLoginAt: null,
        }]),
      })

      const result = await service.register(username, password)

      expect(result).toBeDefined()
      expect(result.token).toBe('jwt_token_abc123')
      expect(result.user.role).toBe('admin')
      expect(mockHashPassword).toHaveBeenCalledWith(password)
      expect(mockSignToken).toHaveBeenCalledWith({
        userId: 1,
        username,
        role: 'admin',
      })
    })

    it('should register subsequent users as regular user', async () => {
      const username = 'user1'
      const password = 'password123'

      // Mock: 用户名不存在
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      })

      // Mock: 用户数量大于0
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockResolvedValue([{ count: 5 }]),
      })

      // Mock: 插入用户
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockResolvedValue([{ insertId: 2 }]),
      })

      // Mock: 获取用户信息
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{
          id: 2,
          username,
          email: null,
          nickname: username,
          avatar: null,
          role: 'user',
          status: 'active',
          storageQuota: 5368709120,
          storageUsed: 0,
          createdAt: new Date(),
          lastLoginAt: null,
        }]),
      })

      const result = await service.register(username, password)

      expect(result.user.role).toBe('user')
    })

    it('should register with email and nickname', async () => {
      const username = 'testuser'
      const password = 'password123'
      const email = 'test@example.com'
      const nickname = 'Test User'

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      })

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockResolvedValue([{ count: 1 }]),
      })

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockResolvedValue([{ insertId: 3 }]),
      })

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{
          id: 3,
          username,
          email,
          nickname,
          avatar: null,
          role: 'user',
          status: 'active',
          storageQuota: 5368709120,
          storageUsed: 0,
          createdAt: new Date(),
          lastLoginAt: null,
        }]),
      })

      const result = await service.register(username, password, email, nickname)

      expect(result.user.email).toBe(email)
      expect(result.user.nickname).toBe(nickname)
    })

    it('should reject username shorter than 3 characters', async () => {
      await expect(service.register('ab', 'password123')).rejects.toThrow('用户名长度为3-50个字符')
    })

    it('should reject username longer than 50 characters', async () => {
      const longUsername = 'a'.repeat(51)
      await expect(service.register(longUsername, 'password123')).rejects.toThrow('用户名长度为3-50个字符')
    })

    it('should reject password shorter than 6 characters', async () => {
      await expect(service.register('username', '12345')).rejects.toThrow('密码长度至少6个字符')
    })

    it('should reject empty username', async () => {
      await expect(service.register('', 'password123')).rejects.toThrow('用户名长度为3-50个字符')
    })

    it('should reject empty password', async () => {
      await expect(service.register('username', '')).rejects.toThrow('密码长度至少6个字符')
    })

    it('should reject username with invalid characters', async () => {
      await expect(service.register('user@name', 'password123')).rejects.toThrow('用户名只能包含字母、数字、下划线和中文')
      await expect(service.register('user-name', 'password123')).rejects.toThrow('用户名只能包含字母、数字、下划线和中文')
      await expect(service.register('user name', 'password123')).rejects.toThrow('用户名只能包含字母、数字、下划线和中文')
    })

    it('should accept username with letters, numbers, underscore and Chinese', async () => {
      const validUsernames = ['user123', 'user_name', '用户名123', 'User_123_中文']

      for (const username of validUsernames) {
        vi.clearAllMocks()

        mockDb.select.mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([]),
        })

        mockDb.select.mockReturnValueOnce({
          from: vi.fn().mockResolvedValue([{ count: 1 }]),
        })

        mockDb.insert.mockReturnValue({
          values: vi.fn().mockResolvedValue([{ insertId: 1 }]),
        })

        mockDb.select.mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([{
            id: 1,
            username,
            email: null,
            nickname: username,
            avatar: null,
            role: 'user',
            status: 'active',
            storageQuota: 5368709120,
            storageUsed: 0,
            createdAt: new Date(),
            lastLoginAt: null,
          }]),
        })

        await expect(service.register(username, 'password123')).resolves.toBeDefined()
      }
    })

    it('should reject duplicate username', async () => {
      const username = 'existing'

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ id: 1 }]), // 用户名已存在
      })

      await expect(service.register(username, 'password123')).rejects.toThrow('用户名已存在')
    })

    it('should throw error if user creation fails', async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      })

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockResolvedValue([{ count: 0 }]),
      })

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockResolvedValue([{ insertId: 1 }]),
      })

      // Mock getUserById 返回 null
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      })

      await expect(service.register('username', 'password123')).rejects.toThrow('创建用户失败')
    })
  })

  // ==================== login() 测试 ====================

  describe('login', () => {
    it('should login successfully with correct credentials', async () => {
      const username = 'testuser'
      const password = 'password123'
      const passwordHash = 'hashed_password'

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{
          id: 1,
          username,
          passwordHash,
          email: null,
          nickname: username,
          avatar: null,
          role: 'user',
          status: 'active',
          storageQuota: 5368709120,
          storageUsed: 0,
          createdAt: new Date(),
          lastLoginAt: null,
        }]),
      })

      mockVerifyPassword.mockResolvedValue(true)

      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue({}),
      })

      const result = await service.login(username, password)

      expect(result).toBeDefined()
      expect(result.token).toBe('jwt_token_abc123')
      expect(result.user.username).toBe(username)
      expect(mockVerifyPassword).toHaveBeenCalledWith(password, passwordHash)
      expect(mockDb.update).toHaveBeenCalled() // 更新 lastLoginAt
    })

    it('should reject login with empty username', async () => {
      await expect(service.login('', 'password123')).rejects.toThrow('请输入用户名和密码')
    })

    it('should reject login with empty password', async () => {
      await expect(service.login('username', '')).rejects.toThrow('请输入用户名和密码')
    })

    it('should reject login with non-existent username', async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      })

      await expect(service.login('nonexistent', 'password123')).rejects.toThrow('用户名或密码错误')
    })

    it('should reject login for disabled user', async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{
          id: 1,
          username: 'testuser',
          passwordHash: 'hashed_password',
          status: 'disabled',
        }]),
      })

      await expect(service.login('testuser', 'password123')).rejects.toThrow('账号已被禁用')
    })

    it('should reject login with wrong password', async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{
          id: 1,
          username: 'testuser',
          passwordHash: 'hashed_password',
          status: 'active',
        }]),
      })

      mockVerifyPassword.mockResolvedValue(false)

      await expect(service.login('testuser', 'wrongpassword')).rejects.toThrow('用户名或密码错误')
    })
  })

  // ==================== getUserByUsername() 测试 ====================

  describe('getUserByUsername', () => {
    it('should return user when found', async () => {
      const username = 'testuser'

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{
          id: 1,
          username,
          email: 'test@example.com',
          nickname: 'Test User',
          avatar: null,
          role: 'user',
          status: 'active',
          storageQuota: 5368709120,
          storageUsed: 0,
          createdAt: new Date(),
          lastLoginAt: null,
        }]),
      })

      const user = await service.getUserByUsername(username)

      expect(user).toBeDefined()
      expect(user!.username).toBe(username)
      expect(user!.email).toBe('test@example.com')
    })

    it('should return null when user not found', async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      })

      const user = await service.getUserByUsername('nonexistent')

      expect(user).toBeNull()
    })
  })

  // ==================== getUserById() 测试 ====================

  describe('getUserById', () => {
    it('should return user when found', async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{
          id: 1,
          username: 'testuser',
          email: 'test@example.com',
          nickname: 'Test User',
          avatar: null,
          role: 'user',
          status: 'active',
          storageQuota: 5368709120,
          storageUsed: 0,
          createdAt: new Date(),
          lastLoginAt: null,
        }]),
      })

      const user = await service.getUserById(1)

      expect(user).toBeDefined()
      expect(user!.id).toBe(1)
    })

    it('should return null when user not found', async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      })

      const user = await service.getUserById(999)

      expect(user).toBeNull()
    })
  })

  // ==================== createUser() 测试 ====================

  describe('createUser', () => {
    it('should create user with default options', async () => {
      const username = 'newuser'
      const password = 'password123'

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockResolvedValue([{ insertId: 1 }]),
      })

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{
          id: 1,
          username,
          email: null,
          nickname: username,
          avatar: null,
          role: 'user',
          status: 'active',
          storageQuota: 5368709120,
          storageUsed: 0,
          createdAt: new Date(),
          lastLoginAt: null,
        }]),
      })

      const user = await service.createUser(username, password)

      expect(user).toBeDefined()
      expect(user.username).toBe(username)
      expect(user.role).toBe('user')
      expect(user.nickname).toBe(username)
    })

    it('should create user with custom options', async () => {
      const username = 'admin'
      const password = 'password123'
      const options = {
        role: 'admin' as const,
        nickname: 'Admin User',
        email: 'admin@example.com',
        storageQuota: 10737418240,
      }

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockResolvedValue([{ insertId: 1 }]),
      })

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{
          id: 1,
          username,
          email: options.email,
          nickname: options.nickname,
          avatar: null,
          role: options.role,
          status: 'active',
          storageQuota: options.storageQuota,
          storageUsed: 0,
          createdAt: new Date(),
          lastLoginAt: null,
        }]),
      })

      const user = await service.createUser(username, password, options)

      expect(user.role).toBe('admin')
      expect(user.email).toBe(options.email)
      expect(user.nickname).toBe(options.nickname)
    })

    it('should throw error if user creation fails', async () => {
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockResolvedValue([{ insertId: 1 }]),
      })

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      })

      await expect(service.createUser('username', 'password')).rejects.toThrow('创建用户失败')
    })
  })

  // ==================== getAllUsers() 测试 ====================

  describe('getAllUsers', () => {
    it('should return all users', async () => {
      const mockUsers = [
        {
          id: 1,
          username: 'user1',
          email: 'user1@example.com',
          nickname: 'User 1',
          avatar: null,
          role: 'admin',
          status: 'active',
          storageQuota: 5368709120,
          storageUsed: 0,
          createdAt: new Date(),
          lastLoginAt: null,
        },
        {
          id: 2,
          username: 'user2',
          email: 'user2@example.com',
          nickname: 'User 2',
          avatar: null,
          role: 'user',
          status: 'active',
          storageQuota: 5368709120,
          storageUsed: 0,
          createdAt: new Date(),
          lastLoginAt: null,
        },
      ]

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue(mockUsers),
      })

      const users = await service.getAllUsers()

      expect(users).toHaveLength(2)
      expect(users[0].username).toBe('user1')
      expect(users[1].username).toBe('user2')
    })

    it('should return empty array when no users', async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue([]),
      })

      const users = await service.getAllUsers()

      expect(users).toEqual([])
    })
  })

  // ==================== setUserStatus() 测试 ====================

  describe('setUserStatus', () => {
    it('should set user status to active', async () => {
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue({}),
      })

      await service.setUserStatus(1, 'active')

      expect(mockDb.update).toHaveBeenCalled()
    })

    it('should set user status to disabled', async () => {
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue({}),
      })

      await service.setUserStatus(1, 'disabled')

      expect(mockDb.update).toHaveBeenCalled()
    })
  })

  // ==================== updateProfile() 测试 ====================

  describe('updateProfile', () => {
    it('should update user nickname', async () => {
      const userId = 1
      const newNickname = 'New Nickname'

      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue({}),
      })

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{
          id: userId,
          username: 'testuser',
          email: 'test@example.com',
          nickname: newNickname,
          avatar: null,
          role: 'user',
          status: 'active',
          storageQuota: 5368709120,
          storageUsed: 0,
          createdAt: new Date(),
          lastLoginAt: null,
        }]),
      })

      const user = await service.updateProfile(userId, { nickname: newNickname })

      expect(user.nickname).toBe(newNickname)
      expect(mockDb.update).toHaveBeenCalled()
    })

    it('should update user email', async () => {
      const userId = 1
      const newEmail = 'newemail@example.com'

      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue({}),
      })

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{
          id: userId,
          username: 'testuser',
          email: newEmail,
          nickname: 'Test User',
          avatar: null,
          role: 'user',
          status: 'active',
          storageQuota: 5368709120,
          storageUsed: 0,
          createdAt: new Date(),
          lastLoginAt: null,
        }]),
      })

      const user = await service.updateProfile(userId, { email: newEmail })

      expect(user.email).toBe(newEmail)
    })

    it('should update user avatar', async () => {
      const userId = 1
      const newAvatar = 'https://example.com/avatar.jpg'

      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue({}),
      })

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{
          id: userId,
          username: 'testuser',
          email: 'test@example.com',
          nickname: 'Test User',
          avatar: newAvatar,
          role: 'user',
          status: 'active',
          storageQuota: 5368709120,
          storageUsed: 0,
          createdAt: new Date(),
          lastLoginAt: null,
        }]),
      })

      const user = await service.updateProfile(userId, { avatar: newAvatar })

      expect(user.avatar).toBe(newAvatar)
    })

    it('should update multiple fields at once', async () => {
      const userId = 1
      const updates = {
        nickname: 'New Name',
        email: 'new@example.com',
        avatar: 'https://example.com/avatar.jpg',
      }

      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue({}),
      })

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{
          id: userId,
          username: 'testuser',
          ...updates,
          role: 'user',
          status: 'active',
          storageQuota: 5368709120,
          storageUsed: 0,
          createdAt: new Date(),
          lastLoginAt: null,
        }]),
      })

      const user = await service.updateProfile(userId, updates)

      expect(user.nickname).toBe(updates.nickname)
      expect(user.email).toBe(updates.email)
      expect(user.avatar).toBe(updates.avatar)
    })

    it('should not update database when no fields provided', async () => {
      const userId = 1

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{
          id: userId,
          username: 'testuser',
          email: 'test@example.com',
          nickname: 'Test User',
          avatar: null,
          role: 'user',
          status: 'active',
          storageQuota: 5368709120,
          storageUsed: 0,
          createdAt: new Date(),
          lastLoginAt: null,
        }]),
      })

      await service.updateProfile(userId, {})

      expect(mockDb.update).not.toHaveBeenCalled()
    })

    it('should throw error when user not found', async () => {
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue({}),
      })

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      })

      await expect(service.updateProfile(999, { nickname: 'Test' })).rejects.toThrow('用户不存在')
    })
  })

  // ==================== changePassword() 测试 ====================

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const userId = 1
      const oldPassword = 'oldpassword123'
      const newPassword = 'newpassword456'

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{
          passwordHash: 'old_hashed_password',
        }]),
      })

      mockVerifyPassword.mockResolvedValue(true)

      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue({}),
      })

      await service.changePassword(userId, oldPassword, newPassword)

      expect(mockVerifyPassword).toHaveBeenCalledWith(oldPassword, 'old_hashed_password')
      expect(mockHashPassword).toHaveBeenCalledWith(newPassword)
      expect(mockDb.update).toHaveBeenCalled()
    })

    it('should reject new password shorter than 6 characters', async () => {
      await expect(service.changePassword(1, 'oldpass', '12345')).rejects.toThrow('新密码长度至少6个字符')
    })

    it('should reject empty new password', async () => {
      await expect(service.changePassword(1, 'oldpass', '')).rejects.toThrow('新密码长度至少6个字符')
    })

    it('should throw error when user not found', async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      })

      await expect(service.changePassword(999, 'oldpass', 'newpass123')).rejects.toThrow('用户不存在')
    })

    it('should reject wrong old password', async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{
          passwordHash: 'old_hashed_password',
        }]),
      })

      mockVerifyPassword.mockResolvedValue(false)

      await expect(service.changePassword(1, 'wrongoldpass', 'newpass123')).rejects.toThrow('原密码错误')
    })
  })

  // ==================== refreshToken() 测试 ====================

  describe('refreshToken', () => {
    it('should refresh token for active user', async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{
          id: 1,
          username: 'testuser',
          email: 'test@example.com',
          nickname: 'Test User',
          avatar: null,
          role: 'user',
          status: 'active',
          storageQuota: 5368709120,
          storageUsed: 0,
          createdAt: new Date(),
          lastLoginAt: null,
        }]),
      })

      const token = await service.refreshToken(1)

      expect(token).toBe('jwt_token_abc123')
      expect(mockSignToken).toHaveBeenCalledWith({
        userId: 1,
        username: 'testuser',
        role: 'user',
      })
    })

    it('should throw error when user not found', async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      })

      await expect(service.refreshToken(999)).rejects.toThrow('用户不存在')
    })

    it('should throw error when user is disabled', async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{
          id: 1,
          username: 'testuser',
          email: 'test@example.com',
          nickname: 'Test User',
          avatar: null,
          role: 'user',
          status: 'disabled',
          storageQuota: 5368709120,
          storageUsed: 0,
          createdAt: new Date(),
          lastLoginAt: null,
        }]),
      })

      await expect(service.refreshToken(1)).rejects.toThrow('账号已被禁用')
    })
  })

  // ==================== formatUser() 测试 ====================

  describe('formatUser', () => {
    it('should format user correctly with all fields', () => {
      const now = new Date()
      const row = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        nickname: 'Test User',
        avatar: 'https://example.com/avatar.jpg',
        role: 'user',
        status: 'active',
        storageQuota: 5368709120,
        storageUsed: 1024000,
        createdAt: now,
        lastLoginAt: now,
      }

      const user = (service as any).formatUser(row)

      expect(user.id).toBe(1)
      expect(user.username).toBe('testuser')
      expect(user.email).toBe('test@example.com')
      expect(user.nickname).toBe('Test User')
      expect(user.avatar).toBe('https://example.com/avatar.jpg')
      expect(user.role).toBe('user')
      expect(user.status).toBe('active')
      expect(user.storageQuota).toBe(5368709120)
      expect(user.storageUsed).toBe(1024000)
    })

    it('should handle null dates correctly', () => {
      const row = {
        id: 1,
        username: 'testuser',
        email: null,
        nickname: 'Test User',
        avatar: null,
        role: 'user',
        status: 'active',
        storageQuota: 5368709120,
        storageUsed: 0,
        createdAt: null,
        lastLoginAt: null,
      }

      const user = (service as any).formatUser(row)

      expect(user.createdAt).toBeNull()
      expect(user.lastLoginAt).toBeNull()
    })
  })
})
