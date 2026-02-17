import { getAuthService } from '~/server/services/auth.service'
import { validateBody } from '~/server/utils/validation'
import { loginSchema } from '~/server/schemas/auth.schema'

export default defineEventHandler(async (event) => {
  const { username, password } = await validateBody(event, loginSchema)

  const authService = getAuthService()
  const result = await authService.login(username, password)

  // Set auth cookie
  setCookie(event, 'auth_token', result.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',  // 更严格的 CSRF 防护
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  })

  return { success: true, data: result }
})
