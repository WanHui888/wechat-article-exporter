import { eq, and, desc, sql, like, inArray } from 'drizzle-orm'
import { getDb, schema } from '~/server/database'

export class AccountService {
  private db = getDb()

  async getAccounts(userId: number) {
    return this.db.select()
      .from(schema.mpAccounts)
      .where(eq(schema.mpAccounts.userId, userId))
      .orderBy(desc(schema.mpAccounts.createdAt))
  }

  async getAccount(userId: number, fakeid: string) {
    const rows = await this.db.select()
      .from(schema.mpAccounts)
      .where(and(
        eq(schema.mpAccounts.userId, userId),
        eq(schema.mpAccounts.fakeid, fakeid),
      ))
      .limit(1)
    return rows[0] || null
  }

  async upsertAccount(userId: number, data: {
    fakeid: string
    nickname?: string
    alias?: string
    roundHeadImg?: string
    serviceType?: number
    signature?: string
  }) {
    const existing = await this.getAccount(userId, data.fakeid)
    if (existing) {
      await this.db.update(schema.mpAccounts)
        .set({
          nickname: data.nickname,
          alias: data.alias,
          roundHeadImg: data.roundHeadImg,
          serviceType: data.serviceType,
          signature: data.signature,
        })
        .where(and(
          eq(schema.mpAccounts.userId, userId),
          eq(schema.mpAccounts.fakeid, data.fakeid),
        ))
      return this.getAccount(userId, data.fakeid)
    }

    await this.db.insert(schema.mpAccounts).values({
      userId,
      ...data,
    })
    return this.getAccount(userId, data.fakeid)
  }

  async deleteAccount(userId: number, fakeid: string) {
    await this.db.delete(schema.mpAccounts)
      .where(and(
        eq(schema.mpAccounts.userId, userId),
        eq(schema.mpAccounts.fakeid, fakeid),
      ))
  }

  async updateSyncProgress(userId: number, fakeid: string, data: {
    totalCount?: number
    syncedCount?: number
    syncedArticles?: number
    completed?: number
    lastSyncAt?: Date
  }) {
    await this.db.update(schema.mpAccounts)
      .set(data)
      .where(and(
        eq(schema.mpAccounts.userId, userId),
        eq(schema.mpAccounts.fakeid, fakeid),
      ))
  }

  async setAutoSync(userId: number, fakeid: string, autoSync: boolean, interval?: number) {
    const updateData: Record<string, any> = { autoSync: autoSync ? 1 : 0 }
    if (interval !== undefined) updateData.syncInterval = interval

    await this.db.update(schema.mpAccounts)
      .set(updateData)
      .where(and(
        eq(schema.mpAccounts.userId, userId),
        eq(schema.mpAccounts.fakeid, fakeid),
      ))
  }

  async getAutoSyncAccounts() {
    return this.db.select()
      .from(schema.mpAccounts)
      .where(eq(schema.mpAccounts.autoSync, 1))
  }

  async importAccounts(userId: number, accounts: Array<{
    fakeid: string
    nickname?: string
    alias?: string
    roundHeadImg?: string
  }>) {
    const results = []
    for (const account of accounts) {
      const result = await this.upsertAccount(userId, account)
      results.push(result)
    }
    return results
  }
}

let _accountService: AccountService | null = null
export function getAccountService(): AccountService {
  if (!_accountService) _accountService = new AccountService()
  return _accountService
}
