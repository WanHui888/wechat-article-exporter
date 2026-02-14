import { eq, sql, desc } from 'drizzle-orm'
import { getDb, schema } from '~/server/database'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user || user.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: '无权限' })
  }

  const db = getDb()
  const tasks = await db.select()
    .from(schema.scheduledTasks)
    .orderBy(desc(schema.scheduledTasks.createdAt))

  return { success: true, data: tasks }
})
