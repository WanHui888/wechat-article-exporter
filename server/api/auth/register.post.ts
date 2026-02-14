import { getAuthService } from '~/server/services/auth.service'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { username, password, email, nickname } = body || {}

  const authService = getAuthService()
  const result = await authService.register(username, password, email, nickname)

  // Set auth cookie
  setCookie(event, 'auth_token', result.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })

  return { success: true, data: result }
})
