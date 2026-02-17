import { getAuthService } from '~/server/services/auth.service'
import { validateBody } from '~/server/utils/validation'
import { registerSchema } from '~/server/schemas/auth.schema'

export default defineEventHandler(async (event) => {
  const { username, password, email, nickname } = await validateBody(event, registerSchema)

  const authService = getAuthService()
  const result = await authService.register(username, password, email, nickname)

  // Set auth cookie
  setCookie(event, 'auth_token', result.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',  // 与 login 保持一致
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })

  return { success: true, data: result }
})
