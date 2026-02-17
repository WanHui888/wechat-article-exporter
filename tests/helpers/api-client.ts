/**
 * API 集成测试客户端
 * 用于在测试中发送 HTTP 请求到 Nuxt API 端点
 */

import type { H3Event } from 'h3'

export interface ApiResponse<T = any> {
  status: number
  statusText: string
  data?: T
  error?: {
    statusCode: number
    statusMessage: string
    message?: string
  }
  headers: Record<string, string>
}

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  body?: any
  headers?: Record<string, string>
  query?: Record<string, any>
  token?: string
}

/**
 * API 测试客户端类
 */
export class ApiTestClient {
  private baseUrl: string
  private defaultHeaders: Record<string, string>
  private token?: string

  constructor(baseUrl = 'http://localhost:3000', defaultHeaders = {}) {
    this.baseUrl = baseUrl
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...defaultHeaders,
    }
  }

  /**
   * 设置认证 token
   */
  setAuth(token: string) {
    this.token = token
    return this
  }

  /**
   * 清除认证 token
   */
  clearAuth() {
    this.token = undefined
    return this
  }

  /**
   * 发送 HTTP 请求
   */
  async request<T = any>(
    path: string,
    options: ApiRequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const {
      method = 'GET',
      body,
      headers = {},
      query = {},
      token = this.token,
    } = options

    // 构建 URL
    let url = `${this.baseUrl}${path}`
    const queryString = new URLSearchParams(query).toString()
    if (queryString) {
      url += `?${queryString}`
    }

    // 合并 headers
    const requestHeaders = {
      ...this.defaultHeaders,
      ...headers,
    }

    // 添加认证 header
    if (token) {
      requestHeaders.Authorization = `Bearer ${token}`
    }

    // 发送请求
    try {
      const response = await fetch(url, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
      })

      // 解析响应
      const responseHeaders: Record<string, string> = {}
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value
      })

      let data: any
      const contentType = response.headers.get('content-type')
      if (contentType?.includes('application/json')) {
        data = await response.json()
      } else {
        data = await response.text()
      }

      // 如果是错误响应
      if (!response.ok) {
        return {
          status: response.status,
          statusText: response.statusText,
          error: data,
          headers: responseHeaders,
        }
      }

      return {
        status: response.status,
        statusText: response.statusText,
        data,
        headers: responseHeaders,
      }
    }
    catch (error: any) {
      throw new Error(`API request failed: ${error.message}`)
    }
  }

  /**
   * GET 请求
   */
  async get<T = any>(path: string, options: Omit<ApiRequestOptions, 'method' | 'body'> = {}): Promise<ApiResponse<T>> {
    return this.request<T>(path, { ...options, method: 'GET' })
  }

  /**
   * POST 请求
   */
  async post<T = any>(path: string, body?: any, options: Omit<ApiRequestOptions, 'method' | 'body'> = {}): Promise<ApiResponse<T>> {
    return this.request<T>(path, { ...options, method: 'POST', body })
  }

  /**
   * PUT 请求
   */
  async put<T = any>(path: string, body?: any, options: Omit<ApiRequestOptions, 'method' | 'body'> = {}): Promise<ApiResponse<T>> {
    return this.request<T>(path, { ...options, method: 'PUT', body })
  }

  /**
   * DELETE 请求
   */
  async delete<T = any>(path: string, options: Omit<ApiRequestOptions, 'method'> = {}): Promise<ApiResponse<T>> {
    return this.request<T>(path, { ...options, method: 'DELETE' })
  }

  /**
   * PATCH 请求
   */
  async patch<T = any>(path: string, body?: any, options: Omit<ApiRequestOptions, 'method' | 'body'> = {}): Promise<ApiResponse<T>> {
    return this.request<T>(path, { ...options, method: 'PATCH', body })
  }
}

/**
 * 创建 API 测试客户端
 */
export function createApiClient(baseUrl?: string, defaultHeaders?: Record<string, string>): ApiTestClient {
  return new ApiTestClient(baseUrl, defaultHeaders)
}

/**
 * Mock API 客户端（用于单元测试，不发送真实 HTTP 请求）
 */
export class MockApiClient {
  private responses: Map<string, ApiResponse> = new Map()
  private token?: string

  /**
   * 设置 mock 响应
   */
  mockResponse(path: string, response: ApiResponse) {
    this.responses.set(path, response)
    return this
  }

  /**
   * 设置认证 token
   */
  setAuth(token: string) {
    this.token = token
    return this
  }

  /**
   * 清除认证 token
   */
  clearAuth() {
    this.token = undefined
    return this
  }

  /**
   * 模拟请求
   */
  async request<T = any>(path: string, options: ApiRequestOptions = {}): Promise<ApiResponse<T>> {
    const response = this.responses.get(path)
    if (!response) {
      return {
        status: 404,
        statusText: 'Not Found',
        error: {
          statusCode: 404,
          statusMessage: 'Mock response not found',
        },
        headers: {},
      }
    }
    return response as ApiResponse<T>
  }

  async get<T = any>(path: string): Promise<ApiResponse<T>> {
    return this.request<T>(path, { method: 'GET' })
  }

  async post<T = any>(path: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(path, { method: 'POST', body })
  }

  async put<T = any>(path: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(path, { method: 'PUT', body })
  }

  async delete<T = any>(path: string): Promise<ApiResponse<T>> {
    return this.request<T>(path, { method: 'DELETE' })
  }

  /**
   * 重置所有 mock 响应
   */
  reset() {
    this.responses.clear()
    this.token = undefined
  }
}
