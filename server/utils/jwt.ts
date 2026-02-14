import { SignJWT, jwtVerify, type JWTPayload } from 'jose'

export interface TokenPayload extends JWTPayload {
  userId: number
  username: string
  role: 'user' | 'admin'
}

function getSecret() {
  const config = useRuntimeConfig()
  return new TextEncoder().encode(config.jwtSecret)
}

export async function signToken(payload: Omit<TokenPayload, keyof JWTPayload>): Promise<string> {
  const config = useRuntimeConfig()
  const expiresIn = config.jwtExpiresIn || '7d'

  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(getSecret())

  return token
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    return payload as TokenPayload
  } catch {
    return null
  }
}

export function extractToken(event: any): string | null {
  const authHeader = getHeader(event, 'authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7)
  }

  const cookie = getCookie(event, 'auth_token')
  if (cookie) {
    return cookie
  }

  return null
}
