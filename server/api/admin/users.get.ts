import { eq, sql, desc } from 'drizzle-orm'
import { getDb, schema } from '~/server/database'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user || user.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: '无权限' })
  }

  const db = getDb()
  const { page = 1, pageSize = 20 } = getQuery(event) as any
  const offset = (parseInt(page) - 1) * parseInt(pageSize)

  const [items, countResult] = await Promise.all([
    db.select()
      .from(schema.users)
      .orderBy(desc(schema.users.createdAt))
      .limit(parseInt(pageSize))
      .offset(offset),
    db.select({ count: sql<number>`count(*)` })
      .from(schema.users),
  ])

  // Remove password hashes
  const safeItems = items.map(({ passwordHash, ...rest }) => rest)

  return {
    success: true,
    data: {
      items: safeItems,
      total: countResult[0]?.count || 0,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
    },
  }
})
