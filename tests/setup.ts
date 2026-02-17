import { afterAll, beforeAll, beforeEach, vi } from 'vitest'
import { config } from 'dotenv'
import { resolve } from 'node:path'

// 加载测试环境变量
config({ path: resolve(process.cwd(), '.env.test') })

// Mock Nuxt auto-imports globally
vi.stubGlobal('useRuntimeConfig', () => ({
  jwtSecret: process.env.JWT_SECRET || 'test-secret-key-for-unit-testing-12345678',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
}))

vi.stubGlobal('getHeader', vi.fn())
vi.stubGlobal('getCookie', vi.fn())
vi.stubGlobal('createError', (error: any) => {
  const err = new Error(error.statusMessage)
  Object.assign(err, error)
  return err
})

// 全局测试设置
beforeAll(async () => {
  console.log('🧪 测试环境初始化...')
  // 这里可以添加全局初始化逻辑
  // 例如：数据库连接、Mock 服务等
})

// 每个测试前的清理
beforeEach(async () => {
  // 这里可以添加每个测试前的准备工作
  // 例如：清空测试数据库表、重置 Mock 状态等
  vi.clearAllMocks()
})

// 全局清理
afterAll(async () => {
  console.log('✅ 测试环境清理完成')
  // 关闭数据库连接、清理临时文件等
})
