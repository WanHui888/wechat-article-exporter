import { eq, and, desc, sql } from 'drizzle-orm'
import { getDb, schema } from '~/server/database'

export class LogService {
  private db = getDb()

  async log(userId: number, action: string, data?: {
    targetType?: string
    targetId?: string
    detail?: any
    status?: 'success' | 'failed' | 'pending'
  }) {
    await this.db.insert(schema.operationLogs).values({
      userId,
      action,
      targetType: data?.targetType,
      targetId: data?.targetId,
      detail: data?.detail,
      status: data?.status || 'success',
    })
  }

  async getLogs(userId: number, options?: {
    page?: number
    pageSize?: number
    action?: string
  }) {
    const page = options?.page || 1
    const pageSize = options?.pageSize || 50
    const offset = (page - 1) * pageSize

    let conditions = [eq(schema.operationLogs.userId, userId)]
    if (options?.action) {
      conditions.push(eq(schema.operationLogs.action, options.action))
    }

    const where = and(...conditions)

    const [items, countResult] = await Promise.all([
      this.db.select()
        .from(schema.operationLogs)
        .where(where)
        .orderBy(desc(schema.operationLogs.createdAt))
        .limit(pageSize)
        .offset(offset),
      this.db.select({ count: sql<number>`count(*)` })
        .from(schema.operationLogs)
        .where(where),
    ])

    return {
      items,
      total: countResult[0]?.count || 0,
      page,
      pageSize,
      hasMore: offset + items.length < (countResult[0]?.count || 0),
    }
  }

  async getAllLogs(options?: {
    page?: number
    pageSize?: number
    action?: string
    userId?: number
  }) {
    const page = options?.page || 1
    const pageSize = options?.pageSize || 50
    const offset = (page - 1) * pageSize

    let conditions: any[] = []
    if (options?.action) {
      conditions.push(eq(schema.operationLogs.action, options.action))
    }
    if (options?.userId) {
      conditions.push(eq(schema.operationLogs.userId, options.userId))
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined

    const [items, countResult] = await Promise.all([
      this.db.select()
        .from(schema.operationLogs)
        .where(where)
        .orderBy(desc(schema.operationLogs.createdAt))
        .limit(pageSize)
        .offset(offset),
      this.db.select({ count: sql<number>`count(*)` })
        .from(schema.operationLogs)
        .where(where),
    ])

    return {
      items,
      total: countResult[0]?.count || 0,
      page,
      pageSize,
      hasMore: offset + items.length < (countResult[0]?.count || 0),
    }
  }

  async cleanOldLogs(days: number = 90) {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    await this.db.delete(schema.operationLogs)
      .where(sql`created_at < ${cutoff}`)
  }
}

let _logService: LogService | null = null
export function getLogService(): LogService {
  if (!_logService) _logService = new LogService()
  return _logService
}
