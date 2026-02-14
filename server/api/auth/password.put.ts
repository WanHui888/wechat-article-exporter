import { getAuthService } from '~/server/services/auth.service'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: '未登录' })
  }

  const body = await readBody(event)
  const { oldPassword, newPassword } = body || {}

  if (!oldPassword || !newPassword) {
    throw createError({ statusCode: 400, statusMessage: '请输入原密码和新密码' })
  }

  const authService = getAuthService()
  await authService.changePassword(user.userId, oldPassword, newPassword)

  return { success: true, message: '密码修改成功' }
})
