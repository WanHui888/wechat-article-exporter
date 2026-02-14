import { eq } from 'drizzle-orm'
import { getDb, schema } from '~/server/database'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user || user.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: '无权限' })
  }

  const { taskId, enabled } = await readBody(event)
  const db = getDb()

  await db.update(schema.scheduledTasks)
    .set({ enabled: enabled ? 1 : 0 })
    .where(eq(schema.scheduledTasks.id, taskId))

  return { success: true }
})
