import { getAuthService } from '~/server/services/auth.service'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { username, password } = body || {}

  const authService = getAuthService()
  const result = await authService.login(username, password)

  // Set auth cookie
  setCookie(event, 'auth_token', result.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  })

  return { success: true, data: result }
})
