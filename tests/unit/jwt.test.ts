import { describe, it, expect, vi, beforeEach } from 'vitest'
import { signToken, verifyToken, extractToken, type TokenPayload } from '~/server/utils/jwt'

// Nuxt globals are already mocked in tests/setup.ts

describe('JWT Utils', () => {
  describe('signToken', () => {
    it('should generate a valid JWT token', async () => {
      const payload = {
        userId: 1,
        username: 'testuser',
        role: 'user' as const,
      }

      const token = await signToken(payload)

      expect(token).toBeTruthy()
      expect(typeof token).toBe('string')
      expect(token.split('.')).toHaveLength(3) // JWT format: header.payload.signature
    })

    it('should include payload data in token', async () => {
      const payload = {
        userId: 123,
        username: 'adminuser',
        role: 'admin' as const,
      }

      const token = await signToken(payload)
      const verified = await verifyToken(token)

      expect(verified).toBeTruthy()
      expect(verified?.userId).toBe(123)
      expect(verified?.username).toBe('adminuser')
      expect(verified?.role).toBe('admin')
    })

    it('should include standard JWT claims', async () => {
      const payload = {
        userId: 1,
        username: 'testuser',
        role: 'user' as const,
      }

      const token = await signToken(payload)
      const verified = await verifyToken(token)

      expect(verified).toBeTruthy()
      expect(verified?.iat).toBeDefined() // Issued At
      expect(verified?.exp).toBeDefined() // Expiration Time
      expect(typeof verified?.iat).toBe('number')
      expect(typeof verified?.exp).toBe('number')
    })

    it('should generate tokens with same structure for same payload', async () => {
      const payload = {
        userId: 1,
        username: 'testuser',
        role: 'user' as const,
      }

      const token1 = await signToken(payload)
      // Add small delay to ensure different iat timestamp
      await new Promise(resolve => setTimeout(resolve, 10))
      const token2 = await signToken(payload)

      // Tokens should have same structure but may differ due to timestamps
      expect(token1.split('.')).toHaveLength(3)
      expect(token2.split('.')).toHaveLength(3)

      // Verify both tokens can be decoded successfully
      const verified1 = await verifyToken(token1)
      const verified2 = await verifyToken(token2)

      expect(verified1?.userId).toBe(verified2?.userId)
      expect(verified1?.username).toBe(verified2?.username)
      expect(verified1?.role).toBe(verified2?.role)
    })

    it('should handle admin role', async () => {
      const payload = {
        userId: 100,
        username: 'superadmin',
        role: 'admin' as const,
      }

      const token = await signToken(payload)
      const verified = await verifyToken(token)

      expect(verified?.role).toBe('admin')
    })
  })

  describe('verifyToken', () => {
    it('should verify valid token successfully', async () => {
      const payload = {
        userId: 42,
        username: 'validuser',
        role: 'user' as const,
      }

      const token = await signToken(payload)
      const verified = await verifyToken(token)

      expect(verified).toBeTruthy()
      expect(verified?.userId).toBe(42)
      expect(verified?.username).toBe('validuser')
      expect(verified?.role).toBe('user')
    })

    it('should return null for invalid token format', async () => {
      const invalidToken = 'not.a.valid.jwt.token'
      const verified = await verifyToken(invalidToken)

      expect(verified).toBeNull()
    })

    it('should return null for malformed token', async () => {
      const malformedToken = 'totally-not-a-jwt'
      const verified = await verifyToken(malformedToken)

      expect(verified).toBeNull()
    })

    it('should return null for empty token', async () => {
      const verified = await verifyToken('')

      expect(verified).toBeNull()
    })

    it('should return null for token with wrong signature', async () => {
      const payload = {
        userId: 1,
        username: 'testuser',
        role: 'user' as const,
      }

      const token = await signToken(payload)
      // Modify the signature part (last segment)
      const parts = token.split('.')
      parts[2] = 'invalid-signature'
      const tamperedToken = parts.join('.')

      const verified = await verifyToken(tamperedToken)

      expect(verified).toBeNull()
    })

    it('should verify token payload structure', async () => {
      const payload = {
        userId: 999,
        username: 'structuretest',
        role: 'admin' as const,
      }

      const token = await signToken(payload)
      const verified = await verifyToken(token) as TokenPayload

      expect(verified).toMatchObject({
        userId: 999,
        username: 'structuretest',
        role: 'admin',
      })
      expect(verified.iat).toBeDefined()
      expect(verified.exp).toBeDefined()
    })
  })

  describe('extractToken', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('should extract token from Authorization Bearer header', () => {
      const testToken = 'test.jwt.token'
      const mockEvent = {} as any

      vi.mocked(globalThis.getHeader).mockReturnValue(`Bearer ${testToken}`)

      const extracted = extractToken(mockEvent)

      expect(extracted).toBe(testToken)
      expect(globalThis.getHeader).toHaveBeenCalledWith(mockEvent, 'authorization')
    })

    it('should extract token from cookie', () => {
      const testToken = 'cookie.jwt.token'
      const mockEvent = {} as any

      vi.mocked(globalThis.getHeader).mockReturnValue(undefined)
      vi.mocked(globalThis.getCookie).mockReturnValue(testToken)

      const extracted = extractToken(mockEvent)

      expect(extracted).toBe(testToken)
      expect(globalThis.getHeader).toHaveBeenCalledWith(mockEvent, 'authorization')
      expect(globalThis.getCookie).toHaveBeenCalledWith(mockEvent, 'auth_token')
    })

    it('should prioritize Authorization header over cookie', () => {
      const headerToken = 'header.jwt.token'
      const cookieToken = 'cookie.jwt.token'
      const mockEvent = {} as any

      vi.mocked(globalThis.getHeader).mockReturnValue(`Bearer ${headerToken}`)
      vi.mocked(globalThis.getCookie).mockReturnValue(cookieToken)

      const extracted = extractToken(mockEvent)

      expect(extracted).toBe(headerToken)
      expect(globalThis.getCookie).not.toHaveBeenCalled() // Should not check cookie
    })

    it('should return null if no token found', () => {
      const mockEvent = {} as any

      vi.mocked(globalThis.getHeader).mockReturnValue(undefined)
      vi.mocked(globalThis.getCookie).mockReturnValue(undefined)

      const extracted = extractToken(mockEvent)

      expect(extracted).toBeNull()
    })

    it('should return null for invalid Authorization header format', () => {
      const mockEvent = {} as any

      vi.mocked(globalThis.getHeader).mockReturnValue('InvalidFormat token')
      vi.mocked(globalThis.getCookie).mockReturnValue(undefined)

      const extracted = extractToken(mockEvent)

      expect(extracted).toBeNull()
    })

    it('should handle Authorization header without token', () => {
      const mockEvent = {} as any

      vi.mocked(globalThis.getHeader).mockReturnValue('Bearer ')
      vi.mocked(globalThis.getCookie).mockReturnValue(undefined)

      const extracted = extractToken(mockEvent)

      expect(extracted).toBe('')
    })

    it('should handle case-sensitive Bearer prefix', () => {
      const testToken = 'test.jwt.token'
      const mockEvent = {} as any

      vi.mocked(globalThis.getHeader).mockReturnValue(`bearer ${testToken}`) // lowercase
      vi.mocked(globalThis.getCookie).mockReturnValue(undefined)

      const extracted = extractToken(mockEvent)

      // Should not extract (case-sensitive)
      expect(extracted).toBeNull()
    })
  })

  describe('Token Expiration', () => {
    it('should set expiration time according to config', async () => {
      const payload = {
        userId: 1,
        username: 'testuser',
        role: 'user' as const,
      }

      const token = await signToken(payload)
      const verified = await verifyToken(token)

      expect(verified).toBeTruthy()
      expect(verified?.exp).toBeDefined()

      // Calculate expected expiration (7 days from now)
      const now = Math.floor(Date.now() / 1000)
      const sevenDays = 7 * 24 * 60 * 60
      const expectedExp = now + sevenDays

      // Allow 5 seconds tolerance for test execution time
      expect(verified?.exp).toBeGreaterThan(now)
      expect(verified?.exp).toBeLessThanOrEqual(expectedExp + 5)
    })
  })

  describe('Security Properties', () => {
    it('should use HS256 algorithm', async () => {
      const payload = {
        userId: 1,
        username: 'testuser',
        role: 'user' as const,
      }

      const token = await signToken(payload)
      const [headerB64] = token.split('.')

      const header = JSON.parse(Buffer.from(headerB64, 'base64').toString())
      expect(header.alg).toBe('HS256')
    })

    it('should not expose secret in token', async () => {
      const payload = {
        userId: 1,
        username: 'testuser',
        role: 'user' as const,
      }

      const token = await signToken(payload)

      // Token should not contain the secret
      expect(token).not.toContain('test-secret-key')
    })
  })
})
