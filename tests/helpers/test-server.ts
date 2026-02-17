import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { H3Event } from 'h3'

/**
 * Mock event context for testing
 */
export function createMockEvent(options: {
  method?: string
  url?: string
  body?: any
  headers?: Record<string, string>
  cookies?: Record<string, string>
  user?: any
} = {}): H3Event {
  const event = {
    node: {
      req: {
        method: options.method || 'GET',
        url: options.url || '/',
        headers: options.headers || {},
      },
      res: {
        statusCode: 200,
        statusMessage: 'OK',
        setHeader: vi.fn(),
        end: vi.fn(),
      },
    },
    context: {
      user: options.user,
    },
    _body: options.body,
  } as any

  return event
}

/**
 * Mock database for testing
 */
export class MockDatabase {
  private users: any[] = []
  private idCounter = 1

  reset() {
    this.users = []
    this.idCounter = 1
  }

  async insertUser(user: any) {
    const id = this.idCounter++
    const newUser = {
      id,
      ...user,
      createdAt: new Date(),
      lastLoginAt: null,
      status: 'active',
      storageQuota: 5368709120,
      storageUsed: 0,
    }
    this.users.push(newUser)
    return { insertId: id }
  }

  async selectUser(where: any) {
    let result = this.users

    if (where.id !== undefined) {
      result = result.filter(u => u.id === where.id)
    }
    if (where.username !== undefined) {
      result = result.filter(u => u.username === where.username)
    }
    if (where.email !== undefined) {
      result = result.filter(u => u.email === where.email)
    }

    return result
  }

  async updateUser(id: number, updates: any) {
    const user = this.users.find(u => u.id === id)
    if (user) {
      Object.assign(user, updates)
    }
    return { affectedRows: user ? 1 : 0 }
  }

  async countUsers() {
    return this.users.length
  }

  getAllUsers() {
    return this.users
  }
}

/**
 * Create a mock database instance for tests
 */
export const mockDb = new MockDatabase()

/**
 * Reset all mocks between tests
 */
export function resetMocks() {
  vi.clearAllMocks()
  mockDb.reset()
}
