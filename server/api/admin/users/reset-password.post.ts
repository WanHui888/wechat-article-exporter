import { getDb, schema } from '~/server/database'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user || user.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: '无权限' })
  }

  const { userId, newPassword } = await readBody(event)
  if (!userId || !newPassword) {
    throw createError({ statusCode: 400, statusMessage: '缺少参数' })
  }

  if (newPassword.length < 6) {
    throw createError({ statusCode: 400, statusMessage: '密码至少6位' })
  }

  const { hashPassword } = await import('~/server/utils/password')

  const db = getDb()
  const passwordHash = await hashPassword(newPassword)
  await db.update(schema.users)
    .set({ passwordHash })
    .where(eq(schema.users.id, userId))

  return { success: true }
})
