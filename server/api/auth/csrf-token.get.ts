/**
 * 获取 CSRF Token
 *
 * 前端在发起修改请求前调用���端点获取 Token
 */

import { generateCsrfToken } from '~/server/utils/csrf'

export default defineEventHandler((event) => {
  const token = generateCsrfToken()

  // 也通过 Cookie 发送（双重验证）
  setCookie(event, 'csrf-token', token, {
    httpOnly: false, // 前端需要读取
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 3600, // 1 小时
    path: '/',
  })

  return {
    success: true,
    data: { token },
  }
})
