import { eq, and, sql } from 'drizzle-orm'
import { getDb, schema } from '~/server/database'

export class HtmlService {
  private db = getDb()

  async getHtml(userId: number, articleUrl: string) {
    const rows = await this.db.select()
      .from(schema.articleHtml)
      .where(and(
        eq(schema.articleHtml.userId, userId),
        eq(schema.articleHtml.articleUrl, articleUrl),
      ))
      .limit(1)
    return rows[0] || null
  }

  async getHtmlByFakeid(userId: number, fakeid: string) {
    return this.db.select()
      .from(schema.articleHtml)
      .where(and(
        eq(schema.articleHtml.userId, userId),
        eq(schema.articleHtml.fakeid, fakeid),
      ))
  }

  async getDownloadedUrls(userId: number, fakeid: string): Promise<string[]> {
    const rows = await this.db.select({ articleUrl: schema.articleHtml.articleUrl })
      .from(schema.articleHtml)
      .where(and(
        eq(schema.articleHtml.userId, userId),
        eq(schema.articleHtml.fakeid, fakeid),
      ))
    return rows.map(r => r.articleUrl)
  }

  async getDownloadedCount(userId: number, fakeid: string): Promise<number> {
    const result = await this.db.select({ count: sql<number>`count(*)` })
      .from(schema.articleHtml)
      .where(and(
        eq(schema.articleHtml.userId, userId),
        eq(schema.articleHtml.fakeid, fakeid),
      ))
    return result[0]?.count || 0
  }

  async saveHtml(userId: number, data: {
    fakeid: string
    articleUrl: string
    title: string
    commentId?: string
    filePath: string
    fileSize: number
  }) {
    await this.db.insert(schema.articleHtml).values({
      userId,
      ...data,
    }).onDuplicateKeyUpdate({
      set: {
        title: data.title,
        commentId: data.commentId,
        filePath: data.filePath,
        fileSize: data.fileSize,
      },
    })
  }

  async deleteByFakeid(userId: number, fakeid: string) {
    await this.db.delete(schema.articleHtml)
      .where(and(
        eq(schema.articleHtml.userId, userId),
        eq(schema.articleHtml.fakeid, fakeid),
      ))
  }

  async getTotalSize(userId: number): Promise<number> {
    const result = await this.db.select({
      total: sql<number>`COALESCE(SUM(file_size), 0)`,
    })
      .from(schema.articleHtml)
      .where(eq(schema.articleHtml.userId, userId))
    return result[0]?.total || 0
  }
}

let _htmlService: HtmlService | null = null
export function getHtmlService(): HtmlService {
  if (!_htmlService) _htmlService = new HtmlService()
  return _htmlService
}
