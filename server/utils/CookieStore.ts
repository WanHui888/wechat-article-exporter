import { H3Event, parseCookies } from 'h3'
import { eq, and } from 'drizzle-orm'
import { getDb, schema } from '~/server/database'

export type CookieEntity = Record<string, string | number>

export class AccountCookie {
  private readonly _token: string
  private _cookie: CookieEntity[]

  constructor(token: string, cookies: string[]) {
    this._token = token
    this._cookie = AccountCookie.parse(cookies)
  }

  static create(token: string, cookies: CookieEntity[]): AccountCookie {
    const value = new AccountCookie(token, [])
    value._cookie = cookies
    return value
  }

  public toString(): string {
    return this.stringify(this._cookie)
  }

  public toJSON() {
    return {
      token: this._token,
      cookies: this._cookie,
    }
  }

  public get(name: string): CookieEntity | undefined {
    return this._cookie.find(cookie => cookie.name === name)
  }

  public get token() {
    return this._token
  }

  public static parse(cookies: string[]): CookieEntity[] {
    const cookieMap = new Map<string, CookieEntity>()

    for (const cookie of cookies) {
      const cookieObj: CookieEntity = {}
      const parts = cookie.split(';').map(str => str.trim())

      const [nameValue] = parts
      if (nameValue) {
        const [name, ...valueParts] = nameValue.split('=')
        const cookieName = name!.trim()
        cookieObj.name = cookieName
        cookieObj.value = valueParts.join('=').trim()

        for (const part of parts.slice(1)) {
          const [key, ...vParts] = part.split('=')
          const value = vParts.join('=').trim()
          if (key) {
            const keyLower = key.toLowerCase()
            cookieObj[keyLower] = value || 'true'

            if (keyLower === 'expires' && value) {
              try {
                const timestamp = Date.parse(value)
                if (!isNaN(timestamp)) {
                  cookieObj.expires_timestamp = timestamp
                }
              } catch {
                // ignore
              }
            }
          }
        }

        if (cookieObj.name) {
          cookieMap.set(cookieName, cookieObj)
        }
      }
    }

    return Array.from(cookieMap.values())
  }

  private stringify(parsedCookie: CookieEntity[]): string {
    return parsedCookie
      .filter(cookie => cookie.value && cookie.value !== 'EXPIRED')
      .map(cookie => `${cookie.name}=${cookie.value}`)
      .join('; ')
  }
}

// CookieStore backed by MySQL (wechat_sessions table)
class CookieStore {
  // In-memory cache: key=authKey, value=AccountCookie
  private store = new Map<string, AccountCookie>()

  async getAccountCookie(authKey: string): Promise<AccountCookie | null> {
    // Check memory cache first
    let cached = this.store.get(authKey)
    if (cached) return cached

    // Check MySQL
    try {
      const db = getDb()
      const rows = await db.select()
        .from(schema.wechatSessions)
        .where(eq(schema.wechatSessions.authKey, authKey))
        .limit(1)

      const row = rows[0]
      if (!row) return null

      // Check if expired
      if (new Date(row.expiresAt) < new Date()) {
        await db.delete(schema.wechatSessions)
          .where(eq(schema.wechatSessions.authKey, authKey))
        return null
      }

      const cookies = row.cookies as CookieEntity[]
      cached = AccountCookie.create(row.token, cookies)
      this.store.set(authKey, cached)
      return cached
    } catch {
      return null
    }
  }

  async getCookie(authKey: string): Promise<string | null> {
    const accountCookie = await this.getAccountCookie(authKey)
    if (!accountCookie) return null
    return accountCookie.toString()
  }

  async setCookie(authKey: string, token: string, cookie: string[], userId: number): Promise<boolean> {
    const accountCookie = new AccountCookie(token, cookie)
    this.store.set(authKey, accountCookie)

    try {
      const db = getDb()
      const expiresAt = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000) // 4 days

      await db.insert(schema.wechatSessions).values({
        userId,
        authKey,
        token,
        cookies: accountCookie.toJSON().cookies,
        expiresAt,
      }).onDuplicateKeyUpdate({
        set: {
          token,
          cookies: accountCookie.toJSON().cookies,
          expiresAt,
        },
      })

      return true
    } catch (e) {
      console.error('Failed to save wechat session:', e)
      return false
    }
  }

  async getToken(authKey: string): Promise<string | null> {
    const accountCookie = await this.getAccountCookie(authKey)
    if (!accountCookie) return null
    return accountCookie.token
  }

  async updateSessionInfo(authKey: string, mpNickname: string, mpAvatar: string): Promise<void> {
    try {
      const db = getDb()
      await db.update(schema.wechatSessions)
        .set({ mpNickname, mpAvatar })
        .where(eq(schema.wechatSessions.authKey, authKey))
    } catch {
      // ignore
    }
  }

  async getUserIdByAuthKey(authKey: string): Promise<number | null> {
    try {
      const db = getDb()
      const rows = await db.select({ userId: schema.wechatSessions.userId })
        .from(schema.wechatSessions)
        .where(eq(schema.wechatSessions.authKey, authKey))
        .limit(1)
      return rows[0]?.userId ?? null
    } catch {
      return null
    }
  }

  invalidateCache(authKey: string) {
    this.store.delete(authKey)
  }
}

export const cookieStore = new CookieStore()

/**
 * Get auth-key from request headers or cookies
 */
export function getAuthKeyFromRequest(event: H3Event): string | undefined {
  let authKey = getRequestHeader(event, 'X-Auth-Key')
  if (!authKey) {
    const cookies = parseCookies(event)
    authKey = cookies['auth-key']
  }
  return authKey
}

/**
 * Get cookie string from CookieStore using auth-key
 */
export async function getCookieFromStore(event: H3Event): Promise<string | null> {
  const authKey = getAuthKeyFromRequest(event)
  if (!authKey) return null

  return cookieStore.getCookie(authKey)
}

/**
 * Get token from CookieStore using auth-key
 */
export async function getTokenFromStore(event: H3Event): Promise<string | null> {
  const authKey = getAuthKeyFromRequest(event)
  if (!authKey) return null

  return cookieStore.getToken(authKey)
}

/**
 * Get cookies from request as string (for login flow)
 */
export function getCookiesFromRequest(event: H3Event): string {
  const cookies = parseCookies(event)
  return Object.keys(cookies)
    .map(key => `${key}=${encodeURIComponent(cookies[key]!)}`)
    .join(';')
}

/**
 * Extract specific cookie value from response
 */
export function getCookieFromResponse(name: string, response: Response): string | null {
  const cookies = AccountCookie.parse(response.headers.getSetCookie())
  const targetCookie = cookies.find(cookie => cookie.name === name)
  if (targetCookie) {
    return targetCookie.value as string
  }
  return null
}
