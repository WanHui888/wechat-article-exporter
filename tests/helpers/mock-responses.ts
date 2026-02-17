/**
 * Mock HTTP Response 工厂函数
 * 用于创建测试中的各种HTTP响应
 */

/**
 * 创建Mock HTML响应
 */
export function createMockHtmlResponse(html: string, status = 200): Response {
  return new Response(html, {
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  })
}

/**
 * 创建Mock图片响应
 */
export function createMockImageResponse(
  size: number,
  mimeType = 'image/jpeg',
  status = 200,
): Response {
  const buffer = Buffer.alloc(size)
  // 填充一些伪随机数据
  for (let i = 0; i < size; i++) {
    buffer[i] = i % 256
  }

  return new Response(buffer, {
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: {
      'Content-Type': mimeType,
      'Content-Length': String(size),
    },
  })
}

/**
 * 创建Mock错误响应
 */
export function createMockErrorResponse(status: number, message = 'Error'): Response {
  return new Response(message, {
    status,
    statusText: message,
  })
}

/**
 * 创建Mock网络错误
 */
export function createMockNetworkError(message = 'Network error'): Error {
  const error = new Error(message)
  error.name = 'NetworkError'
  return error
}

/**
 * 创建Mock超时错误
 */
export function createMockTimeoutError(): Error {
  const error = new Error('Request timeout')
  error.name = 'TimeoutError'
  return error
}
