/**
 * CSRF 防护中间件
 *
 * 保护所有 POST/PUT/DELETE/PATCH 请求
 * 豁免公开端点和登录端点
 */

import { consumeCsrfToken } from '~/server/utils/csrf'

export default defineEventHandler((event) => {
  const method = getMethod(event)
  const path = getRequestURL(event).pathname

  // 只保护修改操作
  if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    return
  }

  // 豁免路径（公开端点和登录/注册端点）
  const exemptPaths = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/public/',
    '/api/auth/csrf-token', // CSRF Token 获取端点本身
  ]

  if (exemptPaths.some(p => path.startsWith(p))) {
    return
  }

  // 验证 CSRF Token
  const token = getHeader(event, 'x-csrf-token')

  if (!token || !consumeCsrfToken(token)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'CSRF token 验证失败',
      data: {
        code: 'CSRF_TOKEN_INVALID',
        message: '请求验证失败，请刷新页面后重试',
      },
    })
  }
})
