/**
 * 请求日志中间件
 *
 * 记录所有HTTP请求的详细信息，用于审计和调试
 */

import { logger } from '~/server/utils/logger'

/**
 * 日志配置
 */
export interface RequestLoggerOptions {
  /** 是否记录请求体 */
  logBody?: boolean
  /** 是否记录响应体 */
  logResponse?: boolean
  /** 排除的路径（正则表达式） */
  excludePaths?: RegExp[]
  /** 慢请求阈值（毫秒） */
  slowRequestThreshold?: number
}

/**
 * 默认配置
 */
const DEFAULT_OPTIONS: Required<RequestLoggerOptions> = {
  logBody: false,
  logResponse: false,
  excludePaths: [
    /^\/api\/health$/,  // 健康检查
    /^\/api\/docs/,      // API 文档
    /^\/_nuxt\//,        // Nuxt 资源
    /^\/favicon\.ico$/,  // Favicon
  ],
  slowRequestThreshold: 1000, // 1秒
}

/**
 * 创建请求日志中间件
 */
export default defineEventHandler((event) => {
  const options = { ...DEFAULT_OPTIONS }
  const startTime = Date.now()

  // 检查是否应该跳过日志
  const path = event.path
  if (options.excludePaths.some(pattern => pattern.test(path))) {
    return
  }

  // 生成请求ID并存储到上下文
  const requestId = generateRequestId()
  event.context.requestId = requestId

  // 记录请求开始
  const requestLog: any = {
    requestId,
    method: event.method,
    path: event.path,
    query: getQuery(event),
    headers: {
      'user-agent': getHeader(event, 'user-agent'),
      'referer': getHeader(event, 'referer'),
      'x-forwarded-for': getHeader(event, 'x-forwarded-for'),
    },
    ip: getRequestIP(event),
    userId: event.context.user?.userId,
  }

  logger.info(requestLog, 'HTTP Request')

  // 注册响应钩子
  event.node.res.on('finish', () => {
    const duration = Date.now() - startTime

    // 记录响应
    const responseLog: any = {
      requestId,
      method: event.method,
      path: event.path,
      statusCode: event.node.res.statusCode,
      duration,
      userId: event.context.user?.userId,
    }

    // 标记慢请求
    if (duration > options.slowRequestThreshold) {
      logger.warn(responseLog, 'Slow HTTP Request')
    } else {
      logger.info(responseLog, 'HTTP Response')
    }
  })
})

/**
 * 生成请求ID
 */
function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * 清理请求体中的敏感信息
 */
function sanitizeBody(body: any): any {
  if (!body || typeof body !== 'object') {
    return body
  }

  const sanitized = { ...body }
  const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'accessToken']

  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '***REDACTED***'
    }
  }

  return sanitized
}

/**
 * 清理响应中的敏感信息
 */
function sanitizeResponse(response: any): any {
  if (!response || typeof response !== 'object') {
    return response
  }

  const sanitized = { ...response }
  const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'accessToken']

  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '***REDACTED***'
    }
  }

  return sanitized
}
