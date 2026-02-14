import { extractToken, verifyToken, type TokenPayload } from '~/server/utils/jwt'
import { checkRateLimit } from '~/server/utils/rate-limiter'

declare module 'h3' {
  interface H3EventContext {
    user?: TokenPayload
  }
}

export default defineEventHandler(async (event) => {
  const path = getRequestURL(event).pathname

  // Public routes - no auth required
  if (
    path.startsWith('/api/auth/login') ||
    path.startsWith('/api/auth/register') ||
    path.startsWith('/api/public/') ||
    !path.startsWith('/api/')
  ) {
    return
  }

  // Extract and verify JWT
  const token = extractToken(event)
  if (!token) {
    throw createError({
      statusCode: 401,
      statusMessage: '未登录，请先登录',
    })
  }

  const payload = await verifyToken(token)
  if (!payload) {
    throw createError({
      statusCode: 401,
      statusMessage: '登录已过期，请重新登录',
    })
  }

  // Attach user info to event context
  event.context.user = payload

  // Check if user is disabled
  // Note: For performance, we only check this on sensitive operations
  // The full check is done in the auth service

  // Admin-only routes
  if (path.startsWith('/api/admin/') && payload.role !== 'admin') {
    throw createError({
      statusCode: 403,
      statusMessage: '权限不足',
    })
  }

  // Rate limiting
  const rateLimitKey = `api:${payload.userId}`
  const { allowed, remaining } = checkRateLimit(rateLimitKey, {
    windowMs: 60_000,
    maxRequests: 120,
  })

  setHeader(event, 'X-RateLimit-Remaining', remaining.toString())

  if (!allowed) {
    throw createError({
      statusCode: 429,
      statusMessage: '请求过于频繁，请稍后再试',
    })
  }
})
