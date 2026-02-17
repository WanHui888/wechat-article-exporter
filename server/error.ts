/**
 * 全局错误处理器
 *
 * 捕获所有未处理的错误，统一格式化并返回
 */

import { logger } from '~/server/utils/logger'
import { AppError } from '~/server/utils/errors'

export default defineNitroErrorHandler((error, event) => {
  // 记录错误日志
  logger.error({
    err: error,
    path: event.path,
    method: event.method,
    userId: event.context.user?.userId,
  }, 'Unhandled error')

  // 确定状态码和错误消息
  let statusCode = 500
  let code = 'INTERNAL_ERROR'
  let message = '服务器内部错误'
  let details: any = undefined

  if (error instanceof AppError) {
    statusCode = error.statusCode
    code = error.code || 'APP_ERROR'
    message = error.message
    details = error.details
  } else if (error.statusCode) {
    // H3 Error
    statusCode = error.statusCode
    message = error.statusMessage || error.message
    code = error.data?.code
    details = error.data
  }

  // 生产环境不暴露内部错误详情
  if (statusCode === 500 && process.env.NODE_ENV === 'production') {
    message = '服务器内部错误，请稍后重试'
    details = undefined
  }

  // 设置响应状态码
  setResponseStatus(event, statusCode)

  // 返回统一错误格式
  return {
    success: false,
    error: {
      code,
      message,
      details,
      timestamp: new Date().toISOString(),
      path: event.path,
    },
  }
})
