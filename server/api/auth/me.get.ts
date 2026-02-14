import { getAuthService } from '~/server/services/auth.service'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: '未登录' })
  }

  const authService = getAuthService()
  const profile = await authService.getUserById(user.userId)

  if (!profile) {
    throw createError({ statusCode: 404, statusMessage: '用户不存在' })
  }

  return { success: true, data: profile }
})
