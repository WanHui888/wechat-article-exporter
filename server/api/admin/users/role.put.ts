import { getDb, schema } from '~/server/database'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user || user.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: '无权限' })
  }

  const { userId, role } = await readBody(event)
  if (!userId || !role) {
    throw createError({ statusCode: 400, statusMessage: '缺少参数' })
  }

  if (!['user', 'admin'].includes(role)) {
    throw createError({ statusCode: 400, statusMessage: '无效的角色' })
  }

  // Prevent changing own role
  if (userId === user.id) {
    throw createError({ statusCode: 400, statusMessage: '不能修改自己的角色' })
  }

  const db = getDb()
  await db.update(schema.users)
    .set({ role })
    .where(eq(schema.users.id, userId))

  return { success: true }
})
