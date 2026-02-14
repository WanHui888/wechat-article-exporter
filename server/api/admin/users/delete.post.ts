import { getAuthService } from '~/server/services/auth.service'
import { getDb, schema } from '~/server/database'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user || user.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: '无权限' })
  }

  const { userId } = await readBody(event)
  if (!userId) {
    throw createError({ statusCode: 400, statusMessage: '缺少 userId 参数' })
  }

  // Prevent deleting self
  if (userId === user.id) {
    throw createError({ statusCode: 400, statusMessage: '不能删除自己的账号' })
  }

  const authService = getAuthService()
  const targetUser = await authService.getUserById(userId)
  if (!targetUser) {
    throw createError({ statusCode: 404, statusMessage: '用户不存在' })
  }

  // Prevent deleting other admins
  if (targetUser.role === 'admin') {
    throw createError({ statusCode: 400, statusMessage: '不能删除管理员账号' })
  }

  const db = getDb()
  await db.delete(schema.users).where(eq(schema.users.id, userId))

  return { success: true }
})
