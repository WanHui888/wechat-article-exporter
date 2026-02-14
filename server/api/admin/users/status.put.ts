import { eq } from 'drizzle-orm'
import { getDb, schema } from '~/server/database'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user || user.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: '无权限' })
  }

  const { userId, status } = await readBody(event)
  if (!userId || !status) {
    throw createError({ statusCode: 400, statusMessage: '缺少参数' })
  }

  const db = getDb()
  await db.update(schema.users)
    .set({ status })
    .where(eq(schema.users.id, userId))

  return { success: true }
})
