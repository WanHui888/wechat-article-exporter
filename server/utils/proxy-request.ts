import { H3Event, parseCookies } from 'h3'
import { getCookieFromStore, getAuthKeyFromRequest } from './CookieStore'
import { cookieStore } from './CookieStore'

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

export interface RequestOptions {
  event: H3Event
  method: 'GET' | 'POST'
  endpoint: string
  query?: Record<string, string | number | undefined>
  body?: Record<string, string | number>
  cookie?: string | null
  action?: 'start_login' | 'login' | 'switch_account'
  parseJson?: boolean
  redirect?: RequestRedirect
}

/**
 * Proxy requests to WeChat MP platform with cookie management
 */
export async function proxyMpRequest(options: RequestOptions) {
  const headers = new Headers({
    Referer: 'https://mp.weixin.qq.com/',
    Origin: 'https://mp.weixin.qq.com',
    'User-Agent': USER_AGENT,
    'Accept-Encoding': 'identity',
  })

  // Use provided cookie or get from CookieStore
  const cookie: string | null = options.cookie || (await getCookieFromStore(options.event))
  if (cookie) {
    headers.set('Cookie', cookie)
  }

  const requestInit: RequestInit = {
    method: options.method,
    headers: headers,
    redirect: options.redirect || 'follow',
  }

  // Handle query parameters
  if (options.query) {
    const filteredQuery: Record<string, string> = {}
    for (const [key, value] of Object.entries(options.query)) {
      if (value !== undefined) {
        filteredQuery[key] = String(value)
      }
    }
    options.endpoint += '?' + new URLSearchParams(filteredQuery).toString()
  }

  // Handle POST body
  if (options.method === 'POST' && options.body) {
    requestInit.body = new URLSearchParams(options.body as Record<string, string>).toString()
    headers.set('Content-Type', 'application/x-www-form-urlencoded')
  }

  const request = new Request(options.endpoint, requestInit)
  const mpResponse = await fetch(request)

  let setCookies: string[] = []

  // Handle login flow: extract uuid cookie for client
  if (options.action === 'start_login') {
    setCookies = mpResponse.headers.getSetCookie().filter(c => c.startsWith('uuid='))
  }
  // Handle successful login: store cookies, return auth-key
  else if (options.action === 'login') {
    try {
      const userId = getUserIdFromEvent(options.event)
      const authKey = crypto.randomUUID().replace(/-/g, '')
      const { redirect_url } = await mpResponse.clone().json()
      const token = new URL(`http://localhost${redirect_url}`).searchParams.get('token')!

      const success = await cookieStore.setCookie(
        authKey,
        token,
        mpResponse.headers.getSetCookie(),
        userId,
      )

      if (success) {
        console.log('[WeChat] Cookie stored successfully for user', userId)
      }

      const expiresDate = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000)
      setCookies = [
        `auth-key=${authKey}; Path=/; Expires=${expiresDate.toUTCString()}; Secure; HttpOnly`,
        `uuid=EXPIRED; Path=/; Expires=${new Date(0).toUTCString()}; Secure; HttpOnly`,
      ]
    } catch (error) {
      console.error('[WeChat] Login cookie processing failed:', error)
    }
  }
  else if (options.action === 'switch_account') {
    const authKey = getAuthKeyFromRequest(options.event)
    if (authKey) {
      setCookies = ['switch_account=1']
    }
  }

  // Build response for client
  const responseHeaders = new Headers(mpResponse.headers)
  responseHeaders.delete('set-cookie')
  setCookies.forEach(sc => {
    responseHeaders.append('set-cookie', sc)
  })

  const finalResponse = new Response(mpResponse.body, {
    status: mpResponse.status,
    statusText: mpResponse.statusText,
    headers: responseHeaders,
  })

  if (!options.parseJson) {
    return finalResponse
  } else {
    return finalResponse.json()
  }
}

/**
 * Extract userId from event context (set by auth middleware)
 */
function getUserIdFromEvent(event: H3Event): number {
  return event.context.user?.userId || 0
}
