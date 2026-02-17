/**
 * CSRF Token 管理工具
 *
 * 实现一次性 CSRF Token，保护 POST/PUT/DELETE/PATCH 请求
 */

import { nanoid } from 'nanoid'

interface CsrfTokenEntry {
  token: string
  expiresAt: number
}

// 存储 CSRF Token（生产环境应使用 Redis）
const csrfTokens = new Map<string, CsrfTokenEntry>()

// 定期清理过期 Token
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of csrfTokens) {
    if (entry.expiresAt < now) {
      csrfTokens.delete(key)
    }
  }
}, 60_000) // 每分钟清理一次

/**
 * 生成 CSRF Token
 * @param ttl - Token 有效期（毫秒），默认 1 小时
 * @returns CSRF Token
 */
export function generateCsrfToken(ttl = 3600_000): string {
  const token = nanoid(32)
  csrfTokens.set(token, {
    token,
    expiresAt: Date.now() + ttl,
  })
  return token
}

/**
 * 验证并消费 CSRF Token（一次性使用）
 * @param token - 待验证的 Token
 * @returns 验证是否成功
 */
export function consumeCsrfToken(token: string): boolean {
  const entry = csrfTokens.get(token)

  if (!entry) {
    return false
  }

  // 检查是否过期
  if (entry.expiresAt < Date.now()) {
    csrfTokens.delete(token)
    return false
  }

  // 一次性使用，验证后删除
  csrfTokens.delete(token)
  return true
}

/**
 * 获取当前存储的 Token 数量（用于监控）
 * @returns Token 数��
 */
export function getCsrfTokenCount(): number {
  return csrfTokens.size
}
