import { eq, and } from 'drizzle-orm'
import { getDb, schema } from '~/server/database'

export class CredentialService {
  private db = getDb()

  async getCredentials(userId: number) {
    return this.db.select()
      .from(schema.userCredentials)
      .where(eq(schema.userCredentials.userId, userId))
  }

  async getCredential(userId: number, biz: string) {
    const rows = await this.db.select()
      .from(schema.userCredentials)
      .where(and(
        eq(schema.userCredentials.userId, userId),
        eq(schema.userCredentials.biz, biz),
      ))
      .limit(1)
    return rows[0] || null
  }

  async saveCredential(userId: number, data: {
    biz: string
    uin: string
    key: string
    passTicket: string
    wapSid2?: string
    nickname?: string
    avatar?: string
    timestamp: number
  }) {
    await this.db.insert(schema.userCredentials).values({
      userId,
      ...data,
      valid: 1,
    }).onDuplicateKeyUpdate({
      set: {
        uin: data.uin,
        key: data.key,
        passTicket: data.passTicket,
        wapSid2: data.wapSid2,
        nickname: data.nickname,
        avatar: data.avatar,
        timestamp: data.timestamp,
        valid: 1,
      },
    })
  }

  async invalidateCredential(userId: number, biz: string) {
    await this.db.update(schema.userCredentials)
      .set({ valid: 0 })
      .where(and(
        eq(schema.userCredentials.userId, userId),
        eq(schema.userCredentials.biz, biz),
      ))
  }

  async deleteCredential(userId: number, biz: string) {
    await this.db.delete(schema.userCredentials)
      .where(and(
        eq(schema.userCredentials.userId, userId),
        eq(schema.userCredentials.biz, biz),
      ))
  }
}

let _credentialService: CredentialService | null = null
export function getCredentialService(): CredentialService {
  if (!_credentialService) _credentialService = new CredentialService()
  return _credentialService
}
