import { getAuthService } from '~/server/services/auth.service'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: '未登录' })
  }

  const body = await readBody(event)
  const { nickname, email, avatar } = body || {}

  const authService = getAuthService()
  const profile = await authService.updateProfile(user.userId, { nickname, email, avatar })

  return { success: true, data: profile }
})
