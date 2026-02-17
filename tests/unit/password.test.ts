import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword } from '~/server/utils/password'

describe('Password Utils', () => {
  describe('hashPassword', () => {
    it('should hash a password successfully', async () => {
      const password = 'TestPassword123!'
      const hash = await hashPassword(password)

      expect(hash).toBeTruthy()
      expect(hash).not.toBe(password)
      expect(hash).toHaveLength(60) // bcrypt hash length
      expect(hash).toMatch(/^\$2[ayb]\$.{56}$/) // bcrypt format
    })

    it('should generate different hashes for same password', async () => {
      const password = 'SamePassword123'
      const hash1 = await hashPassword(password)
      const hash2 = await hashPassword(password)

      expect(hash1).not.toBe(hash2) // Different salts
      expect(hash1).toHaveLength(60)
      expect(hash2).toHaveLength(60)
    })

    it('should handle empty string', async () => {
      const hash = await hashPassword('')
      expect(hash).toBeTruthy()
      expect(hash).toHaveLength(60)
    })

    it('should handle special characters', async () => {
      const password = '!@#$%^&*()_+-=[]{}|;:,.<>?'
      const hash = await hashPassword(password)

      expect(hash).toBeTruthy()
      expect(hash).toHaveLength(60)
    })

    it('should handle unicode characters', async () => {
      const password = '密码测试中文123！@#'
      const hash = await hashPassword(password)

      expect(hash).toBeTruthy()
      expect(hash).toHaveLength(60)
    })
  })

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const password = 'CorrectPassword123!'
      const hash = await hashPassword(password)
      const isValid = await verifyPassword(password, hash)

      expect(isValid).toBe(true)
    })

    it('should reject incorrect password', async () => {
      const password = 'CorrectPassword123!'
      const wrongPassword = 'WrongPassword456!'
      const hash = await hashPassword(password)
      const isValid = await verifyPassword(wrongPassword, hash)

      expect(isValid).toBe(false)
    })

    it('should reject empty password against valid hash', async () => {
      const password = 'ValidPassword123!'
      const hash = await hashPassword(password)
      const isValid = await verifyPassword('', hash)

      expect(isValid).toBe(false)
    })

    it('should be case sensitive', async () => {
      const password = 'CaseSensitive123'
      const hash = await hashPassword(password)
      const isValid = await verifyPassword('casesensitive123', hash)

      expect(isValid).toBe(false)
    })

    it('should handle whitespace differences', async () => {
      const password = 'Password 123'
      const hash = await hashPassword(password)
      const isValidWithSpace = await verifyPassword('Password 123', hash)
      const isValidWithoutSpace = await verifyPassword('Password123', hash)

      expect(isValidWithSpace).toBe(true)
      expect(isValidWithoutSpace).toBe(false)
    })

    it('should handle unicode password verification', async () => {
      const password = '中文密码123！'
      const hash = await hashPassword(password)
      const isValid = await verifyPassword('中文密码123！', hash)
      const isInvalid = await verifyPassword('中文密码123!', hash) // Different exclamation mark

      expect(isValid).toBe(true)
      expect(isInvalid).toBe(false)
    })

    it('should reject invalid hash format', async () => {
      const password = 'TestPassword123'
      const invalidHash = 'not-a-valid-bcrypt-hash'
      const isValid = await verifyPassword(password, invalidHash)

      expect(isValid).toBe(false)
    })
  })

  describe('Security Properties', () => {
    it('should use sufficient hash strength (12 rounds)', async () => {
      const password = 'TestPassword123'
      const hash = await hashPassword(password)

      // bcrypt hash format: $2a$12$... (12 is the cost factor)
      const costFactor = hash.split('$')[2]
      expect(costFactor).toBe('12')
    })

    it('should be slow enough to resist brute force', async () => {
      const password = 'BruteForceTest123'
      const startTime = performance.now()
      await hashPassword(password)
      const endTime = performance.now()

      const hashTime = endTime - startTime
      // Should take at least 50ms (bcrypt with 12 rounds)
      expect(hashTime).toBeGreaterThan(50)
    })
  })
})
