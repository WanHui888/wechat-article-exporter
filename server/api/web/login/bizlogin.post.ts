import { getCookieFromResponse, getCookiesFromRequest, cookieStore } from '~/server/utils/CookieStore'
import { proxyMpRequest } from '~/server/utils/proxy-request'

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

export default defineEventHandler(async (event) => {
  const cookie = getCookiesFromRequest(event)

  const payload: Record<string, string | number> = {
    userlang: 'zh_CN',
    redirect_url: '',
    cookie_forbidden: 0,
    cookie_cleaned: 0,
    plugin_used: 0,
    login_type: 3,
    token: '',
    lang: 'zh_CN',
    f: 'json',
    ajax: 1,
  }

  const response: Response = await proxyMpRequest({
    event,
    method: 'POST',
    endpoint: 'https://mp.weixin.qq.com/cgi-bin/bizlogin',
    query: { action: 'login' },
    body: payload,
    cookie,
    action: 'login',
  })

  const authKey = getCookieFromResponse('auth-key', response)
  if (!authKey) {
    return { err: '登录失败，请稍后重试' }
  }

  // Get MP account info directly from WeChat using stored cookies
  // (Cannot use internal $fetch because auth middleware requires JWT, not auth-key)
  let nick_name = ''
  let head_img = ''
  try {
    const storedCookie = await cookieStore.getCookie(authKey)
    const storedToken = await cookieStore.getToken(authKey)
    if (storedCookie && storedToken) {
      const url = `https://mp.weixin.qq.com/cgi-bin/home?t=home/index&token=${storedToken}&lang=zh_CN`
      const infoResp = await fetch(url, {
        headers: {
          Cookie: storedCookie,
          'User-Agent': USER_AGENT,
          Referer: 'https://mp.weixin.qq.com/',
        },
      })
      const html = await infoResp.text()

      const nicknameMatch = html.match(/wx\.cgiData\.nick_name\s*?=\s*?"(?<nick_name>[^"]+)"/)
      if (nicknameMatch?.groups?.nick_name) {
        nick_name = nicknameMatch.groups.nick_name
      }

      const headImgMatch = html.match(/wx\.cgiData\.head_img\s*?=\s*?"(?<head_img>[^"]+)"/)
      if (headImgMatch?.groups?.head_img) {
        head_img = headImgMatch.groups.head_img
      }

      // Persist nickname/avatar to wechat_sessions table
      if (nick_name || head_img) {
        await cookieStore.updateSessionInfo(authKey, nick_name, head_img)
      }
    }
  } catch (e) {
    console.warn('[WeChat] Failed to fetch MP account info:', e)
    // Non-fatal: login succeeded, we just don't have the display name
  }

  const body = JSON.stringify({
    nickname: nick_name,
    avatar: head_img,
    expires: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
  })
  const headers = new Headers(response.headers)
  headers.set('Content-Length', new TextEncoder().encode(body).length.toString())
  headers.set('Content-Type', 'application/json')
  return new Response(body, { headers })
})
